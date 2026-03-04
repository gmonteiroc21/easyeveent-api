class ParticipantsController < ApplicationController
  before_action :set_event

  def index
    authorize @event, :index?, policy_class: UserEventPolicy

    participants = @event.user_events.participant.includes(:user).order(created_at: :asc)
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
    return render json: { error: "validation_error", details: { base: ["Somente participantes podem ser transferidos."] } }, status: :unprocessable_entity if membership.owner?

    to_event = Event.find(params.require(:to_event_id))
    authorize to_event, :update? # só transfere para evento que você é owner também
    if to_event.id == @event.id
      return render json: { error: "validation_error", details: { base: ["Escolha um evento de destino diferente."] } }, status: :unprocessable_entity
    end
    unless compatible_rules?(@event, to_event)
      return render json: { error: "validation_error", details: { base: ["As regras de check-in dos eventos são diferentes."] } }, status: :unprocessable_entity
    end

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

  def compatible_rules?(from_event, to_event)
    canonical_rules(from_event) == canonical_rules(to_event)
  end

  def canonical_rules(event)
    event.checkin_rules
         .active
         .order(:rule_type, :window_before_minutes, :window_after_minutes, :is_required, :is_active)
         .map do |rule|
      {
        "rule_type" => rule.rule_type.to_s,
        "window_before_minutes" => rule.window_before_minutes.to_i,
        "window_after_minutes" => rule.window_after_minutes.to_i,
        "is_required" => rule.is_required ? true : false,
        "is_active" => rule.is_active ? true : false,
        "config" => deep_sort_hash(rule.config.is_a?(Hash) ? rule.config : {})
      }
    end
  end

  def deep_sort_hash(value)
    case value
    when Hash
      value.each_with_object({}) do |(key, nested), acc|
        acc[key.to_s] = deep_sort_hash(nested)
      end.sort.to_h
    when Array
      value.map { |item| deep_sort_hash(item) }
    else
      value
    end
  end
end
