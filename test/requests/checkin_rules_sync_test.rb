require "test_helper"

class CheckinRulesSyncTest < ActionDispatch::IntegrationTest
  test "owner can sync checkin rules with create update delete and reorder" do
    owner = create_user
    event = create_event(owner: owner)

    keep_rule = CheckinRule.create!(
      event: event,
      rule_type: "time_window",
      name: "Janela Inicial",
      window_before_minutes: 30,
      window_after_minutes: 15,
      is_required: true,
      is_active: true,
      sort_order: 1,
      config: {}
    )

    remove_rule = CheckinRule.create!(
      event: event,
      rule_type: "document_check",
      name: "Documento",
      window_before_minutes: 0,
      window_after_minutes: 0,
      is_required: false,
      is_active: true,
      sort_order: 2,
      config: {}
    )

    put "/events/#{event.id}/checkin_rules/sync",
      params: {
        rules: [
          {
            id: keep_rule.id,
            rule_type: "time_window",
            name: "Janela Atualizada",
            window_before_minutes: 60,
            window_after_minutes: 20,
            is_required: true,
            is_active: true,
            sort_order: 1,
            config: {}
          },
          {
            rule_type: "capacity_limit",
            name: "Limite de lotacao",
            window_before_minutes: 0,
            window_after_minutes: 0,
            is_required: false,
            is_active: true,
            sort_order: 2,
            config: { max_users: 200 }
          }
        ]
      },
      headers: auth_headers_for(owner),
      as: :json

    assert_response :success

    event.reload
    assert_equal 2, event.checkin_rules.count
    assert_not CheckinRule.exists?(remove_rule.id)

    updated = event.checkin_rules.find(keep_rule.id)
    assert_equal "Janela Atualizada", updated.name
    assert_equal 60, updated.window_before_minutes
    assert_equal 1, updated.sort_order

    created = event.checkin_rules.find_by!(rule_type: "capacity_limit")
    assert_equal 2, created.sort_order
    assert_equal({ "max_users" => 200 }, created.config)
  end

  test "non owner cannot sync checkin rules" do
    owner = create_user
    outsider = create_user
    event = create_event(owner: owner)

    put "/events/#{event.id}/checkin_rules/sync",
      params: {
        rules: [
          {
            rule_type: "time_window",
            name: "Janela",
            window_before_minutes: 10,
            window_after_minutes: 10,
            is_required: true,
            is_active: true,
            sort_order: 1,
            config: {}
          }
        ]
      },
      headers: auth_headers_for(outsider),
      as: :json

    assert_response :forbidden
  end

  test "sync returns validation error when no rule is active" do
    owner = create_user
    event = create_event(owner: owner)

    put "/events/#{event.id}/checkin_rules/sync",
      params: {
        rules: [
          {
            rule_type: "time_window",
            name: "Janela",
            window_before_minutes: 10,
            window_after_minutes: 10,
            is_required: true,
            is_active: false,
            sort_order: 1,
            config: {}
          }
        ]
      },
      headers: auth_headers_for(owner),
      as: :json

    assert_response :unprocessable_entity
    body = JSON.parse(response.body)
    assert_equal "validation_error", body["error"]
    assert_includes body.dig("details", "base"), "Pelo menos uma regra ativa é obrigatória."
  end

  test "sync returns validation error when trying to remove a rule with checkins" do
    owner = create_user
    participant = create_user
    event = create_event(owner: owner)
    membership = UserEvent.create!(user: participant, event: event, role: :participant)

    keep_rule = CheckinRule.create!(
      event: event,
      rule_type: "time_window",
      name: "Janela",
      window_before_minutes: 10,
      window_after_minutes: 10,
      is_required: true,
      is_active: true,
      sort_order: 1,
      config: {}
    )

    blocked_rule = CheckinRule.create!(
      event: event,
      rule_type: "document_check",
      name: "Documento",
      window_before_minutes: 0,
      window_after_minutes: 0,
      is_required: false,
      is_active: true,
      sort_order: 2,
      config: {}
    )

    Checkin.create!(user_event: membership, checkin_rule: blocked_rule, checked_in_at: Time.current)

    put "/events/#{event.id}/checkin_rules/sync",
      params: {
        rules: [
          {
            id: keep_rule.id,
            rule_type: "time_window",
            name: "Janela",
            window_before_minutes: 10,
            window_after_minutes: 10,
            is_required: true,
            is_active: true,
            sort_order: 1,
            config: {}
          }
        ]
      },
      headers: auth_headers_for(owner),
      as: :json

    assert_response :unprocessable_entity
    body = JSON.parse(response.body)
    assert_equal "validation_error", body["error"]
    assert CheckinRule.exists?(blocked_rule.id)
  end

  test "sync returns validation error for malformed rule payload item" do
    owner = create_user
    event = create_event(owner: owner)

    put "/events/#{event.id}/checkin_rules/sync",
      params: {
        rules: ["invalid_item"]
      },
      headers: auth_headers_for(owner),
      as: :json

    assert_response :unprocessable_entity
    body = JSON.parse(response.body)
    assert_equal "validation_error", body["error"]
    assert_includes body.dig("details", "base"), "Regra #1: payload inválido."
  end
end
