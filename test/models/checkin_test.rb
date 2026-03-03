require "test_helper"

class CheckinTest < ActiveSupport::TestCase
  test "does not allow duplicate checkin for same rule and participant" do
    owner = create_user
    participant = create_user
    event = create_event(owner: owner)
    membership = UserEvent.create!(user: participant, event: event, role: :participant)
    rule = CheckinRule.create!(event: event, name: "Entrada", window_before_minutes: 10, window_after_minutes: 10, sort_order: 1)

    Checkin.create!(user_event: membership, checkin_rule: rule, checked_in_at: Time.current)
    duplicate = Checkin.new(user_event: membership, checkin_rule: rule, checked_in_at: Time.current)

    assert_not duplicate.valid?
    assert_includes duplicate.errors[:checkin_rule_id], "has already been taken"
  end

  test "requires checkin rule to belong to same event as membership" do
    owner = create_user
    participant = create_user
    event_a = create_event(owner: owner, title: "Evento A")
    event_b = create_event(owner: owner, title: "Evento B")

    membership = UserEvent.create!(user: participant, event: event_a, role: :participant)
    rule_from_other_event = CheckinRule.create!(
      event: event_b,
      name: "Regra B",
      window_before_minutes: 0,
      window_after_minutes: 0,
      sort_order: 1
    )

    checkin = Checkin.new(user_event: membership, checkin_rule: rule_from_other_event, checked_in_at: Time.current)

    assert_not checkin.valid?
    assert_includes checkin.errors[:checkin_rule], "não pertence ao mesmo evento do participante"
  end
end
