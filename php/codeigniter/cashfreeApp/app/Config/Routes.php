<?php

use CodeIgniter\Router\RouteCollection;

/**
 * @var RouteCollection $routes
 */

// Define the default route to the payment page
$routes->get('/', 'CashfreeController::index');

// Define route for the payment page
$routes->get('cashfree', 'CashfreeController::index');

// Define route to confirm the order and initiate payment
$routes->get('cashfree/confirm', 'CashfreeController::confirm');

// Define route for the thank-you page
$routes->get('cashfree/thankyou', 'CashfreeController::thankyou');

// Define route to check the order status
$routes->get('cashfree/checkOrder', 'CashfreeController::checkOrder');
