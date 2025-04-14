package routes

import (
	"echo/internal/handlers"

	"github.com/labstack/echo/v4"
)

// SetupRoutes defines all the application routes and their corresponding handlers.
// This function is called to initialize the routes for the Echo framework.
func SetupRoutes(e *echo.Echo) {
	e.GET("/example", handlers.HandleGet) // Route for handling GET requests
	e.POST("/example", handlers.HandlePost) // Route for handling POST requests
}
