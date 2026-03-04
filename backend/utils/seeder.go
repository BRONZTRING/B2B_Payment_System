package utils

import (
	"b2b_backend/initializers"
	"b2b_backend/models"
	"fmt"
	"log"
	"math/rand"
	"time"

	"github.com/google/uuid"
)

// NuclearReset 执行核弹级重置：清空数据库并注入种子数据
func NuclearReset() {
	fmt.Println("☢️  INITIATING NUCLEAR RESET...")

	// 1. 清洗数据库 (TRUNCATE)
	// 使用 GORM 的 Exec 执行原生 SQL，确保清理彻底
	if err := initializers.DB.Exec("TRUNCATE TABLE users, orders RESTART IDENTITY CASCADE").Error; err != nil {
		log.Printf("⚠️ Failed to truncate tables: %v", err)
		// 如果 TRUNCATE 失败（比如表不存在），尝试自动迁移后再继续
	}

	// 2. 重新注入种子数据
	seedUsers()
	seedOrders()

	fmt.Println("✅ NUCLEAR RESET COMPLETED: System is fresh and seeded.")
}

func seedUsers() {
	users := []models.User{
		{WalletAddress: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266", Role: "BUYER"}, // Anvil 默认账户
		{WalletAddress: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8", Role: "SELLER"},
	}
	initializers.DB.Create(&users)
	fmt.Println("🌱 Seeded 2 Users")
}

func seedOrders() {
	var orders []models.Order

	// 3.1 30笔历史订单 (COMPLETED)
	for i := 0; i < 30; i++ {
		orders = append(orders, models.Order{
			ID:            uuid.New().String(),
			Amount:        float64(rand.Intn(5000) + 100),
			Currency:      "USDT",
			Status:        "COMPLETED",
			BuyerAddress:  "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
			SellerAddress: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
			RiskScore:     float64(rand.Intn(10)),                   // 低风险
			CreatedAt:     time.Now().AddDate(0, 0, -rand.Intn(30)), // 过去30天
		})
	}

	// 3.2 10笔在途订单 (SHIPPED)
	for i := 0; i < 10; i++ {
		orders = append(orders, models.Order{
			ID:            uuid.New().String(),
			Amount:        float64(rand.Intn(10000) + 5000),
			Currency:      "USDT",
			Status:        "SHIPPED",
			BuyerAddress:  "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
			SellerAddress: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
			RiskScore:     float64(rand.Intn(20)),
			CreatedAt:     time.Now().Add(-time.Hour * time.Duration(rand.Intn(48))),
		})
	}

	// 3.3 10笔异常订单 (RISK_ALERT)
	for i := 0; i < 10; i++ {
		orders = append(orders, models.Order{
			ID:            uuid.New().String(),
			Amount:        float64(rand.Intn(50000) + 10000), // 大额
			Currency:      "USDT",
			Status:        "RISK_ALERT",
			BuyerAddress:  "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
			SellerAddress: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
			RiskScore:     float64(rand.Intn(40) + 60), // 高风险 > 60
			CreatedAt:     time.Now(),
		})
	}

	initializers.DB.Create(&orders)
	fmt.Println("🌱 Seeded 50 Orders (30 Completed, 10 Shipped, 10 Risk)")
}
