package main

import (
	"log"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// OrderModel 定义数据库表结构
// 这就是我们在后台"账本"里存的数据
type OrderModel struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	OrderId   int64     `json:"order_id"` // 链上对应的 OrderID (合约生成)
	Buyer     string    `json:"buyer"`
	Seller    string    `json:"seller"`
	Amount    string    `json:"amount"`
	Goods     string    `json:"goods"`
	Status    string    `json:"status"` // PENDING, SHIPPED, COMPLETED, DISPUTED
	TxHash    string    `json:"tx_hash"`
	CreatedAt time.Time `json:"created_at"`
}

var DB *gorm.DB

func InitDatabase() {
	var err error
	// 会在 backend 目录下生成一个 b2b.db 文件
	DB, err = gorm.Open(sqlite.Open("b2b.db"), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// 自动迁移模式：自动创建表
	DB.AutoMigrate(&OrderModel{})
	log.Println("📚 Database initialized (SQLite)")
}
