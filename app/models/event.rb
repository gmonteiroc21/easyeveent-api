class Event < ApplicationRecord
  # Relacionamentos
  has_many :user_events, dependent: :destroy
  has_many :users, through: :user_events

  has_one :owner_user_event, -> { owner }, class_name: "UserEvent"
  has_one :owner, through: :owner_user_event, source: :user

  has_many :participant_user_events, -> { participant }, class_name: "UserEvent"
  has_many :participants, through: :participant_user_events, source: :user

  has_many :checkin_rules, dependent: :destroy
  has_many :checkins, through: :user_events

  # Enum
  enum :status, { draft: 0, published: 1, cancelled: 2, finished: 3 }

  # Validações
  validates :title, presence: true
  validates :starts_at, presence: true
  validates :location, presence: true
  validates :price, numericality: { greater_than_or_equal_to: 0 }

  # (opcional) se quiser impedir eventos no passado ao publicar:
  # validate :starts_at_cannot_be_in_past, if: :published?

  # private
  # def starts_at_cannot_be_in_past
  #   errors.add(:starts_at, "não pode ser no passado") if starts_at.present? && starts_at < Time.current
  # end
end
