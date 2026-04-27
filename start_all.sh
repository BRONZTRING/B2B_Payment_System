#!/bin/bash

echo "=================================================="
echo "🚀 启动 B2B 跨境支付与 AI 风控全矩阵系统"
echo "=================================================="

# 1. 依赖与模型基建检查
echo "[1/4] 检查机器学习基建..."
if [ ! -f "risk_model.pkl" ]; then
    echo "⚠️ 未检测到 risk_model.pkl 模型文件！"
    echo "正在自动安装依赖并启动训练脚本 (这可能需要几分钟)..."
    pip install fastapi uvicorn pydantic scikit-learn numpy pandas matplotlib seaborn joblib
    python train_model.py
    echo "✅ 模型训练完毕！"
else
    echo "✅ 风险模型 (risk_model.pkl) 已就绪。"
fi

# 2. 启动 Python AI 微服务
echo "[2/4] 启动 Python AI 风控预言机 (Port 5005)..."
cd ai_service || { echo "❌ 找不到 ai_service 目录"; exit 1; }
# 使用 nohup 后台运行并隐藏输出，记录 PID
nohup python app.py > ../ai_service.log 2>&1 &
AI_PID=$!
cd ..
echo $AI_PID > .ai.pid
echo "✅ AI 微服务已启动 (PID: $AI_PID)"

# 3. 启动 Go 后端
echo "[3/4] 启动 Go 区块链路由与 API 核心 (Port 8080)..."
cd backend || { echo "❌ 找不到 backend 目录"; exit 1; }
nohup go run main.go > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..
echo $BACKEND_PID > .backend.pid
echo "✅ Go 后端已启动 (PID: $BACKEND_PID)"

# 4. 启动 Next.js 前端
echo "[4/4] 启动 Web3 交互前端 (Port 3000)..."
cd frontend || { echo "❌ 找不到 frontend 目录"; exit 1; }
nohup npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..
echo $FRONTEND_PID > .frontend.pid
echo "✅ 前端开发服务器已启动 (PID: $FRONTEND_PID)"

echo "=================================================="
echo "🎉 全系统启动完毕！"
echo "👉 前端界面: http://localhost:3000"
echo "👉 Go 后端: http://localhost:8080/api/ping"
echo "👉 AI 服务: http://localhost:5005/docs (Swagger UI)"
echo "📜 运行日志已分别保存至 ai_service.log, backend.log, frontend.log"
echo "⏹️  如需停止系统，请运行 ./stop_all.sh"
echo "=================================================="