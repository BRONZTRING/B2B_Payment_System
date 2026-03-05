package utils

import (
	"b2b_backend/models"
	"fmt"
	"math/rand"
	"time"

	"gorm.io/gorm"
)

// SeedData 系统启动时自动注入 50 笔测试数据，驱动大屏仿真
func SeedData(db *gorm.DB) {
	// 1. 自动迁移，确保数据库表结构与最新的模型对齐
	err := db.AutoMigrate(&models.User{}, &models.Order{})
	if err != nil {
		fmt.Printf("数据库迁移失败: %v\n", err)
		return
	}

	var count int64
	db.Model(&models.Order{}).Count(&count)
	if count > 0 {
		fmt.Println("🚀 数据库已有数据，跳过 Seed 注入阶段。")
		return
	}

	fmt.Println("⏳ 正在注入 V11.0 种子数据 (共计50条)...")

	// 2. 创建测试买卖双方 (钱包地址使用本地 Anvil 的测试地址)
	buyer := models.User{
		Username:      "Global_Importer_A",
		PasswordHash:  "mock_hashed_pass",
		WalletAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // Anvil 账号 0
		Role:          "buyer",
	}
	seller := models.User{
		Username:      "China_Exporter_B",
		PasswordHash:  "mock_hashed_pass",
		WalletAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Anvil 账号 1
		Role:          "seller",
	}
	db.Create(&buyer)
	db.Create(&seller)

	r := rand.New(rand.NewSource(time.Now().UnixNano()))

	// 3. 注入 30 笔已完成的历史订单 (COMPLETED) - 营造财务流水稳定的假象
	for i := 1; i <= 30; i++ {
		order := models.Order{
			ID:          fmt.Sprintf("ORD-HIST-%03d", i),
			BuyerID:     buyer.ID,
			SellerID:    seller.ID,
			Amount:      float64(r.Intn(50000) + 10000), // 1万到6万 USD
			Status:      "COMPLETED",
			Origin:      "Shanghai, China",
			Destination: "Los Angeles, USA",
			CurrentLat:  34.0522,
			CurrentLng:  -118.2437,
			RiskScore:   r.Float64() * 0.2, // 风险低 (0.0~0.2)
			IsFlagged:   false,
			TxHash:      fmt.Sprintf("0xabc%d83f4e2...hist", i),
		}
		db.Create(&order)
	}

	// 4. 注入 10 笔在途订单 (SHIPPED) - 带全球经纬度，让 3D 地球动起来
	for i := 1; i <= 10; i++ {
		order := models.Order{
			ID:          fmt.Sprintf("ORD-SHIP-%03d", i),
			BuyerID:     buyer.ID,
			SellerID:    seller.ID,
			Amount:      float64(r.Intn(100000) + 50000),
			Status:      "SHIPPED",
			Origin:      "Shenzhen, China",
			Destination: "Rotterdam, Netherlands",
			// 随机生成大洋中间的坐标
			CurrentLat: 20.0 + r.Float64()*10.0,
			CurrentLng: 120.0 + r.Float64()*20.0,
			RiskScore:  r.Float64() * 0.3, // 风险低
			IsFlagged:  false,
			TxHash:     fmt.Sprintf("0xdef%d4a1b9c...ship", i),
		}
		db.Create(&order)
	}

	// 5. 注入 10 笔异常订单 (PAID 且高风险) - 供 AI 雷达图展示离群红点
	for i := 1; i <= 10; i++ {
		order := models.Order{
			ID:          fmt.Sprintf("ORD-RISK-%03d", i),
			BuyerID:     buyer.ID,
			SellerID:    seller.ID,
			Amount:      float64(r.Intn(500000) + 300000), // 巨额交易，触碰阈值
			Status:      "PAID",                           // 资金已在合约中，但被风控拦截
			Origin:      "Unknown",
			Destination: "High-Risk-Zone",
			CurrentLat:  0.0,
			CurrentLng:  0.0,
			RiskScore:   0.85 + r.Float64()*0.15, // 风险极高 (0.85~1.0)
			IsFlagged:   true,                    // 被 AI 熔断
			TxHash:      fmt.Sprintf("0xbad%dc2d3e4...risk", i),
		}
		db.Create(&order)
	}

	fmt.Println("✅ V11.0 种子数据 (50条) 注入大捷！上帝视角与AI雷达已有弹药库。")
}
