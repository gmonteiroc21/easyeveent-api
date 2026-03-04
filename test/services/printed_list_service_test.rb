require "test_helper"

class PrintedListServiceTest < ActiveSupport::TestCase
  test "generates participants list in csv format" do
    owner = create_user
    participant = create_user(name: "Participante CSV")
    event = create_event(owner: owner)
    UserEvent.create!(event: event, user: participant, role: :participant)

    output = CheckinRules::Rules::PrintedListService.new(event: event).call

    assert_equal "csv", output[:format]
    assert_equal 1, output[:participants_count]
    assert_includes output[:content], "Participante CSV"
    assert_includes output[:content], "membership_id"
  end
end
