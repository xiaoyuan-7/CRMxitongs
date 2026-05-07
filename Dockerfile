# 使用Node.js 22镜像
FROM node:22-bookworm-slim

# 安装构建工具
RUN apt-get update && apt-get install -y build-essential

# 设置工作目录
WORKDIR /app

# 复制后端文件
COPY backend/ ./backend/
COPY frontend-simple/ ./frontend-simple/

# 安装后端依赖
RUN cd backend && npm install --production && npm install sqlite3 --build-from-source

# 暴露端口
EXPOSE 3001

# 启动后端服务
CMD ["node", "backend/server.js"]