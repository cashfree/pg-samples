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
	e.GET("/product", handlers.ProductPageHandler)
	e.POST("/create-order", handlers.CreateOrderHandler)
	e.GET("/status", handlers.StatusPageHandler)
	e.POST("/webhook", handlers.WebhookHandler)

	// Start server
	e.Logger.Fatal(e.Start(":8080"))
}
