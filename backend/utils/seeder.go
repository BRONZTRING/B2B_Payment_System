package utils

import (
	"b2b_backend/models"
	"fmt"
	"math/rand"
	"time"

	"gorm.io/gorm"
)

func SeedData(db *gorm.DB) {
	err := db.AutoMigrate(&models.User{}, &models.Order{})
	if err != nil {
		fmt.Printf("数据库迁移失败: %v\n", err)
		return
	}

	var count int64
	db.Model(&models.User{}).Count(&count)
	if count > 0 {
		return
	}

	fmt.Println("⏳ 正在生成 100 个真实自然语言跨国企业账号 (全球化买卖网络)...")
	r := rand.New(rand.NewSource(time.Now().UnixNano()))

	regions := []struct{ Prefix, Currency string }{
		{"Volga Trade", "RUB"}, {"Moscow Heavy Ind.", "RUB"}, {"Siberian Tech", "RUB"},
		{"London General", "GBP"}, {"Oxford Textiles", "GBP"},
		{"Bavaria Auto", "EUR"}, {"Paris Luxury", "EUR"}, {"Berlin Industrial", "EUR"},
		{"Tokyo Electronics", "JPY"}, {"Osaka Parts", "JPY"},
		{"Texas Tech", "USD"}, {"NY Global LLC", "USD"}, {"California Cyber", "USD"},
		{"Shenzhen Innovation", "CNY"}, {"Guangzhou Manufacturing", "CNY"}, {"Shanghai Trade", "CNY"},
	}
	buyerSuffixes := []string{"Importer", "Procurement", "Buyer Group", "Sourcing"}
	sellerSuffixes := []string{"Supplier", "Exporter", "Factory", "Manufacturing"}

	for i := 0; i < 50; i++ {
		region := regions[i%len(regions)]
		db.Create(&models.User{
			CompanyName: fmt.Sprintf("%s %s %03d", region.Prefix, buyerSuffixes[i%len(buyerSuffixes)], i+1),
			Role:        "buyer", AccountIndex: i, FiatCurrency: region.Currency,
			BankAccount:  fmt.Sprintf("%s-BANK-%08d", region.Currency, r.Intn(99999999)),
			HealthStatus: "ACTIVE", // 初始状态均为健康
		})
	}

	for i := 0; i < 50; i++ {
		region := regions[(i+3)%len(regions)]
		db.Create(&models.User{
			CompanyName: fmt.Sprintf("%s %s %03d", region.Prefix, sellerSuffixes[i%len(sellerSuffixes)], i+1),
			Role:        "seller", AccountIndex: i + 50, FiatCurrency: region.Currency,
			BankAccount:  fmt.Sprintf("%s-BANK-%08d", region.Currency, r.Intn(99999999)),
			HealthStatus: "ACTIVE",
		})
	}
	fmt.Println("✅ 100 个带有健康度监控的企业网络生成完毕！")
}
