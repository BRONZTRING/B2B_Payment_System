import requests
import random
import time
import threading
import sys

# =====================================================================
# 🎛️ 工业级压测控制器 (Doomsday 真实对抗模式)
# =====================================================================

TOTAL_TRANSACTIONS = 50000
CONCURRENT_THREADS = 200 

# 📉 真实世界的概率分布法则 (核心修改区)
ANOMALY_RATE = 0.02          # 真实洗钱比例仅为 2% (高度不平衡样本)
SNEAKY_LAUNDERER_RATE = 0.30 # 洗钱者中，有 30% 是极度狡猾的 (故意低于预警线，制造漏判 FN)
NGO_WHALE_RATE = 0.005       # 正常交易中，有 0.5% 是人道主义巨款发往高危区 (制造误杀 FP)

# =====================================================================

BACKEND_URL = "http://127.0.0.1:8080/api"

DESTINATIONS = [
    "Shanghai Port, China (Asia)", "Shenzhen Port, China (Asia)",
    "Rotterdam Port, Netherlands (Europe)", "Port of London, UK (Europe)",
    "Port of Hamburg, Germany (Europe)", "Port of St. Petersburg, Russia (Europe)",
    "Port of New York, USA (North America)", "Port of Los Angeles, USA (North America)",
    "Panama Canal, Panama (Central America)", "Port of Singapore (Asia)",
    "Port of Santos, Brazil (South America)", "Port of Durban, South Africa (Africa)",
    "Port Hedland, Australia (Oceania)", "Jebel Ali Port, UAE (Middle East)",
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
    
    # 维持 TCP 连接池，确保操作系统稳定
    session = requests.Session()
    adapter = requests.adapters.HTTPAdapter(pool_connections=50, pool_maxsize=100)
    session.mount('http://', adapter)
    
    while True:
        with lock:
            if success_count + failed_count >= TOTAL_TRANSACTIONS:
                break
                
        if not buyers or not sellers:
            break

        buyer = random.choice(buyers)
        seller = random.choice(sellers)
        
        # 🎲 蒙特卡洛随机漫步：决定该笔交易的真实身份 (Ground Truth)
        is_dirty = random.random() < ANOMALY_RATE 
        
        # 为了后续离线图表能准确画出混淆矩阵，我们在 ID 中打入上帝视角的“绝对标签”
        label_prefix = ""
        amount = 0
        origin_port = random.choice(DESTINATIONS)
        dest_port = ""

        if is_dirty:
            if random.random() < SNEAKY_LAUNDERER_RATE:
                # 🥷 隐蔽的坏人 (制造漏判 FN 陷阱)：金额卡在 19万，目的地选正常港口
                amount = random.randint(190000, 199999) 
                dest_port = random.choice([p for p in DESTINATIONS if p != origin_port])
                label_prefix = "ORD-DIRTY-SNEAKY-"
            else:
                # 👹 猖狂的坏人 (被 AI 稳抓)：巨额直飞暗网
                amount = random.randint(250000, 1000000) 
                dest_port = random.choice(HIGH_RISK_DESTINATIONS)
                label_prefix = "ORD-DIRTY-OBV-"
        else:
            if random.random() < NGO_WHALE_RATE:
                # 🕊️ 合法的国际 NGO 巨头 (制造误杀 FP 陷阱)：巨款人道救援被制裁区
                amount = random.randint(300000, 800000)
                dest_port = random.choice(HIGH_RISK_DESTINATIONS)
                label_prefix = "ORD-CLEAN-NGO-"
            else:
                # 🟢 普普通通的跨国中小企业贸易
                amount = random.randint(5000, 80000) 
                dest_port = random.choice([p for p in DESTINATIONS if p != origin_port])
                label_prefix = "ORD-CLEAN-NORM-"

        # 生成带有真实标签的业务哈希
        order_id = f"{label_prefix}{random.randint(100000, 999999)}"
        
        payload = {
            "id": order_id, "buyer_id": buyer["ID"], "seller_id": seller["ID"],
            "payment_type": "ESCROW", "amount": float(amount), "fiat_amount": float(amount * 7.2),
            "currency": buyer["FiatCurrency"], "origin": origin_port, "destination": dest_port,    
            "txHash": f"0x_{random.randbytes(16).hex()}"
        }

        try:
            res = session.post(f"{BACKEND_URL}/orders", json=payload, timeout=5)
            if res.status_code == 200:
                with lock: success_count += 1
            else:
                with lock: failed_count += 1
        except Exception:
            with lock: failed_count += 1

def progress_bar():
    while success_count + failed_count < TOTAL_TRANSACTIONS:
        total = success_count + failed_count
        percent = (total / TOTAL_TRANSACTIONS) * 100
        sys.stdout.write(f"\r[☢️ 真实噪音压测中] 进度: {percent:.1f}% | 成功: {success_count} | 失败: {failed_count}")
        sys.stdout.flush()
        time.sleep(0.5)

if __name__ == "__main__":
    print(f"🔥 初始化全球点对点(P2P)压测引擎 [对抗加噪模式]...")
    print(f"🌍 目标: {TOTAL_TRANSACTIONS} 笔 | 异常分布率: {ANOMALY_RATE*100}% | 伪装率: {SNEAKY_LAUNDERER_RATE*100}%")
    
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

    for t in threads: t.join()
    progress_thread.join()

    end_time = time.time()
    duration = end_time - start_time
    tps = TOTAL_TRANSACTIONS / duration

    print(f"\n\n🏁 压测结束！耗时: {duration:.2f} 秒 | 平均 TPS: {tps:.2f} 笔/秒")