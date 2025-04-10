package config

import (
    "github.com/joho/godotenv"
    "log"
    "os"
)

type Config struct {
    Port string
    Env  string
}

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

func getEnv(key, defaultValue string) string {
    if value, exists := os.LookupEnv(key); exists {
        return value
    }
    return defaultValue
}