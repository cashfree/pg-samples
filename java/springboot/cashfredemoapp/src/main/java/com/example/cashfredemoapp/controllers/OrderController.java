package com.example.cashfredemoapp.controllers;

import com.cashfree.pg.model.CreateOrderRequest;
import com.cashfree.pg.model.CustomerDetails;
import com.cashfree.pg.model.OrderEntity;
import com.cashfree.pg.*;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    // Injecting Cashfree configuration properties
    @Value("${cashfree.client-id}")
    private String clientId;

    @Value("${cashfree.client-secret}")
    private String clientSecret;

    @Value("${cashfree.environment}")
    private String environment;

    // Initializes the Cashfree SDK with the appropriate environment and credentials
    private Cashfree initCashfree() {
        Cashfree.CFEnvironment env = environment.equalsIgnoreCase("sandbox")
                ? Cashfree.CFEnvironment.SANDBOX
                : Cashfree.CFEnvironment.PRODUCTION;

        return new Cashfree(env, clientId, clientSecret, null, null, null);
    }

    // Endpoint to create a new order
    @PostMapping("/create")
    public ResponseEntity<OrderEntity> createOrder(@RequestBody CreateOrderRequest orderRequest) {
        try {
            // Extract customer details from the request
            CustomerDetails customerDetails = new CustomerDetails();
            customerDetails.setCustomerName(orderRequest.getCustomerDetails().getCustomerName());
            customerDetails.setCustomerPhone(orderRequest.getCustomerDetails().getCustomerPhone());
            customerDetails.setCustomerId(orderRequest.getCustomerDetails().getCustomerId());

            // Prepare the order creation request
            CreateOrderRequest request = new CreateOrderRequest();
            request.setOrderAmount(orderRequest.getOrderAmount());
            request.setOrderCurrency(orderRequest.getOrderCurrency());
            request.setCustomerDetails(customerDetails);

            // Call Cashfree API to create the order
            Cashfree cashfree = initCashfree();
            ApiResponse<OrderEntity> response = cashfree.PGCreateOrder(request, null, null, null);

            // Return the created order details
            return ResponseEntity.ok(response.getData());
        } catch (Exception e) {
            e.printStackTrace();
            // Return an error response in case of failure
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new OrderEntity());
        }
    }

    // Endpoint to fetch an order by its ID
    @GetMapping("/{orderId}")
    public ResponseEntity<?> getOrder(@PathVariable String orderId) {
        try {
            // Call Cashfree API to fetch the order details
            Cashfree cashfree = initCashfree();
            ApiResponse<OrderEntity> response = cashfree.PGFetchOrder(orderId, null, null, null);
            return ResponseEntity.ok(response.getData());
        } catch (Exception e) {
            e.printStackTrace();
            // Return an error response in case of failure
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error fetching order: " + e.getMessage());
        }
    }
}
