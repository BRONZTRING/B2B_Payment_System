package main

import (
	"log"
	"net/http"
	"os"

	"b2b_backend/controllers"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/rs/cors"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func main() {
	// 1. 加载环境变量 (.env)
	if err := godotenv.Load("../.env"); err != nil {
		log.Println("Warning: No .env file found in root, using system env variables")
	}

	// 2. 初始化 SQLite 数据库 (自动创建 b2b_ledger.db 文件)
	db, err := gorm.Open(sqlite.Open("b2b_ledger.db"), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// 自动迁移表结构：如果没有表，会自动根据 Order 结构体建表
	db.AutoMigrate(&controllers.Order{})
	log.Println("📚 Database connected and migrated (SQLite: b2b_ledger.db)")

	// 将数据库实例注入到控制器中
	controllers.SetDB(db)

	// 3. 配置 Gin 路由框架与 CORS (解决跨域问题)
	r := gin.Default()

	corsConfig := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "OPTIONS"},
		AllowedHeaders:   []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	})
	r.Use(func(c *gin.Context) {
		handler := corsConfig.Handler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			c.Next()
		}))
		handler.ServeHTTP(c.Writer, c.Request)
	})

	// 4. 注册 API 路由
	api := r.Group("/api")
	{
		api.GET("/ping", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"msg": "pong"}) })

		// 核心业务流转 API
		api.POST("/orders", controllers.CreateOrder)                 // 1. 买家下单并获取风控签名
		api.POST("/orders/sync", controllers.SyncChainStatus)        // 2. 买家上链成功后，同步状态为 PAID
		api.GET("/orders", controllers.GetOrders)                    // 3. 买家/卖家获取自己的订单列表
		api.PUT("/orders/:id/status", controllers.UpdateOrderStatus) // 4. 卖家发货/买家收货，更新状态
	}

	// 5. 启动服务
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("🚀 B2B Backend Engine running on port %s", port)
	r.Run(":" + port)
}
