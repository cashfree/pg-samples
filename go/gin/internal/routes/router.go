package routes

import (
	"gin/internal/handlers"

	"github.com/gin-gonic/gin"
)

func SetupRouter() *gin.Engine {
	router := gin.Default()

	// Route to serve the home page
	router.GET("/", handlers.HomeHandler)

	// Route to create an order and generate a payment session ID
	router.POST("/create-order", handlers.CreateOrderHandler)

	// Route to fetch and display the order status
	router.GET("/status", handlers.StatusPageHandler)

	// Route to handle webhook notifications from Cashfree
	router.POST("/webhook", handlers.WebhookHandler)

	return router
}
