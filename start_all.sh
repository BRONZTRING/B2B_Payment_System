#!/bin/bash

echo "=========================================================="
echo "🚀 正在一键启动 B2B 仿真系统全栈环境 (V11.0 鲁棒版)..."
echo "=========================================================="

# 1. 启动区块链节点 (扩容至 100 个账户)
echo "⏳ [1/5] 启动 Anvil 本地测试链 (100 并发账户模式)..."
anvil --accounts 100 > anvil.log 2>&1 &
ANVIL_PID=$!
sleep 3

# 2. 部署智能合约
echo "⏳ [2/5] 正在将智能合约部署至 Anvil..."
cd contracts
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 forge script script/Deploy.s.sol:DeployScript --rpc-url http://127.0.0.1:8545 --broadcast > deploy.log 2>&1
cd ..
sleep 1

# 3. 启动 AI 风控服务
echo "⏳ [3/5] 启动 Python AI 孤立森林雷达..."
cd ai_service
source venv/bin/activate
python main.py > ai.log 2>&1 &
AI_PID=$!
deactivate
cd ..

# 4. 启动 Go 后端服务
echo "⏳ [4/5] 启动 Go 业务中枢引擎..."
cd backend
rm -f b2b_ledger.db 
go build -o server main.go
./server > backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# 5. 启动前端服务
echo "⏳ [5/5] 启动 Next.js 前端应用..."
cd frontend
npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

echo "=========================================================="
echo "✅ 大捷！所有核心组件已在后台平稳运行。"
echo "🔗 商业门户主页 : http://localhost:3000"
echo "=========================================================="

echo $ANVIL_PID > .anvil.pid
echo $AI_PID > .ai.pid
echo $BACKEND_PID > .backend.pid
echo $FRONTEND_PID > .frontend.pid