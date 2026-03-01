class CheckinRulesController < ApplicationController
  before_action :set_event
  before_action :set_rule, only: [:show, :update, :destroy]

  def index
    authorize CheckinRule.new(event: @event), :index?

    rules = policy_scope(CheckinRule).where(event_id: @event.id).order(:sort_order, :id)
    render json: rules
  end

  def show
    authorize @rule
    render json: @rule
  end

  def create
    rule = @event.checkin_rules.new(rule_params)
    authorize rule

    rule.save!
    render json: rule, status: :created
  rescue ActiveRecord::RecordInvalid => e
    render json: { error: "validation_error", details: e.record.errors }, status: :unprocessable_entity
  end

  def update
    authorize @rule

    @rule.update!(rule_params)
    render json: @rule
  rescue ActiveRecord::RecordInvalid => e
    render json: { error: "validation_error", details: e.record.errors }, status: :unprocessable_entity
  end

  def destroy
    authorize @rule

    @rule.destroy!
    head :no_content
  end

  private

  def set_event
    @event = Event.find(params[:event_id])
  end

  def set_rule
    @rule = @event.checkin_rules.find(params[:id])
  end

  def rule_params
    params.require(:checkin_rule).permit(
      :name, :window_before_minutes, :window_after_minutes, :is_required, :is_active, :sort_order
    )
  end
end