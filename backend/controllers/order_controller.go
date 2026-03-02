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
)

// CreateOrderInput 定义前端传来的 JSON 参数结构
type CreateOrderInput struct {
	Buyer        string `json:"buyer" binding:"required"`         // 买家钱包地址
	Seller       string `json:"seller" binding:"required"`        // 卖家钱包地址
	TokenAddress string `json:"token" binding:"required"`         // 支付代币地址
	Amount       string `json:"amount" binding:"required"`        // 金额 (字符串格式，防止大数精度丢失)
	GoodsContent string `json:"goods_content" binding:"required"` // 货物清单明文 (将被转化为 Privacy Hash)
	ChainId      int64  `json:"chain_id" binding:"required"`      // 链ID (Sepolia=11155111)
}

// CreateOrder 处理订单请求：计算哈希 -> AI 风控检查 -> 签名授权
func CreateOrder(c *gin.Context) {
	var input CreateOrderInput

	// 1. 参数绑定与校验
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 2. 【核心学术点】计算隐私哈希 (Privacy Hash)
	// 将敏感的货物信息 (GoodsContent) 转化为不可逆的 SHA256 哈希
	// 链上只存哈希，不存明文，实现隐私保护
	hash := sha256.Sum256([]byte(input.GoodsContent))
	// 转换为 [32]byte 格式供签名使用
	var goodsHashBytes [32]byte
	copy(goodsHashBytes[:], hash[:])
	// 转换为 Hex 字符串返回给前端 (调试用)
	goodsHashHex := fmt.Sprintf("0x%x", hash)

	// 3. 准备签名数据类型
	buyerAddr := common.HexToAddress(input.Buyer)
	sellerAddr := common.HexToAddress(input.Seller)
	tokenAddr := common.HexToAddress(input.TokenAddress)

	amountBig, ok := new(big.Int).SetString(input.Amount, 10)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid amount format"})
		return
	}

	// 设定期限: 当前时间 + 1小时 (防止签名被永久滥用，增强安全性)
	deadline := big.NewInt(time.Now().Add(1 * time.Hour).Unix())
	chainIdBig := big.NewInt(input.ChainId)

	// 4. 获取后端私钥 (模拟 Risk Oracle 身份)
	// 注意：main.go 会负责加载 .env 文件，所以这里直接读环境变量
	privateKey := os.Getenv("PRIVATE_KEY")
	if privateKey == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Server configuration error: PRIVATE_KEY missing"})
		return
	}

	// 5. 【核心功能】生成 EIP-191 风控签名
	// 在论文中，这里代表 "AI Risk Model Passed -> Approve Transaction"
	signature, err := utils.GenerateRiskSignature(
		privateKey,
		buyerAddr,
		sellerAddr,
		tokenAddr,
		amountBig,
		goodsHashBytes,
		deadline,
		chainIdBig,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to generate signature: %v", err)})
		return
	}

	// 6. 返回结果给前端
	// 前端将使用 signature 和 goods_hash 调用智能合约
	c.JSON(http.StatusOK, gin.H{
		"message":    "Risk check passed",
		"risk_score": 0.05, // 模拟 AI 评分 (低风险)
		"signature":  signature,
		"goods_hash": goodsHashHex,
		"deadline":   deadline.String(),
	})
}
