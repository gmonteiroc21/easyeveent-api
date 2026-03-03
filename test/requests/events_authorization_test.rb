require "test_helper"

class EventsAuthorizationTest < ActionDispatch::IntegrationTest
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
end
