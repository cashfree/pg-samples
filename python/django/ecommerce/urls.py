# Import necessary modules
from django.contrib import admin
from django.urls import path, include

# Define URL patterns for the project
urlpatterns = [
    path('admin/', admin.site.urls),  # Admin site URL
    path('', include('shop.urls')),  # Include shop app URLs
]
