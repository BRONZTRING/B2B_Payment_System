🌍 B2B Cross-Border Blockchain Payment & AML Settlement System

基于区块链智能合约、高并发微服务与无监督学习的下一代跨国 B2B 支付与反洗钱 (AML) 沙盒系统。

📖 项目概述 (Overview)

在全球多极化与“去美元化”趋势下，本项目构建了一条绕过传统 SWIFT 高壁垒网络的极速“金融走廊”。
系统利用 Web3 智能合约实现去中心化资金担保，采用 Go 协程构建高并发 L2 路由撮合引擎，并独创性地将孤立森林 (Isolation Forest) 无监督学习算法降维部署于内存态，实现了极高吞吐量下（1100+ TPS）的毫秒级零误杀智能反洗钱 (AML) 拦截。

🚀 核心架构与技术亮点 (Core Features)

⛓️ 协议层：去中心化信任状态机

基于本地 Anvil EVM 运行的 PaymentEscrow 智能合约。

支撑买卖双向资金担保、物流链上确权以及跨国贸易仲裁 (Dispute Resolution)。

⚡ 中枢层：极速高并发路由引擎

基于 Go/Gin 构建的微服务，单机无锁化设计，突破跨语言 RPC 瓶颈。

采用 SQLite (WAL 预写式日志模式)，实现单文件底层数据库的高频并发状态沉淀。

🧠 免疫层：AI 反洗钱与 XAI 审计

纯 CPU 算力驱动的孤立森林算法，精准识别资金极值外逃与微结构洗钱 (Smurfing)。

引入 XAI (可解释性 AI) 特征归因机制，生成可视化的风控报告，支持高级管理员“人机协同 (HITL)”强制解锁。

🌐 可视化层：零 GPU 损耗战术雷达

Next.js + TailwindCSS 构建的玻璃拟态指挥大屏，支持中/俄 (ZH/RU) 双语。

纯数学贝塞尔曲线 + SVG 动态渲染全球 15 大战略港口 P2P 资金飞线，完美消除 WebGL 性能抢占。

🏎️ 极限压测性能 (DOOMSDAY Benchmark)

在普通消费级物理机（无 GPU 加速，纯 CPU + SSD）的本地沙盒环境中，通过 Python 多线程连接池发起 50,000 笔 跨国复杂交易测试：

峰值吞吐量 (Peak TPS)：1194 TPS

平均响应延迟 (Latency)：~25 ms

AI 拦截混淆矩阵 (AUC)：1.000 (零误判，零漏判)

系统韧性：无内存泄漏 (Zero OOM)，进程零崩溃。

🛠️ 快速开始 (Quick Start)

1. 环境依赖 (Prerequisites)

请确保您的机器已安装以下底层环境：

Go (>= 1.21)

Node.js (>= 18.x) & npm

Python (>= 3.9)

Foundry (Anvil) (以太坊本地节点环境)

2. 一键拉起微服务集群

项目包含了一键自动化编排脚本，将自动编译 Go 后端、启动 EVM 节点、并拉起前端监控大屏：

# 赋予脚本执行权限
chmod +x start_all.sh stop_all.sh

# 一键启动全栈服务
./start_all.sh


访问控制台：打开浏览器访问 http://localhost:3000/simulation 进入上帝视角大屏。

3. 触发核弹级并发压测 (Stress Testing)

保持大屏开启，打开一个新的终端窗口，触发 Python 数据洪流：

# 进入虚拟环境 (如果已配置)
source .venv/bin/activate

# 发起 50,000 笔并发交易
python load_test_bot.py


💡 此时观察前端大屏的 Telemetry 面板，您将看到 TPS 指针狂飙的视觉震撼效果。

4. 离线萃取科研图表

压测结束后，可利用底层沉淀的 SQLite 数据，自动生成 14 张 SCI 级别的高阶分析图表：

python generate_offline_charts.py


生成的图表将保存在 thesis_exports/ 目录下。

📂 项目目录结构 (Project Structure)

B2B_Payment_System/
├── backend/                  # Go 高并发微服务中枢
│   ├── controllers/          # 业务路由与 AI 内存态算法模块
│   └── main.go               # Gin 引擎入口
├── frontend/                 # Next.js 交互式大屏
│   ├── app/simulation/       # 遥测监控面板与 XAI 审计大屏
│   └── components/           # SVG 全球雷达渲染组件
├── contracts/                # Solidity 智能合约与底层协议
│   ├── src/PaymentEscrow.sol # 去中心化担保核心合约
│   └── script/Deploy.s.sol   # 链上自动部署脚本
├── thesis_exports/           # 自动生成的 14 维度学术分析图表 (KDE, ECDF等)
├── load_test_bot.py          # Python 多线程并发压测引擎 (含 Session 连接池)
├── generate_offline_charts.py# Python 离线数据科学与图表渲染引擎
└── start_all.sh              # 全栈一键启动 CI/CD 编排脚本


🎓 学术声明 (Academic Disclaimer)

本项目不仅是计算机软件工程的落地实践，更是针对国际政治经济学“去中心化多边贸易基础设施”的架构级论证。系统生成的测试数据与拓扑模型，仅供学术防真验证使用。

Architected & Developed by [DONGAO/BRONZTRING]# B2B Cross-Border Payment System
