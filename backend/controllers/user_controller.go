package controllers

import (
	"b2b_backend/initializers"
	"b2b_backend/models"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// RegisterUserInput 定义请求参数结构
type RegisterUserInput struct {
	WalletAddress string `json:"wallet_address" binding:"required"`
	Role          string `json:"role" binding:"required,oneof=BUYER SELLER"`
}

// RegisterUser 注册或获取用户
func RegisterUser(c *gin.Context) {
	var input RegisterUserInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 强制地址转小写，确保存储一致性
	address := strings.ToLower(input.WalletAddress)

	var user models.User
	// 查找是否已存在，不存在则创建 (FirstOrCreate)
	result := initializers.DB.Where(models.User{WalletAddress: address}).
		Attrs(models.User{Role: input.Role}).
		FirstOrCreate(&user)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "User registered/retrieved successfully",
		"user":    user,
	})
}
