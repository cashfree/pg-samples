package handlers

import (
	"fmt"
	"html/template"
	"io/ioutil"
	"net/http"
	"os"

	cashfree "github.com/cashfree/cashfree-pg/v3"
	"github.com/labstack/echo/v4"
)

// OrderResponse represents the response structure for order creation.
type OrderResponse struct {
	OrderID          string `json:"order_id"`
	PaymentSessionID string `json:"payment_session_id"`
	URL              string `json:"url"`
}

// OrderStatusResponse represents the response structure for order status.
type OrderStatusResponse struct {
	OrderID     string `json:"order_id"`
	OrderStatus string `json:"order_status"`
}

// HandleGet handles GET requests.
// This is a sample handler that returns a success message for GET requests.
func HandleGet(c echo.Context) error {
	return c.String(http.StatusOK, "GET request successful")
}

// HandlePost handles POST requests.
// This is a sample handler that returns a success message for POST requests.
func HandlePost(c echo.Context) error {
	return c.String(http.StatusOK, "POST request successful")
}

// ProductPageHandler serves the product page.
// It renders the product.html template.
func ProductPageHandler(c echo.Context) error {
	return c.File("templates/product.html")
}

// CreateOrderHandler handles the creation of a new order.
// It interacts with the Cashfree API to generate a payment session ID.
func CreateOrderHandler(c echo.Context) error {
	clientID := os.Getenv("CASHFREE_CLIENT_ID")
	clientSecret := os.Getenv("CASHFREE_CLIENT_SECRET")
	cashfree.XClientId = &clientID
	cashfree.XClientSecret = &clientSecret
	cashfree.XEnvironment = cashfree.SANDBOX

	request := cashfree.CreateOrderRequest{
		OrderAmount: 100.0,
		CustomerDetails: cashfree.CustomerDetails{
			CustomerId:    "12345",
			CustomerPhone: "9999999999",
		},
		OrderCurrency: "INR",
		OrderMeta: &cashfree.OrderMeta{
			ReturnUrl: "http://localhost:8080/status?order_id={order_id}",
			NotifyUrl: "http://localhost:8080/webhook",
		},
	}

	version := "2022-09-01"
	response, _, err := cashfree.PGCreateOrder(&version, &request, nil, nil, nil)
	if err != nil {
		fmt.Println("error :: ", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to create order"})
	}

	orderResponse := OrderResponse{
		OrderID:          *response.OrderId,
		PaymentSessionID: *response.PaymentSessionId,
	}

	return c.JSON(http.StatusOK, orderResponse)
}

// StatusPageHandler serves the status page.
// It fetches the order status from the Cashfree API and renders the status.html template.
func StatusPageHandler(c echo.Context) error {
	orderID := c.QueryParam("order_id")
	if orderID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Order ID is required"})
	}

	clientID := os.Getenv("CASHFREE_CLIENT_ID")
	clientSecret := os.Getenv("CASHFREE_CLIENT_SECRET")
	cashfree.XClientId = &clientID
	cashfree.XClientSecret = &clientSecret
	cashfree.XEnvironment = cashfree.SANDBOX

	version := "2022-09-01"
	response, _, err := cashfree.PGFetchOrder(&version, orderID, nil, nil, nil)
	if err != nil {
		fmt.Println("error :: ", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to fetch order status"})
	}

	// Parse the response to extract order status
	orderStatusResponse := OrderStatusResponse{
		OrderID:     *response.OrderId,
		OrderStatus: *response.OrderStatus,
	}

	// Render the status.html template
	tmpl, err := template.ParseFiles("templates/status.html")
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to load status page"})
	}

	return tmpl.Execute(c.Response().Writer, orderStatusResponse)
}

// WebhookHandler handles webhook notifications from Cashfree.
// It verifies the webhook signature and processes the event.
func WebhookHandler(c echo.Context) error {
	fmt.Print("request recieved for webhook")
	clientID := os.Getenv("CASHFREE_CLIENT_ID")
	clientSecret := os.Getenv("CASHFREE_CLIENT_SECRET")
	cashfree.XClientId = &clientID
	cashfree.XClientSecret = &clientSecret
	cashfree.XEnvironment = cashfree.SANDBOX

	signature := c.Request().Header.Get("x-webhook-signature")
	timestamp := c.Request().Header.Get("x-webhook-timestamp")

	body, _ := ioutil.ReadAll(c.Request().Body)
	rawBody := string(body)

	webhookEvent, err := cashfree.PGVerifyWebhookSignature(signature, rawBody, timestamp)
	if err != nil {
		fmt.Println("Error verifying webhook signature:", err.Error())
		return c.JSON(400, "Invalid signature")
	}

	fmt.Println("Webhook Event:", webhookEvent.Object)
	return c.JSON(200, "Webhook received")
}
