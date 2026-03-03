require "test_helper"

class UserTest < ActiveSupport::TestCase
  test "normalizes email and login before validation" do
    user = User.create!(
      name: "Alice",
      email: "  ALICE@Example.COM ",
      login: "  Alice.Login  ",
      password: "password123",
      password_confirmation: "password123"
    )

    assert_equal "alice@example.com", user.email
    assert_equal "alice.login", user.login
  end

  test "enforces case insensitive uniqueness for email and login" do
    create_user(email: "owner@example.com", login: "owner.login")

    duplicate = User.new(
      name: "Duplicated",
      email: "OWNER@example.com",
      login: "OWNER.LOGIN",
      password: "password123",
      password_confirmation: "password123"
    )

    assert_not duplicate.valid?
    assert_includes duplicate.errors[:email], "has already been taken"
    assert_includes duplicate.errors[:login], "has already been taken"
  end
end
