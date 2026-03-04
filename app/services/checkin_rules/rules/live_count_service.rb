module CheckinRules
  module Rules
    class LiveCountService
      def initialize(event:)
        @event = event
      end

      def call
        live_rule = active_rule("live_count")
        return hidden_payload unless live_rule

        visibility_rule = active_rule("visibility_toggle")
        visible = show_live_count?(visibility_rule)
        participants_count = visible ? @event.participant_user_events.count : nil

        {
          visible: visible,
          participants_count: participants_count,
          refresh_seconds: integer_config(live_rule, "refresh_seconds")
        }
      end

      private

      def hidden_payload
        {
          visible: false,
          participants_count: nil,
          refresh_seconds: nil
        }
      end

      def active_rule(rule_type)
        @event.checkin_rules.active.where(rule_type: rule_type).order(:sort_order, :id).first
      end

      def show_live_count?(visibility_rule)
        return true unless visibility_rule

        value = config_value(visibility_rule, "show_live_count")
        ActiveModel::Type::Boolean.new.cast(value)
      end

      def integer_config(rule, key)
        raw = config_value(rule, key)
        return nil if raw.nil?

        raw.to_i
      end

      def config_value(rule, key)
        if rule.config.is_a?(Hash)
          return rule.config[key] if rule.config.key?(key)
          return rule.config[key.to_sym] if rule.config.key?(key.to_sym)
        end

        nil
      end
    end
  end
end
