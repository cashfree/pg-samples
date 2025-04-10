require "net/http"
require "json"

class ProductsController < ApplicationController
  def show
    @product = {
      name: "Guitar",
      description: "A high-quality guitar perfect for beginners and professionals.",
      price: "₹4990.99",
      image_url: ActionController::Base.helpers.asset_path("electric_guitar.jpeg")
    }
  end

  def purchase
    uri = URI("https://sandbox.cashfree.com/pg/orders")
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    orderid = SecureRandom.hex(10)
    request = Net::HTTP::Post.new(uri.path, {
      "Content-Type" => "application/json",
      "x-client-id" => ENV["CASHFREE_CLIENT_ID"],
      "x-client-secret" => ENV["CASHFREE_CLIENT_SECRET"],
      "x-api-version" => "2025-01-01"
    })
    request.body = {
      "order_amount": 4990.99,
      "order_currency": "INR",
      "order_id": orderid,
      "customer_details": {
        "customer_id": "ror_user",
        "customer_phone": "9999999999"
      },
      "order_meta": {
        "return_url": "https://www.cashfree.com/devstudio/preview/pg/web/popupCheckout?order_id=#{orderid}"
      }
    }.to_json

    response = http.request(request)
    render json: { status: response.code, body: JSON.parse(response.body) }
  end
end
