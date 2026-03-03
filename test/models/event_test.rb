require "test_helper"

class EventTest < ActiveSupport::TestCase
  test "is invalid without required fields" do
    event = Event.new

    assert_not event.valid?
    assert_includes event.errors[:title], "can't be blank"
    assert_includes event.errors[:starts_at], "can't be blank"
    assert_includes event.errors[:location], "can't be blank"
  end

  test "does not allow negative price" do
    event = Event.new(
      title: "Evento",
      starts_at: 1.day.from_now,
      location: "Recife",
      price: -1
    )

    assert_not event.valid?
    assert_includes event.errors[:price], "must be greater than or equal to 0"
  end
end
