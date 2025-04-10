from django.urls import path
from .views import landing_page, cart_page, add_to_cart, update_cart, create_order, success_page

urlpatterns = [
    path('', landing_page, name='landing_page'),
    path('cart/', cart_page, name='cart_page'),
    path('create-order/', create_order, name='create_order'),
    path('add-to-cart/<int:product_id>/', add_to_cart, name='add_to_cart'),
    path('update-cart/<int:product_id>/<str:action>/', update_cart, name='update_cart'),
    path('successfull/', success_page, name='success_page'),
]
