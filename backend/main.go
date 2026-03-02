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
	// 1. 加载环境变量 (.env 在项目根目录)
	// 注意：我们在 backend 目录下运行，所以路径是 ../.env
	if err := godotenv.Load("../.env"); err != nil {
		log.Println("Warning: No .env file found, relying on system environment variables")
	}

	// 2. 初始化 Gin 引擎
	r := gin.Default()

	// 3. 配置 CORS (跨域资源共享) - 允许前端访问后端
	// 这是前后端分离架构必须的，否则前端浏览器会拦截请求
	corsConfig := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000"}, // 允许前端地址
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	})

	// 将 CORS 中间件包装给 Gin 使用
	r.Use(func(c *gin.Context) {
		handler := corsConfig.Handler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			c.Next()
		}))
		handler.ServeHTTP(c.Writer, c.Request)
	})

	// 4. 定义路由 (Routes)
	api := r.Group("/api")
	{
		// 健康检查接口
		api.GET("/ping", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "pong", "system": "B2B_Payment_Risk_Control"})
		})

		// 核心业务接口: 创建订单 (含 AI 风控签名)
		api.POST("/orders", controllers.CreateOrder)
	}

	// 5. 启动服务 (监听 8080 端口)
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🚀 Risk Control Backend running on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
