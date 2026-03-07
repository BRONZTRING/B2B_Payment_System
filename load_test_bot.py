import requests
import random
import time
import pandas as pd
from concurrent.futures import ThreadPoolExecutor
import uuid

# --- 配置区 ---
BACKEND_URL = "http://127.0.0.1:8080/api"
TOTAL_TRANSACTIONS = 2000  # 🌟 改为 2000 笔（足够跑出极佳的数据分布，耗时约1~2分钟）
CONCURRENT_THREADS = 50    # 🌟 改为 50 并发（相当于 50 个黑客/企业同时在操作）
OUTPUT_FILE = "simulated_trade_data.csv"

# 目的地池（含高危节点）
DESTINATIONS = [
    "Rotterdam, Netherlands", "Hamburg, Germany", "Los Angeles, USA", 
    "Singapore, Singapore", "Dubai, UAE", "Pyongyang, DPRK (Sanctioned)", 
    "Unknown Dark Web Node"
]

def get_all_users():
    """从后端获取所有初始化的买家和卖家"""
    try:
        response = requests.get(f"{BACKEND_URL}/users")
        if response.status_code == 200:
            users = response.json().get("data", [])
            buyers = [u for u in users if u["Role"] == "buyer"]
            sellers = [u for u in users if u["Role"] == "seller"]
            return buyers, sellers
    except Exception as e:
        print(f"❌ 无法连接后端: {e}")
        return [], []

def simulate_one_transaction(buyer, seller):
    """模拟一笔完整的交易生命周期流程并记录数据"""
    # 1. 随机生成金额 (有概率生成正常金额，有概率生成洗钱金额)
    is_anomaly = random.random() < 0.15 # 15% 概率生成异常数据
    if is_anomaly:
        # 洗钱模式：巨大金额或敏感地点
        amount = random.uniform(250000, 500000)
        dest = random.choice(DESTINATIONS[5:]) # 朝鲜或暗网
    else:
        # 正常贸易模式
        amount = random.uniform(5000, 80000)
        dest = random.choice(DESTINATIONS[:5])

    order_id = f"TEST-BOT-{uuid.uuid4().hex[:8].upper()}"
    
    # 模拟请求 Payload
    payload = {
        "id": order_id,
        "buyer_id": buyer["ID"],
        "seller_id": seller["ID"],
        "payment_type": "ESCROW",
        "amount": round(amount, 2),
        "fiat_amount": round(amount * 7.23, 2), # 简单换算
        "currency": buyer["FiatCurrency"],
        "origin": "Global Testing Lab",
        "destination": dest,
        "txHash": f"0x{uuid.uuid4().hex}{uuid.uuid4().hex}" # 模拟哈希
    }

    try:
        # 向 Go 后端发起支付请求（这将触发 Python AI 扫描）
        start_time = time.time()
        response = requests.post(f"{BACKEND_URL}/orders", json=payload)
        latency = time.time() - start_time
        
        if response.status_code == 200:
            result = response.json().get("data", {})
            # 返回提取到的特征数据，用于后续 CSV 导出
            return {
                "OrderID": order_id,
                "Buyer": buyer["CompanyName"],
                "Seller": seller["CompanyName"],
                "Amount_BUSD": amount,
                "Destination": dest,
                "RiskScore": result.get("RiskScore", 0),
                "IsFlagged": result.get("IsFlagged", False),
                "Latency_Sec": latency,
                "Status": "SUCCESS"
            }
    except Exception as e:
        return {"Status": f"FAILED: {str(e)}"}

def main():
    print("🚀 TrustPay 全自动压测机器人启动...")
    buyers, sellers = get_all_users()
    
    if not buyers or not sellers:
        print("❌ 未发现可用用户，请确保后端已启动并完成 SeedData。")
        return

    print(f"📊 已识别 {len(buyers)} 个买家节点, {len(sellers)} 个卖家节点。")
    print(f"🧪 正在模拟 {TOTAL_TRANSACTIONS} 笔全球贸易流，请稍候...")

    results = []
    
    # 使用线程池模拟并发操作
    with ThreadPoolExecutor(max_workers=CONCURRENT_THREADS) as executor:
        futures = []
        for _ in range(TOTAL_TRANSACTIONS):
            b = random.choice(buyers)
            s = random.choice(sellers)
            futures.append(executor.submit(simulate_one_transaction, b, s))
        
        for i, future in enumerate(futures):
            res = future.result()
            if res and res.get("Status") == "SUCCESS":
                results.append(res)
                if (i + 1) % 50 == 0:
                    print(f"✅ 已完成 {i+1} 笔交易注入...")

    # --- 数据导出 ---
    df = pd.DataFrame(results)
    df.to_csv(OUTPUT_FILE, index=False, encoding='utf-8-sig')
    
    print("\n" + "="*50)
    print(f"🎉 压测任务圆满结束！")
    print(f"💾 数据集已导出至: {OUTPUT_FILE}")
    print(f"📈 成功采集数据: {len(results)} 行")
    print(f"🛑 平均系统延迟: {df['Latency_Sec'].mean():.4f} 秒")
    print(f"🚨 拦截异常交易: {df['IsFlagged'].sum()} 笔")
    print("="*50)

if __name__ == "__main__":
    main()