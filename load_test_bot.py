import requests
import random
import time
import threading
import sys

# =====================================================================
# 🎛️ 压测强度控制器 (根据您的战术需求切换)
# =====================================================================

# 🟢 模式一：答辩现场演示模式 (快速、震撼、稳定)
TOTAL_TRANSACTIONS = 2000
CONCURRENT_THREADS = 50

# 🔴 模式二：论文图表生成模式 / 极限抗压测试 (平滑图表、探索系统死穴)
# 请在生成最终论文图片时，取消下面两行的注释，并注释掉上面的模式一
# TOTAL_TRANSACTIONS = 10000
# CONCURRENT_THREADS = 150 

# =====================================================================

BACKEND_URL = "http://127.0.0.1:8080/api"

DESTINATIONS = [
    "Shanghai Port, China (Asia)",
    "Shenzhen Port, China (Asia)",
    "Rotterdam Port, Netherlands (Europe)",
    "Port of London, UK (Europe)",
    "Port of Hamburg, Germany (Europe)",
    "Port of St. Petersburg, Russia (Europe)",
    "Port of New York, USA (North America)",
    "Port of Los Angeles, USA (North America)",
    "Panama Canal, Panama (Central America)",
    "Port of Singapore (Asia)",
    "Port of Santos, Brazil (South America)",
    "Port of Durban, South Africa (Africa)",
    "Port Hedland, Australia (Oceania)",
    "Jebel Ali Port, UAE (Middle East)",
    "Port of Tokyo, Japan (Asia)"
]

HIGH_RISK_DESTINATIONS = [
    "Pyongyang, DPRK (Sanctioned)",
    "Unknown Dark Web Node",
    "Caracas Shell Corp (High Risk)"
]

success_count = 0
failed_count = 0
lock = threading.Lock()

def fetch_users():
    try:
        response = requests.get(f"{BACKEND_URL}/users")
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                buyers = [u for u in data["data"] if u["Role"] == "buyer"]
                sellers = [u for u in data["data"] if u["Role"] == "seller"]
                return buyers, sellers
    except Exception as e:
        pass
    return [], []

def worker(buyers, sellers):
    global success_count, failed_count
    
    while True:
        with lock:
            if success_count + failed_count >= TOTAL_TRANSACTIONS:
                break
                
        if not buyers or not sellers:
            break

        buyer = random.choice(buyers)
        seller = random.choice(sellers)
        
        is_bad_apple = random.random() < 0.15 
        
        origin_port = random.choice(DESTINATIONS)
        
        if is_bad_apple:
            amount = random.randint(250000, 1000000) 
            dest_port = random.choice(HIGH_RISK_DESTINATIONS)
        else:
            amount = random.randint(10000, 80000) 
            available_dests = [p for p in DESTINATIONS if p != origin_port]
            dest_port = random.choice(available_dests)

        order_id = f"ORD-STRESS-{random.randint(100000, 999999)}"
        
        payload = {
            "id": order_id,
            "buyer_id": buyer["ID"],
            "seller_id": seller["ID"],
            "payment_type": "ESCROW",
            "amount": float(amount),
            "fiat_amount": float(amount * 7.2),
            "currency": buyer["FiatCurrency"],
            "origin": origin_port,       
            "destination": dest_port,    
            "txHash": f"0x_STRESS_{random.randbytes(16).hex()}"
        }

        try:
            res = requests.post(f"{BACKEND_URL}/orders", json=payload, timeout=5)
            if res.status_code == 200:
                with lock:
                    success_count += 1
            else:
                with lock:
                    failed_count += 1
        except Exception:
            with lock:
                failed_count += 1

def progress_bar():
    while success_count + failed_count < TOTAL_TRANSACTIONS:
        total = success_count + failed_count
        percent = (total / TOTAL_TRANSACTIONS) * 100
        sys.stdout.write(f"\r[🚀 压测中] 进度: {percent:.1f}% | 成功: {success_count} | 失败: {failed_count}")
        sys.stdout.flush()
        time.sleep(0.5)

if __name__ == "__main__":
    mode_name = "🔴 极限核弹模式" if TOTAL_TRANSACTIONS > 5000 else "🟢 标准演示模式"
    print(f"🔥 初始化全球点对点(P2P)压测引擎 [{mode_name}]...")
    print(f"🌍 目标: 模拟 {TOTAL_TRANSACTIONS} 笔跨国交易 | 并发线程: {CONCURRENT_THREADS}")
    
    buyers, sellers = fetch_users()
    if not buyers or not sellers:
        print("❌ 无法获取用户数据，请确保后端已启动！")
        exit()
        
    start_time = time.time()
    
    threads = []
    for i in range(CONCURRENT_THREADS):
        t = threading.Thread(target=worker, args=(buyers, sellers))
        threads.append(t)
        t.start()

    progress_thread = threading.Thread(target=progress_bar)
    progress_thread.start()

    for t in threads:
        t.join()
        
    progress_thread.join()

    end_time = time.time()
    duration = end_time - start_time
    tps = TOTAL_TRANSACTIONS / duration

    print(f"\n\n🏁 压测结束！耗时: {duration:.2f} 秒 | TPS: {tps:.2f} 笔/秒")
    print(f"✅ 成功写入: {success_count} 笔 | ❌ 失败/丢弃: {failed_count} 笔")