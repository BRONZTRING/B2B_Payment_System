"""
真实孤立森林模型训练脚本
========================
使用交易金额特征训练孤立森林模型，并生成：
  - risk_model.pkl (模型文件)
  - roc_curve_real.png (真实 ROC 曲线)
  - confusion_matrix_real.png (真实混淆矩阵)
  - feature_importance.png (特征重要性图)

特征列：仅使用 amount (与 generate_offline_charts.py 预测部分保持一致)
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.metrics import roc_curve, auc, confusion_matrix, ConfusionMatrixDisplay
import matplotlib.pyplot as plt
import seaborn as sns
import joblib
import os

# ======================== 1. 数据准备 ========================
DATA_PATH = "data/saml_d_transactions.csv"
print("正在准备训练数据...")

if os.path.exists(DATA_PATH):
    print("[*] 使用 SAML-D 数据集...")
    df = pd.read_csv(DATA_PATH)
    # 仅使用金额列
    feature_cols = ['amount']
    # 如果数据集中有标签列，则使用；否则全部视为正常
    if 'Is_Laundering' in df.columns:
        y_true = df['Is_Laundering'].values
    else:
        y_true = np.zeros(len(df))
else:
    print("[!] 未找到 SAML-D 数据集，使用模拟数据。")
    np.random.seed(42)
    n = 5000
    # 正常交易
    X_normal = np.random.exponential(50000, (n, 1))
    # 异常交易（金额较大）
    X_anomaly = np.random.exponential(200000, (200, 1))
    X = np.vstack([X_normal, X_anomaly])
    # 构造 DataFrame
    df = pd.DataFrame(X, columns=['amount'])
    df['Is_Laundering'] = np.array([0]*n + [1]*200)
    y_true = df['Is_Laundering'].values
    feature_cols = ['amount']

X = df[feature_cols].values
print(f"训练样本数: {len(X)}，特征数: {len(feature_cols)}，特征: {feature_cols}")

# ======================== 2. 训练模型 ========================
print("训练 Isolation Forest 模型...")
model = IsolationForest(
    contamination=0.05,   # 假设 5% 异常率
    random_state=42,
    n_estimators=100
)
model.fit(X)

# 保存模型
joblib.dump(model, "risk_model.pkl")
print("[✓] 模型已保存: risk_model.pkl")

# ======================== 3. 预测 ========================
y_scores = model.decision_function(X)   # 越小越异常
y_pred = model.predict(X)               # +1 正常，-1 异常
y_pred_binary = (y_pred == -1).astype(int)

# ======================== 4. 生成评估图表 ========================
OUTPUT_DIR = "charts"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# 图1：ROC 曲线
if y_true.sum() > 0 and y_true.sum() < len(y_true):
    fpr, tpr, _ = roc_curve(y_true, 1 - y_scores)  # 转换分数方向
    roc_auc = auc(fpr, tpr)
else:
    fpr, tpr, roc_auc = [0, 1], [0, 1], 0.5

plt.figure(figsize=(8, 6))
plt.plot(fpr, tpr, label=f'ROC (AUC = {roc_auc:.3f})', lw=2)
plt.plot([0, 1], [0, 1], 'k--', lw=1)
plt.xlabel('False Positive Rate')
plt.ylabel('True Positive Rate')
plt.title('ROC Curve - IsolationForest (Single Feature: amount)')
plt.legend()
plt.grid(alpha=0.3)
plt.savefig('roc_curve_real.png', dpi=150, bbox_inches='tight')
plt.close()
print("[✓] roc_curve_real.png")

# 图2：混淆矩阵
cm = confusion_matrix(y_true, y_pred_binary)
disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=['Normal', 'Laundering'])
disp.plot(cmap='Blues')
plt.title('Confusion Matrix - IsolationForest (Single Feature: amount)')
plt.savefig('confusion_matrix_real.png', dpi=150, bbox_inches='tight')
plt.close()
print("[✓] confusion_matrix_real.png")

# 图3：特征重要性（标准差近似）
importances = np.std(X, axis=0)
plt.figure(figsize=(6, 4))
sns.barplot(x=importances, y=feature_cols, palette='viridis')
plt.title('Feature Importance (Standard Deviation)')
plt.xlabel('Std Dev')
plt.tight_layout()
plt.savefig('feature_importance.png', dpi=150)
plt.close()
print("[✓] feature_importance.png")

print("\n所有文件生成完毕。")
print("请确保 risk_model.pkl 在项目根目录，然后运行 generate_offline_charts.py")