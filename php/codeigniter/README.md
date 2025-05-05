# Cashfree Payment Integration with Codeigniter

This project demonstrates how to integrate Cashfree's payment gateway with php codeigniter application. It includes functionality for creating orders, handling payments, and fetching order details.

## Features

- Create an order using Cashfree's API.
- Handle payments via Cashfree's modal checkout.
- Fetch order details to verify payment status.
- Redirect users to a "Thank You" page upon successful payment.

## Prerequisites

- PHP 7.4 or higher
- Composer
- CodeIgniter
- Cashfree sandbox/test credentials
- Internet connection to load the Cashfree SDK

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>

2. Install dependencies:
    install php
    install composer
    create codeigniter4 project using composer

3. Create secret in env:
    client-id
    client-secret

5. Run the codeIgniter application:
    php spark serve 

6. Open your browser and navigate to:
    http://localhost:8080

## Project Structure

```
cashfreeApp/
├── app
    |──Config                               
    |  └── Routes.php                       # routes
    |── Controller                          # Controller
    |   └── CashfreeController.php
    |──Views                                # views
        └── cashfree_thankyou.php
        └── cashfree_view.php               
├── env                                     # secrets
└── README.md                               # Project documentation
```
## API Endpoints 

1. /confirm (POST)
    1. Creates a new order using Cashfree's API.
    2. Returns a payment_session_id for initiating the payment.

2. /checkOrder (GET)
    1. Fetches order details using the order_id.

3. /thankyou (GET)
    1. Displays a "Thank You" page after successful payment.

## How It Works

1. Create Order:
    1. When the "Pay Now" button is clicked, a POST request is sent to /confirm.
    2. The server generates an order and returns a payment_session_id.

2. Payment Modal:
    1. The Cashfree SDK opens a modal for the user to complete the payment.

3. Verify Payment:
    1. After payment, the /checkOrder endpoint is called with the order_id to verify the payment status.

4. Thank You Page:
    1. If the payment is successful, the user is redirected to the /thankyou page.

## Cashfree SDK Integration
    
    The project uses the Cashfree SDK v3 for handling payments. The SDK is loaded via: <script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>

## Env variables

    1. use below two variables to make the flow work. 
    CLIENT_ID
    CLIENT_SECRET  

## Setup
installation:
    install php
    install composer

    composer create-project codeigniter4/appstarter cashfreeApp  
    cd cashfreeApp

files Updates
    Update the given files 
    Add secret in env

run:
    php spark serve 


