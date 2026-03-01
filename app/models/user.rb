class User < ApplicationRecord
    has_secure_password

    # relationships
    has_many :user_events, dependent: :destroy
    has_many :events, through: :user_events

    # views
    has_many :owned_user_events, -> { owner }, class_name: "UserEvent"
    has_many :owned_events, through: :owned_user_events, source: :event

    has_many :participant_user_events, -> { participant }, class_name: "UserEvent"
    has_many :participating_events, through: :participant_user_events, source: :event

    # Validações
    validates :name, presence: true
    validates :login, presence: true, uniqueness: { case_sensitive: false }
    validates :email, presence: true, uniqueness: { case_sensitive: false },
                        format: { with: URI::MailTo::EMAIL_REGEXP }

    before_validation :normalize_auth_fields

    private

    def normalize_auth_fields
        self.email = email.to_s.strip.downcase
        self.login = login.to_s.strip.downcase
    end
    end
