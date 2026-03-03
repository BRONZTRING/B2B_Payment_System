package controllers

import (
	"b2b_backend/utils"
	"crypto/sha256"
	"fmt"
	"math/big"
	"net/http"
	"os"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// 引用 database.go 中的 DB 和模型
// 注意：在同个 main 包下可以直接用，如果拆分了包需要 import
// 这里为了简化，我们假设您在 main.go 里把 DB 传过来，或者直接放在 global 变量里
// 咱们用最简单的全局变量方案 (需配合修改 main.go 导出 DB)

// 定义输入结构
type CreateOrderInput struct {
	Buyer        string `json:"buyer" binding:"required"`
	Seller       string `json:"seller" binding:"required"`
	TokenAddress string `json:"token" binding:"required"`
	Amount       string `json:"amount" binding:"required"`
	GoodsContent string `json:"goods_content" binding:"required"`
	ChainId      int64  `json:"chain_id" binding:"required"`
}

// 数据库模型 (复制一份避免循环引用，或放在单独 models 包)
type OrderModel struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	OrderId   int64     `json:"order_id"` // 链上ID
	Buyer     string    `json:"buyer"`
	Seller    string    `json:"seller"`
	Amount    string    `json:"amount"`
	Goods     string    `json:"goods"`
	Status    string    `json:"status"`
	TxHash    string    `json:"tx_hash"`
	CreatedAt time.Time `json:"created_at"`
}

var db *gorm.DB

// SetDB 初始化注入
func SetDB(database *gorm.DB) {
	db = database
}

// CreateOrder: 仅做风控签名 (第一步)
func CreateOrder(c *gin.Context) {
	var input CreateOrderInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 1. 计算哈希
	hash := sha256.Sum256([]byte(input.GoodsContent))
	var goodsHashBytes [32]byte
	copy(goodsHashBytes[:], hash[:])
	goodsHashHex := fmt.Sprintf("0x%x", hash)

	// 2. 生成签名
	amountBig, _ := new(big.Int).SetString(input.Amount, 10)
	deadline := big.NewInt(time.Now().Add(1 * time.Hour).Unix())
	chainIdBig := big.NewInt(input.ChainId)

	privateKey := os.Getenv("PRIVATE_KEY")
	signature, err := utils.GenerateRiskSignature(
		privateKey,
		common.HexToAddress(input.Buyer),
		common.HexToAddress(input.Seller),
		common.HexToAddress(input.TokenAddress),
		amountBig,
		goodsHashBytes,
		deadline,
		chainIdBig,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Sign failed"})
		return
	}

	// 注意：此时我们还不存数据库，因为链上交易还没发！
	// 只有前端确认上链成功后，再调一个接口来保存，或者在这里先存一个 "PENDING_CHAIN" 状态

	c.JSON(http.StatusOK, gin.H{
		"message":    "Risk check passed",
		"signature":  signature,
		"goods_hash": goodsHashHex,
		"deadline":   deadline.String(),
	})
}

// SyncOrder: 前端上链成功后，调用此接口同步数据到数据库
func SyncOrder(c *gin.Context) {
	var order OrderModel
	if err := c.ShouldBindJSON(&order); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	order.Status = "LOCKED" // 初始状态：资金已锁定
	order.CreatedAt = time.Now()

	if result := db.Create(&order); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Order synced to database", "data": order})
}

// GetOrders: 获取我的订单列表 (买家或卖家)
func GetOrders(c *gin.Context) {
	userAddress := c.Query("user")
	role := c.Query("role") // "buyer" or "seller"

	var orders []OrderModel

	query := db.Model(&OrderModel{})
	if role == "buyer" {
		query = query.Where("buyer = ?", userAddress)
	} else if role == "seller" {
		query = query.Where("seller = ?", userAddress)
	} else {
		// 查询所有涉及该地址的订单
		query = query.Where("buyer = ? OR seller = ?", userAddress, userAddress)
	}

	query.Order("created_at desc").Find(&orders)
	c.JSON(http.StatusOK, gin.H{"data": orders})
}

// UpdateStatus: 卖家发货 / 买家收货
func UpdateStatus(c *gin.Context) {
	id := c.Param("id")
	var input struct {
		Status string `json:"status"` // SHIPPED, COMPLETED
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	db.Model(&OrderModel{}).Where("id = ?", id).Update("status", input.Status)
	c.JSON(http.StatusOK, gin.H{"message": "Status updated"})
}
