from fastapi import FastAPI
from pydantic import BaseModel
import numpy as np
from sklearn.ensemble import IsolationForest
import uvicorn
import math

app = FastAPI(title="B2B AI Risk Radar (V11.0)")

# ==========================================
# 1. 机器学习模型初始化 (孤立森林 Isolation Forest)
# ==========================================
print("⏳ 正在初始化并训练 AI 孤立森林模型...")

# 构造一些正常的历史交易特征作为训练集: [金额大小(缩放后), 路线特征]
# 假设大部分正常交易金额在 1w~6w USD (特征值为 1.0~6.0)，路线为常规路线(0)
X_train = np.array([
    [1.0, 0], [2.5, 0], [5.0, 0], [3.0, 0], [4.5, 0], [6.0, 0],
    [1.2, 0], [3.3, 0], [2.1, 0], [0.5, 0], [5.5, 0], [2.8, 0]
])

# 实例化模型: contamination=0.1 意味着我们预期有 10% 左右的异常交易
model = IsolationForest(n_estimators=100, contamination=0.1, random_state=42)
model.fit(X_train)

print("✅ AI 模型训练完毕，雷达系统已上线！")

# ==========================================
# 2. 接口数据模型定义
# ==========================================
class OrderData(BaseModel):
    amount: float
    origin: str
    destination: str

# 路线特征编码器
def encode_route(origin: str, destination: str) -> int:
    route = f"{origin}-{destination}".lower()
    if "unknown" in route or "high-risk" in route:
        return 2  # 高危路线
    elif "europe" in route or "germany" in route:
        return 1  # 跨洲长途路线
    return 0      # 常规路线

# ==========================================
# 3. 核心风控评估接口
# ==========================================
@app.post("/predict")
def predict_risk(order: OrderData):
    # 提取特征
    route_code = encode_route(order.origin, order.destination)
    amount_scaled = order.amount / 10000.0
    
    features = np.array([[amount_scaled, route_code]])
    
    # decision_function 返回值范围大致在 [-0.5, 0.5]
    # 越接近负数（或者越小），表示越异常。
    raw_score = model.decision_function(features)[0]
    
    # 将模型的分数映射为 0.0 ~ 1.0 的风险概率 (分数越高，风险越大)
    # 使用简单的 sigmoid 变形将其平滑化
    risk_score = 1.0 / (1.0 + math.exp(raw_score * 5))
    risk_score = float(np.clip(risk_score, 0.01, 0.99))
    
    # 让模型进行硬性裁决 (1 为正常, -1 为异常)
    prediction = model.predict(features)[0]
    
    # 综合判定：如果被孤立森林标记为 -1，或风险分数 > 0.8，或金额大于 20万 USD，则直接熔断拦截！
    is_flagged = bool(prediction == -1 or risk_score > 0.8 or order.amount > 200000)

    # 针对部分极端情况强制注入异常 (展示用)
    if "Unknown" in order.origin:
        risk_score = 0.99
        is_flagged = True

    return {
        "risk_score": round(risk_score, 4),
        "is_flagged": is_flagged
    }

@app.get("/health")
def health_check():
    return {"status": "AI Radar Online"}

if __name__ == "__main__":
    # 绑定在 8000 端口，供 Go 后端 (8080) 呼叫
    uvicorn.run(app, host="0.0.0.0", port=8000)