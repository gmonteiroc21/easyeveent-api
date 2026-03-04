class CheckinRule < ApplicationRecord
  RULE_TYPES = %w[
    time_window
    capacity_limit
    live_count
    visibility_toggle
    half_price_policy
    qr_code
    printed_list
    email_confirmation
    document_check
  ].freeze

  belongs_to :event
  has_many :checkins, dependent: :restrict_with_error

  scope :active, -> { where(is_active: true) }

  attribute :rule_type, :string, default: "time_window"
  attribute :config, :json, default: {}

  validates :name, presence: true
  validates :rule_type, presence: true, inclusion: { in: RULE_TYPES }
  validates :window_before_minutes, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :window_after_minutes, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :sort_order, numericality: { only_integer: true }
  validate :config_must_be_object
  before_validation :set_default_name

  # Recomendo deixar as regras “de conflito de janelas” para a fase da tela de configuração,
  # porque aí você define a lógica final com clareza (overlap, containment, required vs optional etc.).
  # Ainda assim, dá pra colocar validações mínimas agora se quiser.

  private

  def config_must_be_object
    return if config.is_a?(Hash)

    errors.add(:config, "deve ser um objeto JSON")
  end

  def set_default_name
    self.name = rule_type.to_s if name.to_s.strip.blank?
  end
end
