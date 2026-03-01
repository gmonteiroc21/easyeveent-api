class ParticipantsController < ApplicationController
  before_action :set_event

  def index
    authorize @event, :index?, policy_class: UserEventPolicy

    participants = @event.user_events.includes(:user).order(created_at: :asc)
    render json: participants.as_json(include: { user: { only: [:id, :name, :email, :login] } })
  end

  def create
    authorize @event, :create?, policy_class: UserEventPolicy

    user = User.find(params.require(:user_id))
    membership = UserEvent.create!(event: @event, user: user, role: :participant)

    render json: membership, status: :created
  rescue ActiveRecord::RecordInvalid => e
    render json: { error: "validation_error", details: e.record.errors }, status: :unprocessable_entity
  end

  def update
    membership = @event.user_events.find(params[:id])
    authorize membership, policy_class: UserEventPolicy

    membership.update!(participant_params)
    render json: membership
  rescue ActiveRecord::RecordInvalid => e
    render json: { error: "validation_error", details: e.record.errors }, status: :unprocessable_entity
  end

  def destroy
    membership = @event.user_events.find(params[:id])
    authorize membership, policy_class: UserEventPolicy

    membership.destroy!
    head :no_content
  end

  # POST /events/:event_id/participants/:id/transfer  { to_event_id: 123 }
  def transfer
    membership = @event.user_events.find(params[:id])
    authorize membership, :transfer?, policy_class: UserEventPolicy

    to_event = Event.find(params.require(:to_event_id))
    authorize to_event, :update? # só transfere para evento que você é owner também

    UserEvent.transaction do
      # remove do evento origem
      membership.destroy!
      # cria vínculo no destino (mesmo user)
      UserEvent.create!(event: to_event, user: membership.user, role: :participant)
    end

    head :no_content
  rescue ActiveRecord::RecordInvalid => e
    render json: { error: "validation_error", details: e.record.errors }, status: :unprocessable_entity
  end

  private

  def set_event
    @event = Event.find(params[:event_id])
  end

  def participant_params
    params.require(:participant).permit(:role)
  end
end