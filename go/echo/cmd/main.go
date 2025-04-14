package main

import (
	"echo/internal/handlers"
	"log"

	"github.com/joho/godotenv"
	"github.com/labstack/echo/v4"
)

func main() {
	e := echo.New()

	// Load .env file
	err := godotenv.Load()
	if err != nil {
		log.Fatalf("Error loading .env file")
	}

	// Routes
	e.GET("/product", handlers.ProductPageHandler) // Route for the product page
	e.POST("/create-order", handlers.CreateOrderHandler) // Route for creating an order
	e.GET("/status", handlers.StatusPageHandler) // Route for the status page
	e.POST("/webhook", handlers.WebhookHandler) // Route for handling webhooks

	// Start server
	e.Logger.Fatal(e.Start(":8080")) // Start the server on port 8080
}
