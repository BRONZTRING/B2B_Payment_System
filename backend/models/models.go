package models

import (
	"time"
)

type User struct {
	ID           uint   `gorm:"primaryKey"`
	CompanyName  string `gorm:"uniqueIndex;not null"`
	Role         string `gorm:"not null"`
	AccountIndex int    `gorm:"not null"`
	FiatCurrency string `gorm:"not null;default:'USD'"`
	BankAccount  string `gorm:"not null"`
	HealthStatus string `gorm:"not null;default:'ACTIVE'"`
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type Order struct {
	ID             string  `gorm:"primaryKey;type:varchar(50)"`
	BuyerID        uint    `gorm:"not null"`
	SellerID       uint    `gorm:"not null"`
	PaymentType    string  `gorm:"not null;default:'ESCROW'"`
	Amount         float64 `gorm:"not null"`
	FiatAmount     float64 `gorm:"not null"`
	Currency       string  `gorm:"not null;default:'BUSD'"`
	Status         string  `gorm:"not null;default:'PENDING'"`
	Origin         string  `gorm:"not null"`
	Destination    string  `gorm:"not null"`
	CurrentLat     float64
	CurrentLng     float64
	LogisticsRoute string `gorm:"type:text"`
	RiskScore      float64
	IsFlagged      bool `gorm:"default:false"`
	IsFinanced     bool `gorm:"default:false"` // 新增：记录订单是否已质押放款
	TxHash         string
	CreatedAt      time.Time
	UpdatedAt      time.Time
}
