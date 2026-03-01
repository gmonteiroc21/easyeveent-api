class EventsController < ApplicationController
  def index
    events = policy_scope(Event).order(starts_at: :desc)
    render json: events
  end

  def show
    event = Event.find(params[:id])
    authorize event
    render json: event
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

  def event_params
    params.require(:event).permit(:starts_at, :location, :price, :banner, :status)
  end
end