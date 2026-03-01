class UserEvent < ApplicationRecord
  belongs_to :user
  belongs_to :event
  has_many :checkins, dependent: :destroy

  enum :role, { owner: 0, participant: 1 }

  validates :role, presence: true
  validates :user_id, uniqueness: { scope: :event_id } # já existe index unique no banco
end