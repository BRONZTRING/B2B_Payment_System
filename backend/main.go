package main

import (
	"b2b_backend/controllers"
	"b2b_backend/initializers"
	"b2b_backend/models"
	"b2b_backend/utils"
	"fmt"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func init() {
	initializers.ConnectToDB()
}

func main() {
	r := GinRouter()

	// 自动迁移
	initializers.DB.AutoMigrate(&models.User{}, &models.Order{})
	fmt.Println("📦 Database Migration Completed!")

	// --- 核弹重置逻辑 ---
	// 手册要求: 在 Go 后端启动且 RUN_SEEDER=true 时, 强制执行 DB 清洗和数据注入
	if os.Getenv("RUN_SEEDER") == "true" {
		utils.NuclearReset()
	}
	// ------------------

	r.Run(":8080")
}

func GinRouter() *gin.Engine {
	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	r.GET("/health", func(c *gin.Context) {
		var userCount int64
		var orderCount int64
		initializers.DB.Model(&models.User{}).Count(&userCount)
		initializers.DB.Model(&models.Order{}).Count(&orderCount)

		c.JSON(200, gin.H{
			"status": "ok",
			"stats": gin.H{
				"users":  userCount,
				"orders": orderCount,
			},
		})
	})

	r.POST("/users", controllers.RegisterUser)

	return r
}
