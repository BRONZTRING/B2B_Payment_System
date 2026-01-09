package main

import (
	"crypto/sha256"
	"encoding/hex"
	"net/http"

	"github.com/gin-gonic/gin"
)

// 定义前端传过来的请求格式
type CreateOrderRequest struct {
	Buyer    string `json:"buyer"`
	Seller   string `json:"seller"`
	Amount   string `json:"amount"`
	Currency string `json:"currency"`
	Goods    string `json:"goods"` // ⚠️ 敏感信息：货物描述 (如 "iPhone 15")
}

func main() {
	InitDB() // 连接数据库

	r := gin.Default()

	// 1. 查询订单 (GET)
	r.GET("/orders", func(c *gin.Context) {
		var orders []Order
		DB.Find(&orders)
		c.JSON(http.StatusOK, gin.H{"count": len(orders), "data": orders})
	})

	// 2. 创建订单 (POST) - 【核心：隐私哈希】
	r.POST("/orders", func(c *gin.Context) {
		var req CreateOrderRequest
		// 解析前端传来的 JSON
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// === 学术亮点：计算隐私哈希 ===
		// 我们不希望明文的 "Goods" 直接暴露给外界，所以计算它的 SHA-256 哈希
		hash := sha256.Sum256([]byte(req.Goods))
		hashString := "0x" + hex.EncodeToString(hash[:]) // 转成 0x 开头的十六进制字符串

		// 构造数据库对象
		newOrder := Order{
			Buyer:     req.Buyer,
			Seller:    req.Seller,
			Amount:    req.Amount,
			Currency:  req.Currency,
			Status:    "PENDING",  // 初始状态
			GoodsHash: hashString, // 存入哈希值
		}

		// 存入数据库
		result := DB.Create(&newOrder)
		if result.Error != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
			return
		}

		// 返回成功信息
		c.JSON(http.StatusOK, gin.H{
			"message":      "订单创建成功",
			"order_id":     newOrder.ID,
			"privacy_hash": hashString, // 返回哈希给前端，用于后续上链
		})
	})

	r.Run(":8080")
}
