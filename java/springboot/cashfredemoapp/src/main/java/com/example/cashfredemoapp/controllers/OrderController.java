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

    @Value("${cashfree.client-id}")
    private String clientId;

    @Value("${cashfree.client-secret}")
    private String clientSecret;

    @Value("${cashfree.environment}")
    private String environment;

    private Cashfree initCashfree() {
        Cashfree.CFEnvironment env = environment.equalsIgnoreCase("sandbox")
                ? Cashfree.CFEnvironment.SANDBOX
                : Cashfree.CFEnvironment.PRODUCTION;

        return new Cashfree(env, clientId, clientSecret, null, null, null);
    }

    @PostMapping("/create")
    public ResponseEntity<OrderEntity> createOrder(@RequestBody CreateOrderRequest orderRequest) {
        try {
            CustomerDetails customerDetails = new CustomerDetails();
            customerDetails.setCustomerName(orderRequest.getCustomerDetails().getCustomerName());
            customerDetails.setCustomerPhone(orderRequest.getCustomerDetails().getCustomerPhone());
            customerDetails.setCustomerId(orderRequest.getCustomerDetails().getCustomerId());

            CreateOrderRequest request = new CreateOrderRequest();
            request.setOrderAmount(orderRequest.getOrderAmount());
            request.setOrderCurrency(orderRequest.getOrderCurrency());
            request.setCustomerDetails(customerDetails);

            Cashfree cashfree = initCashfree();
            ApiResponse<OrderEntity> response = cashfree.PGCreateOrder(request, null, null, null);

            return ResponseEntity.ok(response.getData());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new OrderEntity());
        }
    }

    @GetMapping("/{orderId}")
    public ResponseEntity<?> getOrder(@PathVariable String orderId) {
        try {
            Cashfree cashfree = initCashfree();
            ApiResponse<OrderEntity> response = cashfree.PGFetchOrder(orderId, null, null, null);
            return ResponseEntity.ok(response.getData());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error fetching order: " + e.getMessage());
        }
    }
}
