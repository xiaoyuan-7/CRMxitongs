#!/bin/bash
# CRM 系统一键部署脚本 - 本地化部署
# 适用系统：Ubuntu 22.04 LTS

set -e

echo "=========================================="
echo "  CRM 系统本地化部署脚本"
echo "  版本：v1.0"
echo "  日期：2026-03-28"
echo "=========================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否以 root 运行
if [ "$EUID" -ne 0 ]; then
    log_error "请以 root 用户运行此脚本 (sudo $0)"
    exit 1
fi

# 检查系统
if [ ! -f /etc/os-release ]; then
    log_error "无法识别操作系统"
    exit 1
fi

source /etc/os-release
if [ "$ID" != "ubuntu" ]; then
    log_warn "推荐 Ubuntu 22.04 LTS，当前系统：$PRETTY_NAME"
fi

echo ""
log_info "步骤 1/8: 更新系统软件包..."
apt-get update
apt-get upgrade -y

echo ""
log_info "步骤 2/8: 安装基础依赖..."
apt-get install -y \
    curl \
    git \
    wget \
    sqlite3 \
    rsync \
    mailutils \
    cron

echo ""
log_info "步骤 3/8: 安装 Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
else
    log_warn "Docker 已安装，跳过"
fi

echo ""
log_info "步骤 4/8: 安装 Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    apt-get install -y docker-compose
else
    log_warn "Docker Compose 已安装，跳过"
fi

echo ""
log_info "步骤 5/8: 配置 CRM 系统目录..."
CRM_DIR="/opt/crm"
mkdir -p $CRM_DIR/{backend,frontend,data,logs,scripts,backups/daily,backups/weekly,backups/monthly}

# 复制现有 CRM 系统
if [ -d "/root/.openclaw/workspace/crm-system" ]; then
    log_info "检测到现有 CRM 系统，正在复制..."
    cp -r /root/.openclaw/workspace/crm-system/backend/* $CRM_DIR/backend/
    cp -r /root/.openclaw/workspace/crm-system/frontend-simple/* $CRM_DIR/frontend/
    
    # 复制数据库（如果存在）
    if [ -f "/root/.openclaw/workspace/crm-system/backend/data/crm.db" ]; then
        cp /root/.openclaw/workspace/crm-system/backend/data/crm.db $CRM_DIR/data/
        log_info "数据库已迁移"
    fi
fi

echo ""
log_info "步骤 6/8: 创建 Docker 配置文件..."

# 创建 docker-compose.yml
cat > $CRM_DIR/docker-compose.yml << 'EOF'
version: '3.8'

services:
  crm-backend:
    build: ./backend
    container_name: crm-backend
    restart: always
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
      - ./backups:/backups
    environment:
      - NODE_ENV=production
      - DB_PATH=/app/data/crm.db
      - JWT_SECRET=your-secret-key-change-me
      - PORT=3000
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - crm-network

  crm-frontend:
    image: nginx:alpine
    container_name: crm-frontend
    restart: always
    ports:
      - "80:80"
    volumes:
      - ./frontend:/usr/share/nginx/html
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - crm-backend
    networks:
      - crm-network

networks:
  crm-network:
    driver: bridge
EOF

# 创建 nginx.conf
cat > $CRM_DIR/nginx.conf << 'EOF'
server {
    listen 80;
    server_name _;
    
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://crm-backend:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# 创建 Dockerfile (backend)
cat > $CRM_DIR/backend/Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
EOF

echo ""
log_info "步骤 7/8: 配置自动化脚本..."

# 创建备份脚本
cat > $CRM_DIR/scripts/backup-crm.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/crm/backups/daily"
DATE=$(date +%Y%m%d_%H%M%S)
DB_PATH="/opt/crm/data/crm.db"

# 本地备份
cp $DB_PATH $BACKUP_DIR/crm_$DATE.db

# 清理 7 天前的备份
find $BACKUP_DIR -name "crm_*.db" -mtime +7 -delete

echo "[$(date)] 备份完成：crm_$DATE.db" >> /var/log/crm-backup.log
EOF
chmod +x $CRM_DIR/scripts/backup-crm.sh

# 创建监控脚本
cat > $CRM_DIR/scripts/monitor-crm.sh << 'EOF'
#!/bin/bash
# 检查后端服务
if ! curl -sf http://localhost:3000/health > /dev/null; then
    echo "[$(date)] 警告：CRM 后端服务异常" >> /var/log/crm-monitor.log
    cd /opt/crm && docker-compose restart crm-backend
fi

# 检查磁盘空间
DISK_USAGE=$(df /opt/crm | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 85 ]; then
    echo "[$(date)] 警告：磁盘使用率 ${DISK_USAGE}%" >> /var/log/crm-monitor.log
fi
EOF
chmod +x $CRM_DIR/scripts/monitor-crm.sh

echo ""
log_info "步骤 8/8: 配置定时任务..."

# 添加到 crontab
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/crm/scripts/backup-crm.sh") | crontab -
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/crm/scripts/monitor-crm.sh") | crontab -

echo ""
log_info "部署完成！正在启动服务..."

cd $CRM_DIR
docker-compose up -d

echo ""
echo "=========================================="
echo -e "${GREEN}  部署成功！${NC}"
echo "=========================================="
echo ""
echo "访问地址："
echo "  本地：http://localhost"
echo "  局域网：http://$(hostname -I | awk '{print $1}')"
echo ""
echo "管理命令："
echo "  查看状态：cd /opt/crm && docker-compose ps"
echo "  查看日志：cd /opt/crm && docker-compose logs -f"
echo "  重启服务：cd /opt/crm && docker-compose restart"
echo "  停止服务：cd /opt/crm && docker-compose down"
echo ""
echo "下一步配置："
echo "  1. 安装 Tailscale 实现远程访问："
echo "     curl -fsSL https://tailscale.com/install.sh | sh"
echo "     sudo tailscale up"
echo ""
echo "  2. 修改 JWT 密钥（重要！）："
echo "     vi /opt/crm/docker-compose.yml"
echo "     将 your-secret-key-change-me 改为随机字符串"
echo ""
echo "=========================================="
