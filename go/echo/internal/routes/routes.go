package routes

import (
	"echo/internal/handlers"

	"github.com/labstack/echo/v4"
)

func SetupRoutes(e *echo.Echo) {
	e.GET("/example", handlers.HandleGet)
	e.POST("/example", handlers.HandlePost)
}
