package main

import (
	"gin/internal/routes"
	"log"

	"github.com/joho/godotenv"
)

func main() {
	// Setup the Gin router
	r := routes.SetupRouter()

	// Load HTML templates for rendering
	r.LoadHTMLGlob("internal/templates/*")

	// Load environment variables from .env file
	err := godotenv.Load(".env")
	if err != nil {
		// Log error if .env file is missing or cannot be loaded
		log.Fatalf("Error loading .env file: %v", err)
	}

	// Start the server on port 8080
	r.Run(":8080")
}
