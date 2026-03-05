package models

import (
	"time"
)

// User 定义系统用户（买家/卖家）
type User struct {
	ID            uint   `gorm:"primaryKey"`
	Username      string `gorm:"uniqueIndex;not null"`
	PasswordHash  string `gorm:"not null"`
	WalletAddress string `gorm:"uniqueIndex;not null"` // Web3 钱包地址
	Role          string `gorm:"not null"`             // "buyer" 或 "seller"
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

// Order 定义B2B核心订单模型 (包含 V11.0 鲁棒性强化版所需的所有字段)
type Order struct {
	ID       string  `gorm:"primaryKey;type:varchar(50)"` // 订单ID，如 ORD-001
	BuyerID  uint    `gorm:"not null"`
	SellerID uint    `gorm:"not null"`
	Amount   float64 `gorm:"not null"`                   // 订单金额 (USD)
	Status   string  `gorm:"not null;default:'PENDING'"` // 状态机: PENDING, PAID, SHIPPED, COMPLETED, REFUNDED

	// 物流与地理坐标仿真字段 (用于前端 3D 地球展示)
	Origin      string  `gorm:"not null"` // 发货地 (如 "Shanghai, China")
	Destination string  `gorm:"not null"` // 目的地 (如 "Los Angeles, USA")
	CurrentLat  float64 // 当前纬度
	CurrentLng  float64 // 当前经度

	// AI 风控字段
	RiskScore float64 // 孤立森林 AI 评估的风险分数 (0.0 - 1.0)
	IsFlagged bool    `gorm:"default:false"` // 是否被 AI 标记为高风险拦截

	// 区块链数据同步字段
	TxHash string // 链上支付或完成的交易哈希

	CreatedAt time.Time
	UpdatedAt time.Time
}
