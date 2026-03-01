class Checkin < ApplicationRecord
  belongs_to :user_event
  belongs_to :checkin_rule

  validates :checked_in_at, presence: true
  validates :checkin_rule_id, uniqueness: { scope: :user_event_id }

  validate :rule_must_belong_to_same_event

  delegate :user, :event, to: :user_event

  private

  def rule_must_belong_to_same_event
    return if user_event.nil? || checkin_rule.nil?
    return if user_event.event_id == checkin_rule.event_id

    errors.add(:checkin_rule, "não pertence ao mesmo evento do participante")
  end
end