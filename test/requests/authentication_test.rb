require "test_helper"

class AuthenticationTest < ActionDispatch::IntegrationTest
  test "login returns token with valid credentials" do
    suffix = unique_suffix
    user = create_user(email: "owner-#{suffix}@example.com", login: "owner_#{suffix}")

    post "/auth/login", params: { identifier: user.email, password: "password123" }, as: :json

    assert_response :success
    body = JSON.parse(response.body)
    assert body["token"].present?
    assert_equal user.id, body.dig("user", "id")
  end

  test "login returns unauthorized for invalid credentials" do
    suffix = unique_suffix
    user = create_user(email: "owner-#{suffix}@example.com", login: "owner_#{suffix}")

    post "/auth/login", params: { identifier: user.email, password: "wrong-password" }, as: :json

    assert_response :unauthorized
    body = JSON.parse(response.body)
    assert_equal "invalid_credentials", body["error"]
  end

  test "me requires token" do
    get "/me", as: :json

    assert_response :unauthorized
    body = JSON.parse(response.body)
    assert_equal "unauthorized", body["error"]
  end

  test "me returns authenticated user" do
    user = create_user(name: "Ana", email: "ana@example.com", login: "ana.login")

    get "/me", headers: auth_headers_for(user), as: :json

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal user.id, body["id"]
    assert_equal "Ana", body["name"]
    assert_equal "ana@example.com", body["email"]
  end
end
