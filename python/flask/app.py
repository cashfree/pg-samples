from flask import Flask, render_template, request, jsonify
import requests
import uuid

app = Flask(__name__)

# Replace with your Cashfree credentials
CASHFREE_API_URL = "https://sandbox.cashfree.com/pg/orders"  # Use sandbox for testing

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/create_order", methods=["POST"])
def create_order():
    # Generate a unique order ID
    order_id = str(uuid.uuid4())
    payload = {
        "order_id": order_id,
        "order_amount": 100,
        "order_currency": "INR",
        "customer_details": {
            "customer_id": "12345",
            "customer_email": "test@example.com",
            "customer_phone": "9999999999"
        }
    }

    headers = {
        "Content-Type": "application/json",
        "x-client-id": "<CLIENT_ID>",
        "x-client-secret": "<CLIENT_SECRET>",
        "x-api-version": "2025-01-01"
    }

    # Make a request to Cashfree to create an order
    response = requests.post(CASHFREE_API_URL, json=payload, headers=headers)
    print("response is:", end="")
    print(response.status_code)
    print(response.text)
    if response.status_code == 200:
        return jsonify(response.json())
    else:
        return jsonify({"error": "Failed to create order"}), 400

@app.route("/get-order", methods=["GET"])
def fetchOrderDetails():
    order_id = request.args.get("order_id")
    url = f"https://sandbox.cashfree.com/pg/orders/{order_id}/payments"
    headers = {
        "x-client-id": "<CLIENT_ID>",
        "x-client-secret": "<CLIENT_SECRET>",
        "Accept": "application/json",
        "x-api-version": "2025-01-01"
    }
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        return jsonify(response.json())
    else:
        return jsonify({"error": "Failed to fetch order details", "status_code": response.status_code}), response.status_code

@app.route("/thank-you")
def thank_you():
    return render_template("thank_you.html")

if __name__ == "__main__":
    app.run(debug=True)