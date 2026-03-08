package utils

import (
	"b2b_backend/models"
	"fmt"

	"gorm.io/gorm"
)

func SeedData(db *gorm.DB) {
	var count int64
	db.Model(&models.User{}).Count(&count)

	// 如果数据库中已经有数据，则跳过播种，防止重复
	if count > 0 {
		return
	}

	fmt.Println("🌱 正在向数据库注入全球真实的跨国企业节点 (包含全球南方与新兴市场)...")

	// 我们使用 Anvil 默认提供的 100 个账户 (Index 0 到 99)
	users := []models.User{}

	// ==========================================
	// 🏭 供应商 (Sellers / Exporters) - 共 50 个 (Index 0-49)
	// ==========================================
	sellerConfigs := []struct {
		Region   string
		Currency string
		Count    int
		Names    []string
	}{
		{"China", "CNY", 15, []string{"Shenzhen Electronics Corp", "Guangzhou Textile Mills", "Dongguan Machinery", "Shanghai High-Tech Parts", "Zhejiang Hardware Co.", "Ningbo Auto Components", "Fujian Plastics", "Jiangsu Solar Tech", "Shandong Chemical", "Sichuan Heavy Industries", "Hebei Agri-Products", "Anhui Steel", "Hunan Lithium Corp", "Chengdu Microelectronics", "Wuhan Medical Supply"}},
		{"Europe", "EUR", 10, []string{"Munich Precision Engineering", "Berlin Industrial Supplier", "Milan Luxury Textiles", "Lyon Cosmetics Raw", "Frankfurt Auto Tech", "Stuttgart Chemical Group", "Barcelona Leather Exporters", "Rotterdam Maritime Parts", "Vienna Pharmaceuticals", "Stockholm Machining"}},
		{"Japan", "JPY", 5, []string{"Osaka Robotics Inc.", "Tokyo Auto Parts Exporters", "Kyoto Ceramics", "Nagoya Semiconductor", "Yokohama Heavy Steel"}},
		{"Russia", "RUB", 5, []string{"Siberian Timber Group", "Ural Metallurgy & Mining", "Moscow Tech Exports", "Kazan Machinery Plant", "Vladivostok Aerospace"}},
		{"South America", "USD", 5, []string{"São Paulo AgriCorp (Brazil)", "Santiago Copper Mining (Chile)", "Buenos Aires Beef Exporters (Argentina)", "Lima Lithium Extractors (Peru)", "Bogotá Coffee Cooperatives (Colombia)"}},
		{"Africa", "USD", 5, []string{"Johannesburg Gold & Minerals (RSA)", "Nairobi Agri-Exports (Kenya)", "Lagos Oil & Petrochemicals (Nigeria)", "Accra Cocoa Traders (Ghana)", "Casablanca Gold Mining (Morocco)"}},
		{"Oceania", "USD", 3, []string{"Perth Iron Ore Ltd (Australia)", "Auckland Dairy Exporters (NZ)", "Brisbane Coal Group (Australia)"}},
		{"Middle East", "USD", 2, []string{"Dubai Petrochemical Dist.", "Riyadh Plastics Manufacturing"}},
	}

	accountIndex := 0

	for _, config := range sellerConfigs {
		for i := 0; i < config.Count; i++ {
			users = append(users, models.User{
				CompanyName:  config.Names[i],
				Role:         "seller",
				AccountIndex: accountIndex,
				FiatCurrency: config.Currency,
				BankAccount:  fmt.Sprintf("%s-BANK-%d", config.Currency, 1000000+accountIndex),
				HealthStatus: "ACTIVE",
			})
			accountIndex++
		}
	}

	// ==========================================
	// 🛒 采购商 (Buyers / Importers) - 共 50 个 (Index 50-99)
	// ==========================================
	buyerConfigs := []struct {
		Region   string
		Currency string
		Count    int
		Names    []string
	}{
		{"North America", "USD", 15, []string{"NY Global LLC Sourcing", "Texas Agri-Imports", "California Tech Assemblers", "Chicago Consumer Retail", "Toronto Hardware Importers", "Seattle Medical Procurement", "Miami Shipping Logistics", "Boston Aerospace Supply", "Atlanta Wholesale Group", "Denver Electronics Hub", "Vancouver Retail Imports", "Detroit Raw Materials", "Houston Auto Assembly", "Phoenix Solar Installers", "Montreal Trade Co."}},
		{"Europe", "EUR", 15, []string{"London Electronics Dist.", "Paris Fashion Retail Group", "Madrid Consumer Goods", "Rome Infrastructure Corp", "Amsterdam Port Traders", "Brussels Tech Imports", "Warsaw Medical Devices", "Prague Heavy Machinery", "Zurich Retail Supply", "Copenhagen Luxury Imports", "Dublin Agri-Foods", "Helsinki Shipping Procure", "Oslo Tech Wholesalers", "Lisbon Pharma Imports", "Budapest Industrial Group"}},
		{"China", "CNY", 5, []string{"Beijing Resource Importers", "Shanghai Global Sourcing", "Shenzhen Innovation Procurement", "Guangzhou Consumer Tech", "Tianjin Mineral Buyers"}},
		{"Japan", "JPY", 5, []string{"Tokyo Retail Imports", "Osaka Seafood Sourcing", "Kyoto Tech Distributors", "Fukuoka Energy Imports", "Sapporo General Trading"}},
		{"Russia", "RUB", 3, []string{"Moscow Infrastructure Imports", "St. Petersburg Tech Sourcing", "Volga Trade Importer"}},
		{"South America", "USD", 3, []string{"Buenos Aires Tech Distributors", "São Paulo Machinery Importers", "Santiago Consumer Group"}},
		{"Africa", "USD", 2, []string{"Lagos Infrastructure Group", "Cape Town Tech Retail"}},
		{"Oceania", "USD", 2, []string{"Sydney Consumer Goods", "Melbourne Construction Sourcing"}},
	}

	for _, config := range buyerConfigs {
		for i := 0; i < config.Count; i++ {
			// 给少数采购商增加点合规趣味性，例如随机将少数设为受限
			status := "ACTIVE"
			if config.Names[i] == "Moscow Infrastructure Imports" || config.Names[i] == "Dubai Petrochemical Dist." {
				// 为了让大屏有故事可讲，我们默认就不锁定了，交给 AI 去动态抓捕即可
				status = "ACTIVE"
			}

			users = append(users, models.User{
				CompanyName:  config.Names[i],
				Role:         "buyer",
				AccountIndex: accountIndex,
				FiatCurrency: config.Currency,
				BankAccount:  fmt.Sprintf("%s-BANK-%d", config.Currency, 1000000+accountIndex),
				HealthStatus: status,
			})
			accountIndex++
		}
	}

	result := db.Create(&users)
	if result.Error != nil {
		fmt.Println("❌ 播种数据失败:", result.Error)
	} else {
		fmt.Printf("✅ 成功完成全球拓扑初始化: 注入了 %d 个跨国企业实体！\n", len(users))
	}
}
