package middleware

import (
    "net/http"
    "github.com/labstack/echo/v4"
    "log"
)

// Logger is a middleware function that logs the incoming requests.
func Logger(next echo.HandlerFunc) echo.HandlerFunc {
    return func(c echo.Context) error {
        log.Printf("Request: %s %s", c.Request().Method, c.Request().URL)
        return next(c)
    }
}

// Recover is a middleware function that recovers from panics and returns a 500 error.
func Recover(next echo.HandlerFunc) echo.HandlerFunc {
    return func(c echo.Context) error {
        defer func() {
            if r := recover(); r != nil {
                log.Println("Recovered from panic:", r)
                c.String(http.StatusInternalServerError, "Internal Server Error")
            }
        }()
        return next(c)
    }
}