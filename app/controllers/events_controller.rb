class EventsController < ApplicationController
  def index
    events = policy_scope(Event).includes(:user_events).order(starts_at: :desc)
    render json: events.map { |event| serialize_event(event) }
  end

  def show
    event = Event.find(params[:id])
    authorize event
    render json: serialize_event(event, include_checkin_confirmation: true)
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

  def purchase
    event = Event.find(params[:id])
    authorize event, :purchase?

    result = EventPurchases::CreateService.new(
      event: event,
      user: current_user,
      purchase_input: purchase_params
    ).call

    status = result.created ? :created : :ok
    render json: {
      membership: result.membership,
      purchase: result.purchase_payload
    }, status: status
  rescue EventPurchases::CreateService::ValidationError => e
    render json: { error: "validation_error", details: e.details }, status: :unprocessable_entity
  rescue ActiveRecord::RecordInvalid => e
    render json: { error: "validation_error", details: e.record.errors }, status: :unprocessable_entity
  end

  private

  def serialize_event(event, include_checkin_confirmation: false)
    memberships = event.user_events
    memberships = memberships.to_a unless memberships.respond_to?(:loaded?) && memberships.loaded?
    live_count = CheckinRules::Rules::LiveCountService.new(event: event).call

    payload = event.as_json.merge(
      "owned_by_me" => owned_by_current_user?(memberships),
      "participants_live_count" => live_count[:participants_count],
      "participants_live_count_visible" => live_count[:visible],
      "participants_live_count_refresh_seconds" => live_count[:refresh_seconds],
      "checkin_rules" => serialize_rules(event)
    )

    if include_checkin_confirmation
      payload["checkin_confirmation"] = build_checkin_confirmation(event)
    end

    payload
  end

  def owned_by_current_user?(memberships)
    memberships.any? { |membership| membership.user_id == current_user.id && membership.owner? }
  end

  def build_checkin_confirmation(event)
    membership = event.user_events.find_by(user_id: current_user.id)
    return nil if membership.nil?

    active_required_rules = event.checkin_rules.active.where(is_required: true)
    required_rules_count = active_required_rules.count
    checked_required_rules_count = membership.checkins.where(checkin_rule_id: active_required_rules.select(:id)).count
    total_checkins_count = membership.checkins.count

    checked_in =
      if required_rules_count.positive?
        checked_required_rules_count >= required_rules_count
      else
        total_checkins_count.positive?
      end

    {
      "role" => membership.role,
      "checked_in" => checked_in,
      "total_checkins_count" => total_checkins_count,
      "required_rules_count" => required_rules_count,
      "checked_required_rules_count" => checked_required_rules_count,
      "last_checkin_at" => membership.checkins.maximum(:checked_in_at)
    }
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

  def event_params
    params.require(:event).permit(:title, :description, :starts_at, :location, :price, :banner, :status)
  end

  def purchase_params
    params.permit(:ticket_type, :payment_method, :document).to_h.symbolize_keys
  end
end
