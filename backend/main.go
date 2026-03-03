package main

import (
	"log"
	"net/http"
	"os"

	"b2b_backend/controllers"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/rs/cors"
)

func main() {
	if err := godotenv.Load("../.env"); err != nil {
		log.Println("Warning: No .env file found")
	}

	// 1. 初始化数据库 (SQLite)
	InitDatabase()
	// 把 DB 实例传给 Controller
	controllers.SetDB(DB)

	r := gin.Default()

	// 2. CORS 配置
	corsConfig := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "OPTIONS"}, // 增加了 PUT
		AllowedHeaders:   []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	})

	r.Use(func(c *gin.Context) {
		handler := corsConfig.Handler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			c.Next()
		}))
		handler.ServeHTTP(c.Writer, c.Request)
	})

	// 3. 路由组
	api := r.Group("/api")
	{
		api.GET("/ping", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "pong"})
		})

		// 核心业务
		api.POST("/orders/sign", controllers.CreateOrder)       // 申请签名
		api.POST("/orders/sync", controllers.SyncOrder)         // 上链后同步
		api.GET("/orders", controllers.GetOrders)               // 查询列表
		api.PUT("/orders/:id/status", controllers.UpdateStatus) // 更新状态 (发货)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🚀 B2B Platform Backend running on port %s", port)
	r.Run(":" + port)
}
