package controllers

import (
	"b2b_backend/initializers"
	"b2b_backend/models"
	"net/http"

	"github.com/gin-gonic/gin"
)

func Ping(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "pong"})
}

func GetUsers(c *gin.Context) {
	var users []models.User
	initializers.DB.Find(&users)
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    users,
	})
}

// 【新增】：超级管理员解锁被 AI 封禁的账户 (HITL)
func UnlockUser(c *gin.Context) {
	userID := c.Param("id")

	// 将用户的健康状态强制重置为 ACTIVE
	result := initializers.DB.Model(&models.User{}).Where("id = ?", userID).Update("health_status", "ACTIVE")

	if result.Error != nil || result.RowsAffected == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "解锁失败或用户不存在"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "账户已恢复健康状态"})
}
