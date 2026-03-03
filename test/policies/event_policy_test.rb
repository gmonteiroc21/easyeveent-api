require "test_helper"

class EventPolicyTest < ActiveSupport::TestCase
  test "owner can update and destroy event" do
    owner = create_user
    event = create_event(owner: owner)

    policy = EventPolicy.new(owner, event)

    assert policy.update?
    assert policy.destroy?
  end

  test "participant can show but cannot update event" do
    owner = create_user
    participant = create_user
    event = create_event(owner: owner)
    UserEvent.create!(user: participant, event: event, role: :participant)

    policy = EventPolicy.new(participant, event)

    assert policy.show?
    assert_not policy.update?
  end

  test "scope returns only events with membership" do
    user = create_user
    owner = create_user
    visible_event = create_event(owner: owner, title: "Visivel")
    hidden_event = create_event(owner: owner, title: "Oculto")
    UserEvent.create!(user: user, event: visible_event, role: :participant)

    resolved = EventPolicy::Scope.new(user, Event.all).resolve

    assert_includes resolved, visible_event
    assert_not_includes resolved, hidden_event
  end
end
