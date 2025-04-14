package config

import (
    "github.com/joho/godotenv"
    "log"
    "os"
)

// Config represents the application configuration.
// It contains fields for the server port and environment.
type Config struct {
    Port string
    Env  string
}

// LoadConfig loads the application configuration from the .env file.
// It returns a Config struct with the loaded values.
func LoadConfig() Config {
    err := godotenv.Load()
    if err != nil {
        log.Fatal("Error loading .env file")
    }

    return Config{
        Port: getEnv("PORT", "8080"),
        Env:  getEnv("ENV", "development"),
    }
}

// getEnv retrieves the value of an environment variable.
// If the variable is not set, it returns the provided default value.
func getEnv(key, defaultValue string) string {
    if value, exists := os.LookupEnv(key); exists {
        return value
    }
    return defaultValue
}