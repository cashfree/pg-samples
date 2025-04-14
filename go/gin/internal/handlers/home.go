package handlers

import (
	"fmt"
	"html/template"
	"io/ioutil"
	"net/http"
	"os"

	cashfree "github.com/cashfree/cashfree-pg/v5"
	"github.com/gin-gonic/gin"
)

type OrderResponse struct {
	// Response structure for order creation
	OrderID          string `json:"order_id"`
	PaymentSessionID string `json:"payment_session_id"`
	URL              string `json:"url"`
}

type OrderStatusResponse struct {
	// Response structure for order status
	OrderID     string `json:"order_id"`
	OrderStatus string `json:"order_status"`
}

// CreateOrderHandler handles the creation of a new order
func CreateOrderHandler(c *gin.Context) {
	clientID := os.Getenv("CASHFREE_CLIENT_ID")
	clientSecret := os.Getenv("CASHFREE_CLIENT_SECRET")
	cfsandbox := cashfree.SANDBOX

	// Initialize Cashfree client with sandbox environment
	cf := cashfree.Cashfree{
		XEnvironment:  &cfsandbox,
		XClientId:     &clientID,
		XClientSecret: &clientSecret,
	}

	returnUrl := "http://localhost:8080/status?order_id={order_id}"
	notifyUrl := "http://localhost:8080/webhook"
	// Prepare the order creation request
	request := cashfree.CreateOrderRequest{
		OrderAmount: 100.0,
		CustomerDetails: cashfree.CustomerDetails{
			CustomerId:    "12345",
			CustomerPhone: "9999999999",
		},
		OrderCurrency: "INR",
		OrderMeta: &cashfree.OrderMeta{
			ReturnUrl: &returnUrl,
			NotifyUrl: &notifyUrl,
		},
	}

	// Call Cashfree API to create the order
	response, _, err := cf.PGCreateOrder(&request, nil, nil, nil)
	if err != nil {
		// Handle error in order creation
		fmt.Println("error :: ", err)
		c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to create order"})
	}

	// Send the order response back to the client
	orderResponse := OrderResponse{
		OrderID:          *response.OrderId,
		PaymentSessionID: *response.PaymentSessionId,
	}

	c.JSON(http.StatusOK, orderResponse)
}

// StatusPageHandler fetches and displays the order status
func StatusPageHandler(c *gin.Context) {
	// Extract order ID from query parameters
	orderID := c.Query("order_id")
	if orderID == "" {
		// Handle missing order ID
		c.JSON(http.StatusBadRequest, map[string]string{"error": "Order ID is required"})
	}

	clientID := os.Getenv("CASHFREE_CLIENT_ID")
	clientSecret := os.Getenv("CASHFREE_CLIENT_SECRET")
	cfsandbox := cashfree.SANDBOX

	// Initialize Cashfree client
	cf := cashfree.Cashfree{
		XEnvironment:  &cfsandbox,
		XClientId:     &clientID,
		XClientSecret: &clientSecret,
	}

	// Fetch order status from Cashfree
	response, _, err := cf.PGFetchOrder(orderID, nil, nil, nil)
	if err != nil {
		// Handle error in fetching order status
		fmt.Println("error :: ", err)
		c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to fetch order status"})
	}

	// Parse the response and render the status page
	orderStatusResponse := OrderStatusResponse{
		OrderID:     *response.OrderId,
		OrderStatus: *response.OrderStatus,
	}

	// Render the status.html template
	tmpl, err := template.ParseFiles("internal/templates/status.html")
	if err != nil {
		// Handle template parsing error
		c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to load status page"})
	}

	tmpl.Execute(c.Writer, orderStatusResponse)
}

// HomeHandler serves the home page
func HomeHandler(c *gin.Context) {
	c.HTML(http.StatusOK, "index.html", nil)
}

// WebhookHandler handles webhook notifications from Cashfree
func WebhookHandler(c *gin.Context) {
	fmt.Print("request recieved for webhook")
	clientID := os.Getenv("CASHFREE_CLIENT_ID")
	clientSecret := os.Getenv("CASHFREE_CLIENT_SECRET")
	cfsandbox := cashfree.SANDBOX

	cf := cashfree.Cashfree{
		XEnvironment:  &cfsandbox,
		XClientId:     &clientID,
		XClientSecret: &clientSecret,
	}

	signature := c.Request.Header.Get("x-webhook-signature")
	timestamp := c.Request.Header.Get("x-webhook-timestamp")

	body, _ := ioutil.ReadAll(c.Request.Body)
	rawBody := string(body)

	// Verify the webhook signature
	webhookEvent, err := cf.PGVerifyWebhookSignature(signature, rawBody, timestamp)
	if err != nil {
		// Handle invalid signature
		fmt.Println("Error verifying webhook signature:", err.Error())
		c.JSON(400, "Invalid signature")
	}

	// Log the webhook event
	fmt.Println("Webhook Event:", webhookEvent.Object)
	c.JSON(200, "Webhook received")
}
