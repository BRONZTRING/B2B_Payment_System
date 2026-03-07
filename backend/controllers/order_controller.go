package controllers

import (
	"b2b_backend/initializers"
	"b2b_backend/models"
	"bytes"
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

func GetOrders(c *gin.Context) {
	var orders []models.Order
	initializers.DB.Order("created_at desc").Find(&orders)
	c.JSON(http.StatusOK, gin.H{"success": true, "data": orders})
}

type CreateOrderInput struct {
	ID          string  `json:"id" binding:"required"`
	BuyerID     uint    `json:"buyer_id" binding:"required"`
	SellerID    uint    `json:"seller_id" binding:"required"`
	PaymentType string  `json:"payment_type" binding:"required"`
	Amount      float64 `json:"amount" binding:"required"`
	FiatAmount  float64 `json:"fiat_amount"`
	Currency    string  `json:"currency"`
	Origin      string  `json:"origin"`
	Destination string  `json:"destination"`
	TxHash      string  `json:"txHash" binding:"required"`
}

type AIResponse struct {
	RiskScore float64 `json:"risk_score"`
	IsFlagged bool    `json:"is_flagged"`
}

func CreateOrder(c *gin.Context) {
	var input CreateOrderInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	riskScore := 0.10
	isFlagged := false

	if input.PaymentType == "ESCROW" {
		aiPayload := map[string]interface{}{"amount": input.Amount, "origin": input.Origin, "destination": input.Destination}
		payloadBytes, _ := json.Marshal(aiPayload)

		ctx, cancel := context.WithTimeout(context.Background(), 800*time.Millisecond)
		defer cancel()

		req, _ := http.NewRequestWithContext(ctx, "POST", "http://127.0.0.1:8000/predict", bytes.NewBuffer(payloadBytes))
		req.Header.Set("Content-Type", "application/json")
		client := &http.Client{}
		resp, err := client.Do(req)

		if err == nil {
			defer resp.Body.Close()
			if resp.StatusCode == http.StatusOK {
				var aiResult AIResponse
				if err := json.NewDecoder(resp.Body).Decode(&aiResult); err == nil {
					riskScore = aiResult.RiskScore
					isFlagged = aiResult.IsFlagged
				}
			}
		}
	}

	// 【V13 核心】：动态风控联动。如果 AI 判定此单有问题，立刻将该用户拉黑！
	if isFlagged {
		log.Printf("🚨 触发反洗钱风控！买家 ID [%d] 发起异常巨额资金，系统将其账户降级为 RESTRICTED", input.BuyerID)
		initializers.DB.Model(&models.User{}).Where("id = ?", input.BuyerID).Update("health_status", "RESTRICTED")
	}

	initialStatus := "PAID"
	if input.PaymentType == "DIRECT" {
		initialStatus = "COMPLETED"
	}

	newOrder := models.Order{
		ID: input.ID, BuyerID: input.BuyerID, SellerID: input.SellerID,
		PaymentType: input.PaymentType, Amount: input.Amount, FiatAmount: input.FiatAmount,
		Currency: input.Currency, Status: initialStatus, Origin: input.Origin, Destination: input.Destination,
		RiskScore: riskScore, IsFlagged: isFlagged, TxHash: input.TxHash,
	}
	initializers.DB.Create(&newOrder)

	c.JSON(http.StatusOK, gin.H{"success": true, "data": newOrder})
}

type UpdateOrderStatusInput struct {
	Status string `json:"status" binding:"required"`
}

func generateMockRoute(origin, dest string) string {
	now := time.Now()
	route := []map[string]interface{}{
		{"node": origin + " (发货港)", "status": "已揽收/报关", "time": now.Add(-48 * time.Hour).Format("2006-01-02 15:04")},
		{"node": "PSA Singapore (新加坡中转)", "status": "集装箱装船中", "time": now.Add(-24 * time.Hour).Format("2006-01-02 15:04")},
		{"node": "Suez Canal (苏伊士运河)", "status": "海上航行中", "time": now.Format("2006-01-02 15:04")},
		{"node": "Port of Rotterdam (鹿特丹枢纽)", "status": "排队清关", "time": "预计 " + now.Add(48*time.Hour).Format("01-02 15:04")},
		{"node": dest + " (目的地)", "status": "等待末端派送", "time": "预计 " + now.Add(120*time.Hour).Format("01-02 15:04")},
	}
	b, _ := json.Marshal(route)
	return string(b)
}

func UpdateOrderStatus(c *gin.Context) {
	orderID := c.Param("id")
	var input UpdateOrderStatusInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updateData := map[string]interface{}{"status": input.Status}

	if input.Status == "SHIPPED" {
		var order models.Order
		initializers.DB.Where("id = ?", orderID).First(&order)
		if order.ID != "" {
			updateData["logistics_route"] = generateMockRoute(order.Origin, order.Destination)
		}
	}

	result := initializers.DB.Model(&models.Order{}).Where("id = ?", orderID).Updates(updateData)
	if result.Error != nil || result.RowsAffected == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "状态更新失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// 【新增】处理前端发来的订单保理垫资请求
func FinanceOrder(c *gin.Context) {
	orderID := c.Param("id")

	// 更新数据库，将订单标记为已保理
	result := initializers.DB.Model(&models.Order{}).Where("id = ?", orderID).Update("is_financed", true)

	if result.Error != nil || result.RowsAffected == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保理状态更新失败或订单不存在"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "订单质押保理成功"})
}
