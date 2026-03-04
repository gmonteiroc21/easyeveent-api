require "test_helper"

class DashboardEventsTest < ActionDispatch::IntegrationTest
  test "dashboard show returns assigned checkin rules" do
    owner = create_user
    event = create_event(owner: owner)
    event.update!(status: :published)

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

    get "/dashboard/events/#{event.id}",
      headers: auth_headers_for(owner),
      as: :json

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal 1, body["checkin_rules"].size
    assert_equal "document_check", body["checkin_rules"].first["rule_type"]
  end
end
