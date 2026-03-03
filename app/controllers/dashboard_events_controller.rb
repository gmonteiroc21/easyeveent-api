class DashboardEventsController < ApplicationController
  def index
    events = Event.showcase.includes(:user_events)
    render json: events.map { |event| serialize_event(event) }
  end

  def show
    event = Event.showcase.includes(:user_events).find(params[:id])
    render json: serialize_event(event)
  end

  private

  def serialize_event(event)
    event.as_json.merge("owned_by_me" => owned_by_current_user?(event))
  end

  def owned_by_current_user?(event)
    event.user_events.any? { |membership| membership.user_id == current_user.id && membership.owner? }
  end
end
