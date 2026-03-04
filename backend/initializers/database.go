package initializers

import (
	"fmt"
	"log"
	"os"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func ConnectToDB() {
	var err error
	// 默认连接本地开发环境（Docker 暴露出的 5432 端口）
	dsn := os.Getenv("DB_DSN")
	if dsn == "" {
		dsn = "host=localhost user=user password=password dbname=b2b_payment_db port=5432 sslmode=disable TimeZone=Asia/Shanghai"
	}

	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	fmt.Println("🚀 Connected to PostgreSQL database successfully!")
}
