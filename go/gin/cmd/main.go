package main

import (
	"gin/internal/routes"
	"log"

	"github.com/joho/godotenv"
)

func main() {
	r := routes.SetupRouter()
	r.LoadHTMLGlob("internal/templates/*")
	err := godotenv.Load(".env")
	if err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}

	routes.SetupRouter()
	r.Run(":8080")
}
