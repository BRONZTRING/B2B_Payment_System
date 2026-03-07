package main

import (
	"b2b_backend/controllers"
	"b2b_backend/initializers"
	"b2b_backend/utils"
	"fmt"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func init() {
	godotenv.Load()
	initializers.ConnectDatabase()
}

func main() {
	utils.SeedData(initializers.DB)
	controllers.StartOracleDaemon()

	r := gin.Default()
	r.Use(cors.New(cors.Config{
		AllowAllOrigins:  true,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	api := r.Group("/api")
	{
		api.GET("/ping", controllers.Ping)
		api.GET("/users", controllers.GetUsers)
		api.PUT("/users/:id/unlock", controllers.UnlockUser)
		api.GET("/oracle", controllers.GetOracleData)

		api.GET("/orders", controllers.GetOrders)
		api.POST("/orders", controllers.CreateOrder)
		api.PUT("/orders/:id/status", controllers.UpdateOrderStatus)
		api.PUT("/orders/:id/finance", controllers.FinanceOrder) // 新增：供应链保理接口
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	fmt.Printf("🚀 后端启动 | 端口: %s\n", port)
	r.Run(":" + port)
}
