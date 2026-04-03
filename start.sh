#!/bin/bash

PORT=3000
LOG_FILE="dev-server.log"
PID_FILE="dev-server.pid"

echo "==> 检查端口 $PORT 是否被占用..."
PID=$(lsof -ti tcp:$PORT)

if [ -n "$PID" ]; then
  echo "==> 端口 $PORT 被进程 $PID 占用，正在终止..."
  kill -9 $PID
  sleep 1
  echo "==> 进程已终止"
fi

echo "==> 启动开发服务器（后台运行）..."
nohup npm run dev > "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"

echo "==> 开发服务器已启动，PID: $(cat $PID_FILE)"
echo "==> 日志文件: $LOG_FILE"
echo "==> 访问地址: http://localhost:$PORT"
echo "==> 停止服务器: kill \$(cat $PID_FILE)"
