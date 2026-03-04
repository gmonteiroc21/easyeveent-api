require "test_helper"

class OwnershipPoliciesTest < ActiveSupport::TestCase
  test "user event policy allows owner and blocks non owner" do
    owner = create_user
    outsider = create_user
    event = create_event(owner: owner)
    membership = UserEvent.create!(user: create_user, event: event, role: :participant)

    assert UserEventPolicy.new(owner, membership).update?
    assert_not UserEventPolicy.new(outsider, membership).update?
    assert UserEventPolicy.new(owner, event).index?
    assert_not UserEventPolicy.new(outsider, event).index?
  end

  test "checkin rule policy allows owner and blocks non owner" do
    owner = create_user
    outsider = create_user
    event = create_event(owner: owner)
    rule = CheckinRule.create!(event: event, name: "Entrada", window_before_minutes: 0, window_after_minutes: 0, sort_order: 1)

    assert CheckinRulePolicy.new(owner, rule).update?
    assert_not CheckinRulePolicy.new(outsider, rule).update?
  end
end
