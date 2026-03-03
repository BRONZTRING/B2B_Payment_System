package controllers

import (
	"crypto/sha256"
	"fmt"
	"math/big"
	"net/http"
	"os"
	"time"

	"b2b_backend/utils"

	"github.com/ethereum/go-ethereum/common"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// 1. 核心账本模型 (对应数据库中的 orders 表)
type Order struct {
	ID              string    `gorm:"primaryKey" json:"id"`
	ContractOrderId int64     `json:"contract_order_id"` // 链上生成的 ID
	BuyerAddr       string    `json:"buyer_addr"`        // 买家隐形钱包地址
	SellerAddr      string    `json:"seller_addr"`       // 卖家隐形钱包地址
	Token           string    `json:"token"`
	Amount          string    `json:"amount"`
	GoodsContent    string    `json:"goods_content"` // 货物明文 (离线隐私保护)
	GoodsHash       string    `json:"goods_hash"`    // 货物哈希 (上链存证)
	Status          string    `json:"status"`        // PENDING, PAID, SHIPPED, COMPLETED
	LogisticsId     string    `json:"logistics_id"`  // 物流追踪号
	TxHash          string    `json:"tx_hash"`       // 上链交易 Hash
	RiskScore       float64   `json:"risk_score"`    // AI 风控得分
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

var db *gorm.DB

// SetDB 注入数据库实例
func SetDB(database *gorm.DB) {
	db = database
}

// 接收前端的下单结构体
type CreateOrderRequest struct {
	Buyer        string `json:"buyer" binding:"required"`
	Seller       string `json:"seller" binding:"required"`
	TokenAddress string `json:"token" binding:"required"`
	Amount       string `json:"amount" binding:"required"`
	GoodsContent string `json:"goods_content" binding:"required"`
	ChainId      int64  `json:"chain_id" binding:"required"`
}

// ==========================================
// API 1: CreateOrder - 缔约与风控验签
// ==========================================
func CreateOrder(c *gin.Context) {
	var req CreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 1. 隐私保护：计算货物明文的 SHA-256 Hash
	hash := sha256.Sum256([]byte(req.GoodsContent))
	var goodsHashBytes [32]byte
	copy(goodsHashBytes[:], hash[:])
	goodsHashHex := fmt.Sprintf("0x%x", hash)

	// 2. 模拟 AI 风控打分 (Sprint 4 将替换为调用 Python 服务)
	riskScore := 98.5 // 模拟高分通过

	// 3. 后端 ECDSA 签名 (颁发通行证)
	amountBig, _ := new(big.Int).SetString(req.Amount, 10)
	deadline := big.NewInt(time.Now().Add(1 * time.Hour).Unix())
	chainIdBig := big.NewInt(req.ChainId)

	privateKey := os.Getenv("PRIVATE_KEY")
	signature, err := utils.GenerateRiskSignature(
		privateKey,
		common.HexToAddress(req.Buyer),
		common.HexToAddress(req.Seller),
		common.HexToAddress(req.TokenAddress),
		amountBig,
		goodsHashBytes,
		deadline,
		chainIdBig,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate risk signature"})
		return
	}

	// 4. 落库存证 (状态: PENDING)
	newOrder := Order{
		ID:           uuid.New().String(),
		BuyerAddr:    req.Buyer,
		SellerAddr:   req.Seller,
		Token:        req.TokenAddress,
		Amount:       req.Amount,
		GoodsContent: req.GoodsContent,
		GoodsHash:    goodsHashHex,
		Status:       "PENDING", // 等待前端拿到签名后去上链
		RiskScore:    riskScore,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if result := db.Create(&newOrder); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save order to DB"})
		return
	}

	// 5. 返回签名与订单ID给前端
	c.JSON(http.StatusOK, gin.H{
		"message":    "Risk check passed",
		"order_id":   newOrder.ID,
		"signature":  signature,
		"goods_hash": goodsHashHex,
		"deadline":   deadline.String(),
		"risk_score": riskScore,
	})
}

// ==========================================
// API 2: SyncChainStatus - 资金锁定同步
// ==========================================
func SyncChainStatus(c *gin.Context) {
	var req struct {
		ID              string `json:"id" binding:"required"`
		ContractOrderId int64  `json:"contract_order_id"`
		TxHash          string `json:"tx_hash" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 前端上链成功后，更新数据库状态为 PAID (已担保锁定)
	result := db.Model(&Order{}).Where("id = ?", req.ID).Updates(map[string]interface{}{
		"contract_order_id": req.ContractOrderId,
		"tx_hash":           req.TxHash,
		"status":            "PAID",
		"updated_at":        time.Now(),
	})

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Order status synced to PAID"})
}

// ==========================================
// API 3: GetOrders - 获取我的订单看板
// ==========================================
func GetOrders(c *gin.Context) {
	userAddr := c.Query("user")
	role := c.Query("role") // "buyer" or "seller"

	var orders []Order
	query := db.Model(&Order{})

	if role == "buyer" {
		query = query.Where("buyer_addr = ?", userAddr)
	} else if role == "seller" {
		query = query.Where("seller_addr = ?", userAddr)
	}

	// 按时间倒序返回
	query.Order("created_at desc").Find(&orders)
	c.JSON(http.StatusOK, gin.H{"data": orders})
}

// ==========================================
// API 4: UpdateOrderStatus - 模拟发货与收货
// ==========================================
func UpdateOrderStatus(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Status      string `json:"status" binding:"required"` // SHIPPED, COMPLETED
		LogisticsId string `json:"logistics_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]interface{}{
		"status":     req.Status,
		"updated_at": time.Now(),
	}
	if req.LogisticsId != "" {
		updates["logistics_id"] = req.LogisticsId
	}

	db.Model(&Order{}).Where("id = ?", id).Updates(updates)
	c.JSON(http.StatusOK, gin.H{"message": "Order status updated successfully"})
}
