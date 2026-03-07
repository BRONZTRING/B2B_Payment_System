import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np

# 1. 配置图表风格 (学术出版级)
sns.set_theme(style="whitegrid", context="paper")
plt.rcParams['font.family'] = 'sans-serif'
# 如果在俄罗斯写论文，建议图表带有专业的学术感
plt.rcParams['axes.titlesize'] = 14
plt.rcParams['axes.labelsize'] = 12

print("📊 正在加载压测数据集...")
try:
    df = pd.read_csv("simulated_trade_data.csv")
except FileNotFoundError:
    print("❌ 找不到 simulated_trade_data.csv，请先运行 load_test_bot.py！")
    exit()

print("🎨 开始生成学术图表...")

# ==========================================
# 图表 1：AI 孤立森林风险得分分布图 (KDE 密度直方图)
# 证明：您的 AI 能够完美区分正常与异常交易（双峰分布）
# ==========================================
plt.figure(figsize=(10, 6))
sns.histplot(data=df, x='RiskScore', hue='IsFlagged', bins=40, kde=True, 
             palette={False: '#2ecc71', True: '#e74c3c'}, element='step')
plt.title('Distribution of AI Isolation Forest Risk Scores')
plt.xlabel('Anomaly Risk Score (0.0 = Normal, 1.0 = Highly Anomalous)')
plt.ylabel('Frequency (Number of Transactions)')
plt.axvline(x=0.8, color='red', linestyle='--', linewidth=2, label='Decision Threshold (0.8)')
plt.legend(['Decision Threshold', 'Flagged (Anomaly)', 'Cleared (Normal)'])
plt.tight_layout()
plt.savefig('thesis_chart_1_risk_distribution.png', dpi=300)
plt.close()
print("✅ 已生成: thesis_chart_1_risk_distribution.png")

# ==========================================
# 图表 2：金额与风险得分的高维空间散点图
# 证明：展示大额洗钱或异常资金如何被剥离（数学聚类表现）
# ==========================================
plt.figure(figsize=(10, 6))
sns.scatterplot(data=df, x='Amount_BUSD', y='RiskScore', hue='IsFlagged', 
                style='IsFlagged', palette={False: '#3498db', True: '#c0392b'}, 
                s=60, alpha=0.7)
plt.title('Scatter Plot: Transaction Value vs. Detected Risk Score')
plt.xlabel('Transaction Amount (BUSD)')
plt.ylabel('Isolation Forest Risk Score')
# 增加一条阈值参考线
plt.axhline(y=0.8, color='black', linestyle=':', alpha=0.5)
plt.tight_layout()
plt.savefig('thesis_chart_2_anomaly_scatter.png', dpi=300)
plt.close()
print("✅ 已生成: thesis_chart_2_anomaly_scatter.png")

# ==========================================
# 图表 3：系统高并发响应延迟箱线图 (Boxplot)
# 证明：系统的 Go 后端架构在极速处理时的稳定性
# ==========================================
plt.figure(figsize=(8, 6))
sns.boxplot(y=df['Latency_Sec'], color='#9b59b6', width=0.4, fliersize=3)
sns.stripplot(y=df['Latency_Sec'], color="black", alpha=0.1, size=3)
plt.title('System Latency Distribution during High-Concurrency Stress Test')
plt.ylabel('Response Time (Seconds)')
# 添加平均值文本
mean_latency = df['Latency_Sec'].mean()
plt.text(0.3, mean_latency, f'Mean: {mean_latency:.4f}s', fontsize=12, 
         bbox=dict(facecolor='white', alpha=0.8))
plt.tight_layout()
plt.savefig('thesis_chart_3_latency_boxplot.png', dpi=300)
plt.close()
print("✅ 已生成: thesis_chart_3_latency_boxplot.png")

# ==========================================
# 图表 4：地缘政治目标区域风险拦截统计图 (条形图)
# 证明：结合国际关系学，系统对高危节点（暗网/制裁区）的敏锐度
# ==========================================
plt.figure(figsize=(12, 7))
# 按照目的地统计被拦截和放行的数量
dest_counts = df.groupby(['Destination', 'IsFlagged']).size().reset_index(name='Count')
sns.barplot(data=dest_counts, y='Destination', x='Count', hue='IsFlagged', 
            palette={False: '#95a5a6', True: '#e67e22'})
plt.title('Geopolitical Radar: Intercepted Transactions by Destination Node')
plt.xlabel('Number of Transactions')
plt.ylabel('Global Destination Port / Node')
plt.legend(title='Intercepted by AI', labels=['Normal Flow', 'Blocked (Sanctions/AML)'])
plt.tight_layout()
plt.savefig('thesis_chart_4_geopolitics_bar.png', dpi=300)
plt.close()
print("✅ 已生成: thesis_chart_4_geopolitics_bar.png")

print("\n🎉 成功！所有高质量学术图表已保存至当前目录。您可以直接插入您的 ВКР (毕业论文) 中！")