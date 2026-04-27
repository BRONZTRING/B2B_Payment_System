"""
真实孤立森林模型训练脚本
========================
使用 SAML-D 数据集（或模拟数据）训练模型，并生成 risk_model.pkl 与三张评估图表。
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.metrics import roc_curve, auc, confusion_matrix, ConfusionMatrixDisplay
import matplotlib.pyplot as plt
import seaborn as sns
import joblib
import os

# ----- 1. 数据准备 -----
DATA_PATH = "data/saml_d_transactions.csv"
if os.path.exists(DATA_PATH):
    print("[*] 使用 SAML-D 数据集...")
    df = pd.read_csv(DATA_PATH)
    feature_cols = ['Amount', 'TransactionType_Code', 'Sender_Region_Code', 'Receiver_Region_Code']
    label_col = 'Is_Laundering'
    y_true = df[label_col].values if label_col in df.columns else np.zeros(len(df))
else:
    print("[!] 未找到数据集，使用模拟数据。")
    np.random.seed(42)
    n = 5000
    X_normal = np.random.exponential(50000, (n, 4))
    X_anomaly = np.random.exponential(200000, (200, 4))
    X = np.vstack([X_normal, X_anomaly])
    y_true = np.array([0]*n + [1]*200)
    feature_cols = ['Amount', 'Type_Code', 'Sender_Region', 'Receiver_Region']
    df = pd.DataFrame(X, columns=feature_cols)
    df['Is_Laundering'] = y_true

X = df[feature_cols].values
print(f"训练样本数: {len(X)}，特征数: {len(feature_cols)}")

# ----- 2. 训练模型 -----
model = IsolationForest(contamination=0.05, random_state=42)
model.fit(X)
joblib.dump(model, "risk_model.pkl")
print("[✓] 模型已保存: risk_model.pkl")

# ----- 3. 预测 -----
y_scores = model.decision_function(X)
y_pred = model.predict(X)
y_pred_binary = (y_pred == -1).astype(int)

# ----- 4. ROC 曲线 -----
fpr, tpr, _ = roc_curve(y_true, y_scores)
roc_auc = auc(fpr, tpr)
plt.figure(figsize=(8,6))
plt.plot(fpr, tpr, label=f'ROC (AUC={roc_auc:.3f})')
plt.plot([0,1],[0,1],'k--')
plt.legend(); plt.grid(alpha=0.3)
plt.title('ROC Curve - IsolationForest')
plt.savefig('roc_curve_real.png', dpi=150, bbox_inches='tight')
plt.close()
print("[✓] roc_curve_real.png")

# ----- 5. 混淆矩阵 -----
cm = confusion_matrix(y_true, y_pred_binary)
ConfusionMatrixDisplay(cm, display_labels=['Normal','Laundering']).plot(cmap='Blues')
plt.title('Confusion Matrix - IsolationForest')
plt.savefig('confusion_matrix_real.png', dpi=150, bbox_inches='tight')
plt.close()
print("[✓] confusion_matrix_real.png")

# ----- 6. 特征重要性（代理：标准差） -----
importances = np.std(X, axis=0)
plt.figure(figsize=(10,6))
sns.barplot(x=importances, y=feature_cols)
plt.title('Feature Importance (Standard Deviation)')
plt.tight_layout()
plt.savefig('feature_importance.png', dpi=150)
plt.close()
print("[✓] feature_importance.png")

print("\n所有文件生成完毕。请将 risk_model.pkl 保留，并运行 generate_offline_charts.py 以获得完整图表。")