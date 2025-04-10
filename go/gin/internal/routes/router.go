package routes

import (
	"gin/internal/handlers"

	"github.com/gin-gonic/gin"
)

func SetupRouter() *gin.Engine {
	router := gin.Default()
	router.GET("/", handlers.HomeHandler)
	router.POST("/create-order", handlers.CreateOrderHandler)
	router.GET("/status", handlers.StatusPageHandler)
	router.POST("/webhook", handlers.WebhookHandler)
	return router
}
