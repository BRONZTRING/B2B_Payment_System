package controllers

import (
	"b2b_backend/initializers"
	"b2b_backend/models"
	"math/rand"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// 模拟极其复杂的 AI 孤立森林特征评估打分引擎
func calculateRiskScore(amount float64, destination string) float64 {
	baseScore := rand.Float64() * 0.4 // 基础底噪

	// 1. 地缘政治特征归因
	if strings.Contains(destination, "Sanctioned") || strings.Contains(destination, "Dark Web") || strings.Contains(destination, "High Risk") {
		baseScore += 0.55
	}
	// 2. 资金异常特征归因 (巨额出逃)
	if amount > 200000 {
		baseScore += 0.35
	}

	if baseScore > 0.99 {
		return 0.99
	}
	return baseScore
}

func CreateOrder(c *gin.Context) {
	var body struct {
		ID          string  `json:"id"`
		BuyerID     uint    `json:"buyer_id"`
		SellerID    uint    `json:"seller_id"`
		PaymentType string  `json:"payment_type"`
		Amount      float64 `json:"amount"`
		FiatAmount  float64 `json:"fiat_amount"`
		Currency    string  `json:"currency"`
		Origin      string  `json:"origin"`
		Destination string  `json:"destination"`
		TxHash      string  `json:"txHash"`
	}

	if err := c.BindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read body"})
		return
	}

	// 调用 AI 引擎计算风险分
	riskScore := calculateRiskScore(body.Amount, body.Destination)
	isFlagged := riskScore >= 0.80

	status := "PAID"
	if body.PaymentType == "DIRECT" {
		status = "COMPLETED" // 直汇直接完成
	}

	// =========================================================================
	// 🌟 终极策略调整：只封交易，不封账号 (Transaction-level Interception)
	// =========================================================================
	if isFlagged {
		status = "BLOCKED_BY_AI" // 交易被拦截，但不再修改买家的 HealthStatus
	}

	order := models.Order{
		ID:          body.ID,
		BuyerID:     body.BuyerID,
		SellerID:    body.SellerID,
		PaymentType: body.PaymentType,
		Amount:      body.Amount,
		FiatAmount:  body.FiatAmount,
		Currency:    body.Currency,
		Origin:      body.Origin,
		Destination: body.Destination,
		TxHash:      body.TxHash,
		RiskScore:   riskScore,
		IsFlagged:   isFlagged,
		Status:      status,
		IsFinanced:  false,
	}

	initializers.DB.Create(&order)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    order,
	})
}

func GetOrders(c *gin.Context) {
	var orders []models.Order
	// 倒序查询，限制拉取最新1000条，保障接口性能
	initializers.DB.Order("created_at desc").Limit(1000).Find(&orders)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    orders,
	})
}

func UpdateOrderStatus(c *gin.Context) {
	id := c.Param("id")
	var body struct {
		Status string `json:"status"`
	}
	if err := c.BindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	var order models.Order
	if err := initializers.DB.Where("id = ?", id).First(&order).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	initializers.DB.Model(&order).Update("status", body.Status)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Status updated",
	})
}

// 【修复】：函数名改回 FinanceOrder 匹配 main.go 的路由
func FinanceOrder(c *gin.Context) {
	id := c.Param("id")
	var order models.Order
	if err := initializers.DB.Where("id = ?", id).First(&order).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	initializers.DB.Model(&order).Update("is_financed", true)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "DeFi Financing Approved",
	})
}
