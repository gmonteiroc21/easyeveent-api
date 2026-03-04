module CheckinRules
  module Rules
    class QrCodeService
      def initialize(rule:, event:, user:, membership:)
        @rule = rule
        @event = event
        @user = user
        @membership = membership
      end

      def call
        return nil unless @rule

        ttl = expires_in_minutes ? expires_in_minutes.minutes : JwtService::DEFAULT_TTL
        expires_at = Time.current + ttl

        token = JwtService.encode(
          {
            purpose: "event_access",
            event_id: @event.id,
            user_id: @user.id,
            user_event_id: @membership.id
          },
          ttl: ttl
        )

        {
          token: token,
          expires_at: expires_at.iso8601,
          single_use: ActiveModel::Type::Boolean.new.cast(config_value("single_use"))
        }
      end

      private

      def expires_in_minutes
        value = config_value("expires_in_minutes")
        return nil if value.nil?

        int_value = value.to_i
        int_value.positive? ? int_value : nil
      end

      def config_value(key)
        @rule.config[key] || @rule.config[key.to_sym]
      end
    end
  end
end
