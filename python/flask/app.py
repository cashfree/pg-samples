from flask import Flask, render_template, request, jsonify
import requests
import uuid
import os

app = Flask(__name__)

# Define the Cashfree API URL for creating orders
CASHFREE_API_URL = "https://sandbox.cashfree.com/pg/orders"  # Use sandbox for testing

# Try to import the official Cashfree PG SDK (installed from GitHub)
try:
    import cashfree_pg
    SDK_AVAILABLE = True
except Exception:
    SDK_AVAILABLE = False

# Route for the home page, rendering the main HTML template
@app.route("/")
def index():
    return render_template("index.html")

# Route for creating an order, interacting with the Cashfree API / SDK
@app.route("/create_order", methods=["POST"])
def create_order():
    # Generate a unique order ID
    order_id = str(uuid.uuid4())

    if SDK_AVAILABLE:
       from cashfree_pg.models.create_order_request import CreateOrderRequest
       from cashfree_pg.api_client import Cashfree
       from cashfree_pg.models.customer_details import CustomerDetails
       from cashfree_pg.models.order_meta import OrderMeta
       Cashfree.XClientId = ""
       Cashfree.XClientSecret = ""
       Cashfree.XEnvironment = Cashfree.SANDBOX
       x_api_version = "2023-08-01"

       customerDetails = CustomerDetails(customer_id="walterwNrcMi", customer_phone="9999999999")
       orderMeta = OrderMeta(return_url="https://www.cashfree.com/devstudio/preview/pg/web/checkout?order_id={order_id}")
       createOrderRequest = CreateOrderRequest(order_amount=1, order_currency="INR", customer_details=customerDetails, order_meta=orderMeta)
       try:
           api_response = Cashfree().PGCreateOrder(x_api_version, createOrderRequest, None, None)
           data = api_response.data
           if hasattr(data, "to_dict"):
              return jsonify(data.to_dict())
           if isinstance(data, dict):
              return jsonify(data)
           # try __dict__ for simple model objects
           try:
              return jsonify(getattr(data, "__dict__", {"data": str(data)}))
           except Exception:
              return jsonify({"data": str(data)})
       except Exception as e:
           print(e)
           return jsonify({"error": "Failed to create order", "details": str(e)}), 400
    pass


# Route for fetching order details, using the order ID
@app.route("/get-order", methods=["GET"])
def fetchOrderDetails():
    order_id = request.args.get("order_id")
    if SDK_AVAILABLE:
        from cashfree_pg.api_client import Cashfree
        Cashfree.XClientId = ""
        Cashfree.XClientSecret = ""
        Cashfree.XEnvironment = Cashfree.SANDBOX
        x_api_version = "2023-08-01"
        try:
            api_response = Cashfree().PGFetchOrder(x_api_version, order_id, None)
            data = api_response.data
            if hasattr(data, "to_dict"):
              return jsonify(data.to_dict())
            if isinstance(data, dict):
              return jsonify(data)
            # try __dict__ for simple model objects
            try:
                return jsonify(getattr(data, "__dict__", {"data": str(data)}))
            except Exception:
               return jsonify({"data": str(data)})
        except Exception as e:
            print(e)
        pass

    
# Route for the Thank You page, displayed after successful payment
@app.route("/thank-you")
def thank_you():
    return render_template("thank_you.html")

# Run the Flask app in debug mode
if __name__ == "__main__":
    app.run(debug=True)
# ...existing code...