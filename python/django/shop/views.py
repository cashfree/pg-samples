import requests
from django.shortcuts import render, redirect
from django.http import JsonResponse
from cashfree_pg.models.create_order_request import CreateOrderRequest
from cashfree_pg.api_client import Cashfree
from cashfree_pg.models.customer_details import CustomerDetails
from cashfree_pg.models.order_meta import OrderMeta
from django.views.decorators.csrf import csrf_exempt
import json

# Configuration
Cashfree.XClientId = 'TEST430329ae80e0f32e41a393d78b923034'
Cashfree.XClientSecret = 'TESTaf195616268bd6202eeb3bf8dc458956e7192a85'
Cashfree.XEnvironment = Cashfree.SANDBOX
x_api_version = "2023-08-01"


@csrf_exempt
def create_order(request):
    if request.method == 'POST':
        cart_data = request.POST.get('cart')
        if not cart_data:
            return JsonResponse({'status': 'error', 'message': 'Cart is empty'})
        
        try:
            cart = json.loads(cart_data)
        except json.JSONDecodeError:
            return JsonResponse({'status': 'error', 'message': 'Invalid cart data'})

        total_amount = 0.0
        for item in cart.values():
            try:
                price = float(item['price'])
                quantity = int(item['quantity'])
                total_amount += price * quantity
            except ValueError as e:
                print(f"Error parsing price or quantity for item {item}: {e}")
                return JsonResponse({'status': 'error', 'message': f"Error parsing price or quantity for item {item['id']}"})

        print(f"Total amount calculated: {total_amount}")

        # Ensure the total_amount is greater than or equal to 1
        if total_amount < 1:
            return JsonResponse({'status': 'error', 'message': 'Total amount must be at least 1'})

        customer_details = CustomerDetails(customer_id="123", customer_phone="9999999999")

        create_order_request = CreateOrderRequest(order_amount=total_amount, order_currency="INR", customer_details=customer_details)
        order_meta = OrderMeta(return_url="localhost:8000/successfull")
        create_order_request.order_meta = order_meta

        try:
            api_response = Cashfree().PGCreateOrder(x_api_version, create_order_request, None, None)
            payment_session_id = api_response.data.payment_session_id  # Correct way to access the attribute
            return JsonResponse({'status': 'success', 'payment_session_id': payment_session_id})
        except Exception as e:
            print(f"Error creating order: {str(e)}")
            return JsonResponse({'status': 'error', 'message': f'Error creating order: {str(e)}'})

    return JsonResponse({'status': 'error', 'message': 'Invalid request method'})

def cart_page(request):
    cart = request.session.get('cart', {})
    cart_items = []
    for product_id, details in cart.items():
        cart_items.append({
            'id': product_id,
            'title': details.get('title', 'No Title'),
            'description': details.get('description', ''),
            'image': details.get('image', 'https://via.placeholder.com/80'),  # Default placeholder image
            'price': details.get('price', 0.0),
            'quantity': details.get('quantity', 1)
        })
    return render(request, 'shop/cart_page.html', {'cart_items': cart_items})

def landing_page(request):
    response = requests.get('https://fakestoreapi.com/products')
    products = response.json()
    return render(request, 'shop/landing_page.html', {'products': products})

def add_to_cart(request, product_id):
    cart = request.session.get('cart', {})
    if product_id in cart:
        cart[product_id]['quantity'] += 1
    else:
        response = requests.get(f'https://fakestoreapi.com/products/{product_id}')
        product = response.json()
        cart[product_id] = {
            'title': product['title'],
            'price': product['price'],
            'quantity': 1,
            'description': product['description'],
            'image': product['image']
        }
    request.session['cart'] = cart
    return JsonResponse({'status': 'success'})

def update_cart(request, product_id, action):
    cart = request.session.get('cart', {})
    if product_id in cart:
        if action == 'increase':
            cart[product_id]['quantity'] += 1
        elif action == 'decrease' and cart[product_id]['quantity'] > 1:
            cart[product_id]['quantity'] -= 1
        else:
            cart.pop(product_id)
    request.session['cart'] = cart
    return JsonResponse({'status': 'success'})

def success_page(request):
    cart = request.session.get('cart', {})
    cart_items = []
    for product_id, details in cart.items():
        cart_items.append({
            'id': product_id,
            'title': details.get('title', 'No Title'),
            'price': details.get('price', 0.0),
            'quantity': details.get('quantity', 1)
        })
    # Clear the cart after successful order
    request.session['cart'] = {}
    return render(request, 'shop/successfull.html', {'cart_items': cart_items})
