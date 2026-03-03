require "test_helper"

class UserEventTest < ActiveSupport::TestCase
  test "does not allow duplicate membership for same user and event" do
    owner = create_user
    event = create_event(owner: owner)
    user = create_user

    UserEvent.create!(user: user, event: event, role: :participant)
    duplicate = UserEvent.new(user: user, event: event, role: :participant)

    assert_not duplicate.valid?
    assert_includes duplicate.errors[:user_id], "has already been taken"
  end
end
