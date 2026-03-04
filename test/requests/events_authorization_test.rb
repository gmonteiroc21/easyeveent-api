require "test_helper"

class EventsAuthorizationTest < ActionDispatch::IntegrationTest
  test "event creation links creator as owner" do
    owner = create_user

    assert_difference("Event.count", 1) do
      post "/events",
        params: {
          event: {
            title: "Novo Evento",
            starts_at: 2.days.from_now.iso8601,
            location: "Recife",
            price: 10
          }
        },
        headers: auth_headers_for(owner),
        as: :json
    end

    assert_response :created
    created_event = Event.order(:id).last
    membership = UserEvent.find_by!(event_id: created_event.id, user_id: owner.id)
    assert_equal "owner", membership.role
  end

  test "owner can update event" do
    owner = create_user
    event = create_event(owner: owner, title: "Titulo Antigo")

    patch "/events/#{event.id}",
      params: { event: { title: "Titulo Novo" } },
      headers: auth_headers_for(owner),
      as: :json

    assert_response :success
    assert_equal "Titulo Novo", event.reload.title
  end

  test "non owner cannot update event" do
    owner = create_user
    participant = create_user
    event = create_event(owner: owner, title: "Evento")
    UserEvent.create!(user: participant, event: event, role: :participant)

    patch "/events/#{event.id}",
      params: { event: { title: "Nao Deve Atualizar" } },
      headers: auth_headers_for(participant),
      as: :json

    assert_response :forbidden
    assert_equal "Evento", event.reload.title
  end

  test "owner can create participant on event" do
    owner = create_user
    invitee = create_user
    event = create_event(owner: owner)

    assert_difference("UserEvent.where(event_id: #{event.id}).count", 1) do
      post "/events/#{event.id}/participants",
        params: { user_id: invitee.id },
        headers: auth_headers_for(owner),
        as: :json
    end

    assert_response :created
    membership = UserEvent.find_by!(event_id: event.id, user_id: invitee.id)
    assert_equal "participant", membership.role
  end

  test "non owner cannot create participant on event" do
    owner = create_user
    participant = create_user
    invitee = create_user
    event = create_event(owner: owner)
    UserEvent.create!(user: participant, event: event, role: :participant)

    assert_no_difference("UserEvent.where(event_id: #{event.id}, user_id: #{invitee.id}).count") do
      post "/events/#{event.id}/participants",
        params: { user_id: invitee.id },
        headers: auth_headers_for(participant),
        as: :json
    end

    assert_response :forbidden
  end

  test "user can purchase event and become participant" do
    owner = create_user
    buyer = create_user
    event = create_event(owner: owner)

    assert_difference("UserEvent.where(event_id: #{event.id}, user_id: #{buyer.id}).count", 1) do
      post "/events/#{event.id}/purchase",
        headers: auth_headers_for(buyer),
        as: :json
    end

    assert_response :created
    membership = UserEvent.find_by!(event_id: event.id, user_id: buyer.id)
    assert_equal "participant", membership.role
  end

  test "participant purchase is idempotent" do
    owner = create_user
    buyer = create_user
    event = create_event(owner: owner)
    UserEvent.create!(event: event, user: buyer, role: :participant)

    assert_no_difference("UserEvent.where(event_id: #{event.id}, user_id: #{buyer.id}).count") do
      post "/events/#{event.id}/purchase",
        headers: auth_headers_for(buyer),
        as: :json
    end

    assert_response :success
  end

  test "owner cannot purchase own event" do
    owner = create_user
    event = create_event(owner: owner)

    assert_no_difference("UserEvent.where(event_id: #{event.id}, user_id: #{owner.id}).count") do
      post "/events/#{event.id}/purchase",
        headers: auth_headers_for(owner),
        as: :json
    end

    assert_response :forbidden
  end

  test "event show returns checkin confirmation for current user" do
    owner = create_user
    participant = create_user
    event = create_event(owner: owner)
    membership = UserEvent.create!(event: event, user: participant, role: :participant)

    rule = CheckinRule.create!(
      event: event,
      rule_type: "time_window",
      name: "Janela",
      is_required: true,
      is_active: true,
      window_before_minutes: 15,
      window_after_minutes: 15,
      sort_order: 1,
      config: {}
    )

    checkin_time = Time.current.change(usec: 0)
    Checkin.create!(user_event: membership, checkin_rule: rule, checked_in_at: checkin_time)

    get "/events/#{event.id}",
      headers: auth_headers_for(participant),
      as: :json

    assert_response :success
    body = JSON.parse(response.body)
    confirmation = body["checkin_confirmation"]
    rules = body["checkin_rules"]

    assert_equal "participant", confirmation["role"]
    assert_equal true, confirmation["checked_in"]
    assert_equal 1, confirmation["required_rules_count"]
    assert_equal 1, confirmation["checked_required_rules_count"]
    assert_equal 1, confirmation["total_checkins_count"]
    assert_equal checkin_time.iso8601, Time.zone.parse(confirmation["last_checkin_at"]).iso8601
    assert_equal 1, rules.size
    assert_equal "time_window", rules.first["rule_type"]
  end
end
