package models

// User represents a user in the system.
// It contains fields for user ID, name, email, and password.
type User struct {
    ID       string `json:"id"`
    Name     string `json:"name"`
    Email    string `json:"email"`
    Password string `json:"password"`
}

// Product represents a product in the system.
// It contains fields for product ID, name, and price.
type Product struct {
    ID    string  `json:"id"`
    Name  string  `json:"name"`
    Price float64 `json:"price"`
}