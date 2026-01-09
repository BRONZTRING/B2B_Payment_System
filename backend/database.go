package main

import (
	"fmt"
	"log"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// 定义全局数据库变量
var DB *gorm.DB

// 定义订单模型
type Order struct {
	gorm.Model
	Buyer     string `json:"buyer"`
	Seller    string `json:"seller"`
	Amount    string `json:"amount"`
	Currency  string `json:"currency"`
	Status    string `json:"status"`
	GoodsHash string `json:"goods_hash"`
}

func InitDB() {
	// 数据库连接配置
	// 注意：这里使用的是 docker-compose.yml 里配置的用户名(user)和密码(password)
	dsn := "host=localhost user=user password=password dbname=b2b_payment_db port=5432 sslmode=disable TimeZone=Asia/Shanghai"

	var err error
	// 连接数据库
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("❌ 数据库连接失败: ", err)
	}

	sqlDB, err := DB.DB()
	if err != nil {
		log.Fatal("❌ 获取数据库实例失败: ", err)
	}

	// 设置连接池
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)

	// 自动迁移 (自动建表)
	err = DB.AutoMigrate(&Order{})
	if err != nil {
		log.Fatal("❌ 自动建表失败: ", err)
	}

	fmt.Println("✅ 数据库连接成功！表结构已自动创建。")
}
