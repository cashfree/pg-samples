# Cashfree Demo Application

This is a Spring Boot application that demonstrates integration with the Cashfree Payment Gateway using the Cashfree Java SDK. The application provides APIs to create an order, fetch order details

---

## Features

- **Create Order**: Create a new order using the Cashfree Java SDK.
- **Get Order**: Fetch order details using the Cashfree Java SDK.
- **Frontend Integration**: A simple frontend page to initiate payments and complete transactions using the Cashfree JS SDK.

---

## Prerequisites

- Java 8 or higher
- Maven
- Cashfree Sandbox Credentials (Client ID and Client Secret)
- Spring Boot
- Cashfree Java SDK version 5.0.0-beta-11 or higher

---

## Setup Instructions

### 1. Clone the Repository
```bash
git clone <repository-url>
cd cashfredemoapp
```

### 2. Configure Cashfree Credentials

### 3. Build the Project
Run the following command to build the project:
mvn clean install

### 4. Start the Spring Boot application:
mvn spring-boot:run
The application will be available at http://localhost:8081.

### Frontend Integration
The application includes a simple HTML page (product.html) to initiate payments. The page uses the Cashfree JS SDK to open the payment popup.

Steps:
Open the product.html file in your browser.
Click the "Buy Now" button to create an order and open the Cashfree payment popup.
Complete the payment.

### Dependencies
The following dependencies are used in the project:

Spring Boot Starter Web: For building REST APIs.
Cashfree Java SDK: For integrating with the Cashfree Payment Gateway.
Gson: For JSON parsing.
OkHttp: For making HTTP requests.