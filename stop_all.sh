#!/bin/bash

echo "🛑 开始安全关停 B2B 支付系统..."

# 1. 停止 AI 微服务
if [ -f .ai.pid ]; then
    PID=$(cat .ai.pid)
    kill $PID 2>/dev/null
    rm .ai.pid
    echo "🧠 停止 AI 微服务 (PID: $PID)"
else
    echo "⚠️ 未找到 AI 微服务 PID 记录"
fi

# 2. 停止 Go 后端
if [ -f .backend.pid ]; then
    PID=$(cat .backend.pid)
    kill $PID 2>/dev/null
    rm .backend.pid
    echo "⚙️ 停止 Go 后端 (PID: $PID)"
else
    echo "⚠️ 未找到 Go 后端 PID 记录"
fi

# 3. 停止前端
if [ -f .frontend.pid ]; then
    PID=$(cat .frontend.pid)
    kill $PID 2>/dev/null
    rm .frontend.pid
    echo "🌐 停止前端服务 (PID: $PID)"
else
    echo "⚠️ 未找到前端 PID 记录"
fi

echo "✅ 所有系统组件已安全下线。"