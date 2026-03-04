require "test_helper"

class EventPurchaseRulesTest < ActionDispatch::IntegrationTest
  test "capacity_limit blocks purchase when participant limit is reached" do
    owner = create_user
    buyer = create_user
    existing_participant = create_user
    event = create_event(owner: owner)
    UserEvent.create!(event: event, user: existing_participant, role: :participant)

    CheckinRule.create!(
      event: event,
      rule_type: "capacity_limit",
      name: "Capacidade",
      is_required: true,
      is_active: true,
      window_before_minutes: 0,
      window_after_minutes: 0,
      sort_order: 1,
      config: { max_users: 1 }
    )

    post "/events/#{event.id}/purchase",
      headers: auth_headers_for(buyer),
      as: :json

    assert_response :unprocessable_entity
    body = JSON.parse(response.body)
    assert_equal "validation_error", body["error"]
    assert_includes body.dig("details", "base").join(" "), "Limite de participantes atingido"
  end

  test "half_price_policy blocks half ticket when rule is not active" do
    owner = create_user
    buyer = create_user
    event = create_event(owner: owner, price: 100)

    post "/events/#{event.id}/purchase",
      params: { ticket_type: "half", payment_method: "pix" },
      headers: auth_headers_for(buyer),
      as: :json

    assert_response :unprocessable_entity
    body = JSON.parse(response.body)
    assert_equal "validation_error", body["error"]
    assert_includes body.dig("details", "base"), "Meia entrada não está habilitada para este evento."
  end

  test "half_price_policy applies ratio when active" do
    owner = create_user
    buyer = create_user
    event = create_event(owner: owner, price: 100)

    CheckinRule.create!(
      event: event,
      rule_type: "half_price_policy",
      name: "Meia entrada",
      is_required: false,
      is_active: true,
      window_before_minutes: 0,
      window_after_minutes: 0,
      sort_order: 1,
      config: { ratio: 0.5 }
    )

    post "/events/#{event.id}/purchase",
      params: { ticket_type: "half", payment_method: "card" },
      headers: auth_headers_for(buyer),
      as: :json

    assert_response :created
    body = JSON.parse(response.body)
    assert_equal "half", body.dig("purchase", "ticket_type")
    assert_equal true, body.dig("purchase", "half_price_applied")
    assert_equal 50.0, body.dig("purchase", "final_price")
  end

  test "document_check requires document on purchase" do
    owner = create_user
    buyer = create_user
    event = create_event(owner: owner)

    CheckinRule.create!(
      event: event,
      rule_type: "document_check",
      name: "Documento",
      is_required: true,
      is_active: true,
      window_before_minutes: 0,
      window_after_minutes: 0,
      sort_order: 1,
      config: { required_document: "cpf" }
    )

    post "/events/#{event.id}/purchase",
      headers: auth_headers_for(buyer),
      as: :json

    assert_response :unprocessable_entity
    body = JSON.parse(response.body)
    assert_equal "validation_error", body["error"]
    assert_includes body.dig("details", "base").join(" "), "Documento obrigatório não informado"
  end

  test "qr_code returns token payload on successful purchase" do
    owner = create_user
    buyer = create_user
    event = create_event(owner: owner)

    CheckinRule.create!(
      event: event,
      rule_type: "qr_code",
      name: "QR",
      is_required: false,
      is_active: true,
      window_before_minutes: 0,
      window_after_minutes: 0,
      sort_order: 1,
      config: { expires_in_minutes: 30, single_use: true }
    )

    post "/events/#{event.id}/purchase",
      headers: auth_headers_for(buyer),
      as: :json

    assert_response :created
    body = JSON.parse(response.body)
    assert body.dig("purchase", "qr_code", "token").present?
    assert_equal true, body.dig("purchase", "qr_code", "single_use")
  end

  test "email_confirmation sends purchase email when configured" do
    owner = create_user
    buyer = create_user
    event = create_event(owner: owner)
    ActionMailer::Base.deliveries.clear

    CheckinRule.create!(
      event: event,
      rule_type: "email_confirmation",
      name: "Email",
      is_required: false,
      is_active: true,
      window_before_minutes: 0,
      window_after_minutes: 0,
      sort_order: 1,
      config: { send_on: "purchase", subject: "Compra Confirmada" }
    )

    post "/events/#{event.id}/purchase",
      headers: auth_headers_for(buyer),
      as: :json

    assert_response :created
    assert_equal 1, ActionMailer::Base.deliveries.size
    assert_equal "Compra Confirmada", ActionMailer::Base.deliveries.last.subject
  end

  test "live_count controls visibility of participants count on events index" do
    owner = create_user
    participant = create_user
    event = create_event(owner: owner)
    UserEvent.create!(event: event, user: participant, role: :participant)

    CheckinRule.create!(
      event: event,
      rule_type: "live_count",
      name: "Contador",
      is_required: false,
      is_active: true,
      window_before_minutes: 0,
      window_after_minutes: 0,
      sort_order: 1,
      config: { refresh_seconds: 10 }
    )

    get "/events",
      headers: auth_headers_for(owner),
      as: :json

    assert_response :success
    body = JSON.parse(response.body)
    listed = body.find { |item| item["id"] == event.id }

    assert_equal true, listed["participants_live_count_visible"]
    assert_equal 1, listed["participants_live_count"]
    assert_equal 10, listed["participants_live_count_refresh_seconds"]

    CheckinRule.create!(
      event: event,
      rule_type: "visibility_toggle",
      name: "Visibilidade",
      is_required: false,
      is_active: true,
      window_before_minutes: 0,
      window_after_minutes: 0,
      sort_order: 2,
      config: { show_live_count: false }
    )

    get "/events",
      headers: auth_headers_for(owner),
      as: :json

    assert_response :success
    body = JSON.parse(response.body)
    listed = body.find { |item| item["id"] == event.id }

    assert_equal false, listed["participants_live_count_visible"]
    assert_nil listed["participants_live_count"]
  end
end
