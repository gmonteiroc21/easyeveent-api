class EventsController < ApplicationController
  def index
    events = policy_scope(Event).includes(:user_events).order(starts_at: :desc)
    render json: events.map { |event| serialize_event(event) }
  end

  def show
    event = Event.includes(:user_events).find(params[:id])
    authorize event
    render json: serialize_event(event)
  end

  def create
    event = Event.new(event_params)
    authorize event

    Event.transaction do
      event.save!
      UserEvent.create!(user: current_user, event: event, role: :owner)
    end

    render json: event, status: :created
  rescue ActiveRecord::RecordInvalid => e
    render json: { error: "validation_error", details: e.record.errors }, status: :unprocessable_entity
  end

  def update
    event = Event.find(params[:id])
    authorize event

    event.update!(event_params)
    render json: event
  rescue ActiveRecord::RecordInvalid => e
    render json: { error: "validation_error", details: e.record.errors }, status: :unprocessable_entity
  end

  def destroy
    event = Event.find(params[:id])
    authorize event

    event.destroy!
    head :no_content
  end

  private

  def serialize_event(event)
    event.as_json.merge("owned_by_me" => owned_by_current_user?(event))
  end

  def owned_by_current_user?(event)
    event.user_events.any? { |membership| membership.user_id == current_user.id && membership.owner? }
  end

  def event_params
    params.require(:event).permit(:title, :starts_at, :location, :price, :banner, :status)
  end
end
