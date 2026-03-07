package initializers

import (
	"b2b_backend/models"
	"log"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func ConnectDatabase() {
	var err error
	// 连接 SQLite，并静音繁琐的默认 SQL 日志
	DB, err = gorm.Open(sqlite.Open("b2b_ledger.db"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})

	if err != nil {
		log.Fatal("❌ 数据库连接失败: ", err)
	}

	// 自动同步 V11.0 模型
	DB.AutoMigrate(&models.User{}, &models.Order{})
	log.Println("✅ 数据库连接成功并完成模型同步")
}
