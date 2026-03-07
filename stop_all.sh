#!/bin/bash

echo "🛑 正在切断 B2B 仿真系统所有服务的电源..."

# 读取 PID 并杀死进程
if [ -f .anvil.pid ]; then
    kill $(cat .anvil.pid) 2>/dev/null
    echo "✔️  已关闭 Anvil 节点"
    rm .anvil.pid
fi

if [ -f .ai.pid ]; then
    kill $(cat .ai.pid) 2>/dev/null
    echo "✔️  已关闭 AI 雷达"
    rm .ai.pid
fi

if [ -f .backend.pid ]; then
    kill $(cat .backend.pid) 2>/dev/null
    echo "✔️  已关闭 Go 后端"
    rm .backend.pid
fi

if [ -f .frontend.pid ]; then
    # 由于 npm run dev 往往会衍生子进程，保险起见直接杀 node 进程
    kill $(cat .frontend.pid) 2>/dev/null
    pkill -f "next-server" 2>/dev/null
    pkill -f "next" 2>/dev/null
    echo "✔️  已关闭 Next.js 前端"
    rm .frontend.pid
fi

echo "=========================================================="
echo "✅ 所有系统进程已安全终止！"
echo "=========================================================="