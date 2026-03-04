class DashboardEventsController < ApplicationController
  def index
    events = Event.showcase.includes(:user_events)
    render json: events.map { |event| serialize_event(event) }
  end

  def show
    event = Event.showcase.includes(:user_events).find(params[:id])
    render json: serialize_event(event, include_rules: true)
  end

  private

  def serialize_event(event, include_rules: false)
    live_count = CheckinRules::Rules::LiveCountService.new(event: event).call

    payload = event.as_json.merge(
      "owned_by_me" => owned_by_current_user?(event),
      "joined_by_me" => joined_by_current_user?(event),
      "membership_role_by_me" => membership_role_by_current_user(event),
      "participants_live_count" => live_count[:participants_count],
      "participants_live_count_visible" => live_count[:visible],
      "participants_live_count_refresh_seconds" => live_count[:refresh_seconds]
    )
    payload["checkin_rules"] = serialize_rules(event) if include_rules
    payload
  end

  def owned_by_current_user?(event)
    event.user_events.any? { |membership| membership.user_id == current_user.id && membership.owner? }
  end

  def joined_by_current_user?(event)
    event.user_events.any? { |membership| membership.user_id == current_user.id }
  end

  def membership_role_by_current_user(event)
    membership = event.user_events.find { |user_event| user_event.user_id == current_user.id }
    membership&.role
  end

  def serialize_rules(event)
    event.checkin_rules.order(:sort_order, :id).as_json(
      only: [
        :id,
        :event_id,
        :rule_type,
        :name,
        :window_before_minutes,
        :window_after_minutes,
        :is_required,
        :is_active,
        :sort_order,
        :config
      ]
    )
  end
end
