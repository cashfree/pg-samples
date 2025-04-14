# This file contains test cases for the ProductsController.
# Add tests to ensure the controller methods work as expected.

require "test_helper"

class ProductsControllerTest < ActionDispatch::IntegrationTest
  test "should get show" do
    get products_show_url
    assert_response :success
  end
end
