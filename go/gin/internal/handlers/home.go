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
	OrderID          string `json:"order_id"`
	PaymentSessionID string `json:"payment_session_id"`
	URL              string `json:"url"`
}

type OrderStatusResponse struct {
	OrderID     string `json:"order_id"`
	OrderStatus string `json:"order_status"`
}

func CreateOrderHandler(c *gin.Context) {
	clientID := os.Getenv("CASHFREE_CLIENT_ID")
	clientSecret := os.Getenv("CASHFREE_CLIENT_SECRET")
	cfsandbox := cashfree.SANDBOX

	cf := cashfree.Cashfree{
		XEnvironment:  &cfsandbox,
		XClientId:     &clientID,
		XClientSecret: &clientSecret,
	}

	returnUrl := "http://localhost:8080/status?order_id={order_id}"
	notifyUrl := "http://localhost:8080/webhook"
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

	response, _, err := cf.PGCreateOrder(&request, nil, nil, nil)
	if err != nil {
		fmt.Println("error :: ", err)
		c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to create order"})
	}

	orderResponse := OrderResponse{
		OrderID:          *response.OrderId,
		PaymentSessionID: *response.PaymentSessionId,
	}

	c.JSON(http.StatusOK, orderResponse)
}

func StatusPageHandler(c *gin.Context) {
	orderID := c.Query("order_id")
	if orderID == "" {
		c.JSON(http.StatusBadRequest, map[string]string{"error": "Order ID is required"})
	}

	clientID := os.Getenv("CASHFREE_CLIENT_ID")
	clientSecret := os.Getenv("CASHFREE_CLIENT_SECRET")
	cfsandbox := cashfree.SANDBOX

	cf := cashfree.Cashfree{
		XEnvironment:  &cfsandbox,
		XClientId:     &clientID,
		XClientSecret: &clientSecret,
	}
	response, _, err := cf.PGFetchOrder(orderID, nil, nil, nil)
	if err != nil {
		fmt.Println("error :: ", err)
		c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to fetch order status"})
	}

	// Parse the response to extract order status
	orderStatusResponse := OrderStatusResponse{
		OrderID:     *response.OrderId,
		OrderStatus: *response.OrderStatus,
	}

	// Render the status.html template
	tmpl, err := template.ParseFiles("internal/templates/status.html")
	if err != nil {
		c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to load status page"})
	}

	tmpl.Execute(c.Writer, orderStatusResponse)
}

func HomeHandler(c *gin.Context) {
	c.HTML(http.StatusOK, "index.html", nil)
}

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

	webhookEvent, err := cf.PGVerifyWebhookSignature(signature, rawBody, timestamp)
	if err != nil {
		fmt.Println("Error verifying webhook signature:", err.Error())
		c.JSON(400, "Invalid signature")
	}

	fmt.Println("Webhook Event:", webhookEvent.Object)
	c.JSON(200, "Webhook received")
}
