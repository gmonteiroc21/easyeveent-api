ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"
require "securerandom"

module TestDataHelper
  def unique_suffix
    "#{Process.pid}-#{SecureRandom.hex(4)}"
  end

  def create_user(name: "User", email: nil, login: nil, password: "password123")
    suffix = unique_suffix
    User.create!(
      name: name,
      email: email || "user-#{suffix}@example.com",
      login: login || "user_#{suffix}",
      password: password,
      password_confirmation: password
    )
  end

  def create_event(owner:, title: "Evento Teste", starts_at: 2.days.from_now, location: "Recife", price: 0)
    event = Event.create!(
      title: title,
      starts_at: starts_at,
      location: location,
      price: price
    )
    UserEvent.create!(user: owner, event: event, role: :owner)
    event
  end

  def auth_headers_for(user)
    token = JwtService.encode(sub: user.id)
    { "Authorization" => "Bearer #{token}" }
  end
end

class ActiveSupport::TestCase
  include TestDataHelper
end

class ActionDispatch::IntegrationTest
  include TestDataHelper
end
