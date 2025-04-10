# Cashfree Payment Integration with Flask

This project demonstrates how to integrate Cashfree's payment gateway into a Flask web application. It includes functionality for creating orders, handling payments, and fetching order details.

## Features

- Create an order using Cashfree's API.
- Handle payments via Cashfree's modal checkout.
- Fetch order details to verify payment status.
- Redirect users to a "Thank You" page upon successful payment.

## Prerequisites

- Python 3.7 or higher
- Flask
- Cashfree sandbox/test credentials
- Internet connection to load the Cashfree SDK

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd cf_flask

2. Create a virtual environment:
    python3 -m venv venv
    source venv/bin/activate

3. Install dependencies:
    pip install -r requirements.txt

4. Set up your Cashfree credentials:
    Replace the placeholders in app.py with your Cashfree x-client-id and x-client-secret.

5. Run the Flask application:
    python app.py  or flask run

6. Open your browser and navigate to:
    http://127.0.0.1:5000/

## Project Structure

cf_flask/
├── [app.py](http://_vscodecontentref_/0)                  # Main Flask application
├── templates/
│   ├── index.html          # Main page with payment integration
│   ├── thank_you.html      # Thank You page after successful payment
├── static/
│   ├── css/
│       └── styles.css      # Optional CSS for styling
├── [requirements.txt](http://_vscodecontentref_/1)        # Python dependencies
└── README.md               # Project documentation

## API Endpoints 

1. /create_order (POST)
    1. Creates a new order using Cashfree's API.
    2. Returns a payment_session_id for initiating the payment.

2. /get-order (GET)
    1. Fetches order details using the order_id.
    eg: GET /get-order?order_id=<order_id>

3. /thank-you (GET)
    1. Displays a "Thank You" page after successful payment.

## How It Works

1. Create Order:
    1. When the "Pay Now" button is clicked, a POST request is sent to /create_order.
    2. The server generates an order and returns a payment_session_id.

2. Payment Modal:
    1. The Cashfree SDK opens a modal for the user to complete the payment.

3. Verify Payment:
    1. After payment, the /get-order endpoint is called with the order_id to verify the payment status.

4. Thank You Page:
    1. If the payment is successful, the user is redirected to the /thank-you page.

## Cashfree SDK Integration
    
    The project uses the Cashfree SDK v3 for handling payments. The SDK is loaded via: <script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>

## Env variables

    1. use below two variables to make the flow work. 
    CLIENT_ID
    CLIENT_SECRET
