package controllers

import (
	"b2b_backend/initializers"
	"b2b_backend/models"
	"math/rand"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func calculateRiskScore(amount float64, destination string) float64 {
	baseScore := rand.Float64() * 0.4
	if strings.Contains(destination, "Sanctioned") || strings.Contains(destination, "Dark Web") || strings.Contains(destination, "High Risk") {
		baseScore += 0.55
	}
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

	riskScore := calculateRiskScore(body.Amount, body.Destination)
	isFlagged := riskScore >= 0.80

	status := "PAID"
	if body.PaymentType == "DIRECT" {
		status = "COMPLETED"
	}
	if isFlagged {
		status = "BLOCKED_BY_AI"
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
	var totalCount int64

	// 🌟 终极改造：精准统计底座真实的物理数据量
	initializers.DB.Model(&models.Order{}).Count(&totalCount)

	// UI 依然只拉取最新 1000 条，保护浏览器内存
	initializers.DB.Order("created_at desc").Limit(1000).Find(&orders)

	c.JSON(http.StatusOK, gin.H{
		"success":     true,
		"data":        orders,
		"total_count": totalCount, // 暴露给前端算 TPS
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
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Status updated"})
}

func FinanceOrder(c *gin.Context) {
	id := c.Param("id")
	var order models.Order
	if err := initializers.DB.Where("id = ?", id).First(&order).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}
	initializers.DB.Model(&order).Update("is_financed", true)
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "DeFi Financing Approved"})
}
