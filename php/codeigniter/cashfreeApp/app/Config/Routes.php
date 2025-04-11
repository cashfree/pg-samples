<?php

use CodeIgniter\Router\RouteCollection;

/**
 * @var RouteCollection $routes
 */
$routes->get('/', 'CashfreeController::index');
$routes->get('cashfree', 'CashfreeController::index');
$routes->get('cashfree/confirm', 'CashfreeController::confirm');
$routes->get('cashfree/thankyou', 'CashfreeController::thankyou');
$routes->get('cashfree/checkOrder', 'CashfreeController::checkOrder');
