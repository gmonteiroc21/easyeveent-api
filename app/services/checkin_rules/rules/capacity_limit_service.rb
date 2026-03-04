module CheckinRules
  module Rules
    class CapacityLimitService
      def initialize(event:, rule:)
        @event = event
        @rule = rule
      end

      def call!
        max_users = config_value("max_users")
        participants_count = @event.participant_user_events.count

        return { max_users: max_users, participants_count: participants_count } if participants_count < max_users

        raise RuleViolation.new(
          base: ["Limite de participantes atingido (#{participants_count}/#{max_users})."]
        )
      end

      private

      def config_value(key)
        value = @rule.config[key] || @rule.config[key.to_sym]
        value.to_i
      end
    end
  end
end
