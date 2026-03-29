#!/bin/bash
# CRM 系统 - 本地化部署一键安装脚本
# 适用系统：Ubuntu 20.04+ / Debian 10+ / CentOS 7+

set -e

echo "=========================================="
echo "  CRM 系统 - 本地化部署安装脚本"
echo "  版本：v2.0 (增强版)"
echo "  日期：2026-03-28"
echo "=========================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

# 检查是否以 root 运行
if [ "$EUID" -ne 0 ]; then
  log_error "请以 root 用户运行此脚本 (sudo $0)"
  exit 1
fi

# 检测操作系统
detect_os() {
  if [ -f /etc/os-release ]; then
    source /etc/os-release
    OS=$ID
    VERSION=$VERSION_ID
    log_info "检测到操作系统：$PRETTY_NAME"
  else
    log_error "无法识别操作系统"
    exit 1
  fi
}

# 安装依赖
install_dependencies() {
  log_step "步骤 1/6: 安装系统依赖..."
  
  case $OS in
    ubuntu|debian)
      apt-get update
      apt-get install -y curl git sqlite3 cron wget
      ;;
    centos|rhel|fedora)
      yum install -y curl git sqlite cron wget
      ;;
    *)
      log_warn "未知操作系统，尝试通用安装..."
      ;;
  esac
  
  log_info "✅ 系统依赖安装完成"
}

# 安装 Node.js
install_nodejs() {
  log_step "步骤 2/6: 安装 Node.js..."
  
  if ! command -v node &> /dev/null; then
    # 使用 NodeSource 安装 Node.js 18 LTS
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
    log_info "✅ Node.js 已安装：$(node -v)"
  else
    log_info "✅ Node.js 已安装：$(node -v)"
  fi
  
  if ! command -v npm &> /dev/null; then
    log_error "npm 未安装"
    exit 1
  else
    log_info "✅ npm 已安装：$(npm -v)"
  fi
}

# 安装 PM2（进程管理器）
install_pm2() {
  log_step "步骤 3/6: 安装 PM2 进程管理器..."
  
  if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
    log_info "✅ PM2 已安装：$(pm2 -v)"
  else
    log_info "✅ PM2 已安装：$(pm2 -v)"
  fi
  
  # 配置 PM2 开机自启
  pm2 startup systemd -u root --hp /root > /dev/null 2>&1 || true
  log_info "✅ PM2 开机自启已配置"
}

# 部署 CRM 系统
deploy_crm() {
  log_step "步骤 4/6: 部署 CRM 系统..."
  
  CRM_DIR="/root/.openclaw/workspace/crm-system"
  
  if [ ! -d "$CRM_DIR" ]; then
    log_error "CRM 系统目录不存在：$CRM_DIR"
    exit 1
  fi
  
  cd $CRM_DIR/backend
  
  # 安装依赖
  if [ ! -d "node_modules" ]; then
    log_info "正在安装 npm 依赖..."
    npm install --production
  else
    log_info "✅ npm 依赖已安装"
  fi
  
  # 创建备份目录
  mkdir -p $CRM_DIR/backend/data/backups
  log_info "✅ 备份目录已创建"
  
  log_info "✅ CRM 系统部署完成"
}

# 创建 PM2 配置文件
create_pm2_config() {
  log_step "步骤 5/6: 创建 PM2 配置..."
  
  cat > /root/.openclaw/workspace/crm-system/backend/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'crm-system',
    script: 'server.js',
    cwd: '/root/.openclaw/workspace/crm-system/backend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      HOST: '0.0.0.0'
    },
    error_file: '/root/.openclaw/workspace/crm-system/backend/logs/pm2-error.log',
    out_file: '/root/.openclaw/workspace/crm-system/backend/logs/pm2-out.log',
    log_file: '/root/.openclaw/workspace/crm-system/backend/logs/pm2-combined.log',
    time: true,
    merge_logs: true
  }]
};
EOF
  
  log_info "✅ PM2 配置文件已创建"
}

# 启动服务
start_service() {
  log_step "步骤 6/6: 启动 CRM 服务..."
  
  cd /root/.openclaw/workspace/crm-system/backend
  
  # 停止旧实例
  pm2 delete crm-system 2>/dev/null || true
  
  # 启动新实例
  pm2 start ecosystem.config.js
  
  # 保存 PM2 配置
  pm2 save
  
  # 等待 3 秒检查状态
  sleep 3
  
  if pm2 status crm-system | grep -q "online"; then
    log_info "✅ CRM 服务已启动"
  else
    log_error "CRM 服务启动失败"
    pm2 logs crm-system --lines 20
    exit 1
  fi
}

# 显示完成信息
show_completion() {
  echo ""
  echo "=========================================="
  echo -e "${GREEN}  部署成功！${NC}"
  echo "=========================================="
  echo ""
  echo "访问地址："
  echo "  本地访问：http://localhost:3001"
  echo "  局域网访问：http://$(hostname -I | awk '{print $1}'):3001"
  echo ""
  echo "管理命令："
  echo "  查看状态：pm2 status"
  echo "  查看日志：pm2 logs crm-system"
  echo "  重启服务：pm2 restart crm-system"
  echo "  停止服务：pm2 stop crm-system"
  echo "  删除服务：pm2 delete crm-system"
  echo ""
  echo "自动功能："
  echo "  ✅ 开机自启动 - 服务器重启后自动运行"
  echo "  ✅ 崩溃自动重启 - 服务异常时自动恢复"
  echo "  ✅ 每日凌晨 2 点自动备份数据库"
  echo "  ✅ WAL 断电保护模式 - 防止数据库损坏"
  echo "  ✅ 优雅关闭 - 关闭前自动备份"
  echo ""
  echo "下一步配置："
  echo "  1. 配置防火墙（如已开启）："
  echo "     ufw allow 3001/tcp"
  echo ""
  echo "  2. 安装 Tailscale（远程访问）："
  echo "     curl -fsSL https://tailscale.com/install.sh | sh"
  echo "     sudo tailscale up"
  echo ""
  echo "  3. 备份目录位置："
  echo "     /root/.openclaw/workspace/crm-system/backend/data/backups"
  echo ""
  echo "=========================================="
}

# 主流程
main() {
  detect_os
  install_dependencies
  install_nodejs
  install_pm2
  deploy_crm
  create_pm2_config
  start_service
  show_completion
}

# 运行主流程
main

echo ""
log_info "部署完成！如有问题请查看日志：pm2 logs crm-system"
