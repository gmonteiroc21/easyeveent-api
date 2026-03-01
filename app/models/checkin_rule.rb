class CheckinRule < ApplicationRecord
  belongs_to :event
  has_many :checkins, dependent: :restrict_with_error

  scope :active, -> { where(is_active: true) }

  validates :name, presence: true
  validates :window_before_minutes, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :window_after_minutes, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :sort_order, numericality: { only_integer: true }

  # Recomendo deixar as regras “de conflito de janelas” para a fase da tela de configuração,
  # porque aí você define a lógica final com clareza (overlap, containment, required vs optional etc.).
  # Ainda assim, dá pra colocar validações mínimas agora se quiser.
end