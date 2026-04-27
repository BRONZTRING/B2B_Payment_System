from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import pandas as pd
import numpy as np
import os
import uvicorn

app = FastAPI(title="B2B Risk Oracle API (Multidimensional)")

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "risk_model.pkl")

pipeline = None
if os.path.exists(MODEL_PATH):
    # 这里加载的是完整的 sklearn Pipeline (预处理 + 模型)
    pipeline = joblib.load(MODEL_PATH)
    print(f"[*] 🚀 多维风控 Pipeline 加载成功: {MODEL_PATH}")
else:
    print(f"[!] ❌ 未找到模型文件 {MODEL_PATH}")

# Pydantic 结构必须与 Go 侧的 AIRiskRequest 严格对齐
class OrderData(BaseModel):
    amount: float
    destination: str
    payer_type: str

@app.post("/api/v1/analyze_risk")
def analyze_risk(order: OrderData):
    if pipeline is None:
        raise HTTPException(status_code=500, detail="Risk Pipeline is offline.")

    # 1. 转换为 DataFrame，必须匹配 train_model.py 中的特征列名
    input_data = pd.DataFrame([{
        "amount": order.amount,
        "destination": order.destination,
        "payer_type": order.payer_type
    }])
    
    # 2. Pipeline 推理：自动执行标准化、独热编码，并送入孤立森林
    raw_score = pipeline.decision_function(input_data)[0]
    prediction = pipeline.predict(input_data)[0]
    
    is_flagged = bool(prediction == -1)
    
    # 将模型输出映射为 0-1 之间的风险概率
    risk_score = 1.0 / (1.0 + np.exp(raw_score * 4))
    
    reasons = []
    if is_flagged:
        # 添加一些可解释性日志
        if order.amount > 100000:
            reasons.append("大额异常流动")
        if "sanctioned" in order.destination.lower() or "dark" in order.destination.lower():
            reasons.append("触碰高危地缘管控区域")
        if order.payer_type in ["unverified", "new"]:
            reasons.append("付款方信誉度存疑")
            
        if len(reasons) == 0:
            reasons.append(f"AI多维空间异常检出 (Score: {raw_score:.3f})")
    else:
        reasons.append("AI多维综合评估：放行")

    return {
        "risk_score": float(risk_score),
        "is_flagged": is_flagged,
        "reasons": reasons
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5005)