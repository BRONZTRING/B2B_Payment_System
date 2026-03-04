package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// User 用户模型
type User struct {
	ID            uint   `gorm:"primaryKey"`
	WalletAddress string `gorm:"uniqueIndex;not null"`
	Role          string `gorm:"not null"` // "BUYER" or "SELLER"
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

// Order 订单模型
type Order struct {
	ID            string  `gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	Amount        float64 `gorm:"not null"`
	Currency      string  `gorm:"default:'USDT'"`
	Status        string  `gorm:"index;default:'CREATED'"`
	BuyerAddress  string  `gorm:"index"`
	SellerAddress string  `gorm:"index"`
	TxHash        string  `gorm:"default:''"`
	RiskScore     float64 `gorm:"default:0"`
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

// BeforeCreate 钩子：创建前自动生成 UUID
func (o *Order) BeforeCreate(tx *gorm.DB) (err error) {
	if o.ID == "" {
		o.ID = uuid.New().String()
	}
	return
}
