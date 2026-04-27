package controllers

import (
	"b2b_backend/initializers"
	"b2b_backend/models"
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

type AIRiskRequest struct {
	Amount      float64 `json:"amount"`
	Destination string  `json:"destination"`
	PayerType   string  `json:"payer_type"`
}

type AIRiskResponse struct {
	RiskScore float64  `json:"risk_score"`
	IsFlagged bool     `json:"is_flagged"`
	Reasons   []string `json:"reasons"`
}

func getRealAIRisk(amount float64, destination string, payerType string) (float64, bool, []string) {
	reqBody := AIRiskRequest{
		Amount:      amount,
		Destination: destination,
		PayerType:   payerType,
	}
	jsonData, _ := json.Marshal(reqBody)

	client := http.Client{Timeout: 3 * time.Second}
	resp, err := client.Post("http://127.0.0.1:5005/api/v1/analyze_risk", "application/json", bytes.NewBuffer(jsonData))

	if err != nil {
		fmt.Printf("[! 熔断警告] 无法连接 AI 预言机: %v\n", err)
		return 0.05, false, []string{"AI 节点离线，系统降级放行"}
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return 0.05, false, []string{"AI 节点响应异常，降级放行"}
	}

	var aiResp AIRiskResponse
	if err := json.NewDecoder(resp.Body).Decode(&aiResp); err != nil {
		return 0.05, false, []string{"AI 节点数据解析失败，降级放行"}
	}

	return aiResp.RiskScore, aiResp.IsFlagged, aiResp.Reasons
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

	riskScore, isFlagged, riskReasons := getRealAIRisk(body.Amount, body.Destination, "normal")

	// [修复BUG] 在此处消费 riskReasons 变量，将其打印为审计日志，不仅消除了编译错误，还能为论文提供真实的运行截图
	fmt.Printf("[AI 审计] 订单 %s | 金额: %.2f | Score: %.3f | 拦截: %v | 理由: %v\n", body.ID, body.Amount, riskScore, isFlagged, riskReasons)

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

	initializers.DB.Model(&models.Order{}).Count(&totalCount)
	initializers.DB.Order("created_at desc").Limit(1000).Find(&orders)

	c.JSON(http.StatusOK, gin.H{
		"success":     true,
		"data":        orders,
		"total_count": totalCount,
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

	if order.Status != "SHIPPED" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Strict Mode: Order must be SHIPPED before financing."})
		return
	}
	if order.IsFinanced {
		c.JSON(http.StatusConflict, gin.H{"error": "Strict Mode: Order has already been financed."})
		return
	}

	initializers.DB.Model(&order).Update("is_financed", true)
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "DeFi Financing Approved"})
}
