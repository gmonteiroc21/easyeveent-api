module CheckinRules
  module Rules
    class HalfPricePolicyService
      def initialize(rule:, ticket_type:)
        @rule = rule
        @ticket_type = ticket_type.to_s.presence || "full"
      end

      def call!
        unless %w[full half].include?(@ticket_type)
          raise RuleViolation.new(base: ["ticket_type inválido. Use full ou half."])
        end

        return full_price_payload if @ticket_type == "full"

        unless @rule
          raise RuleViolation.new(base: ["Meia entrada não está habilitada para este evento."])
        end

        ratio = numeric_config("ratio") || 0.5

        {
          ticket_type: "half",
          half_price_applied: true,
          price_multiplier: ratio
        }
      end

      private

      def full_price_payload
        {
          ticket_type: "full",
          half_price_applied: false,
          price_multiplier: 1.0
        }
      end

      def numeric_config(key)
        value = @rule.config[key] || @rule.config[key.to_sym]
        return nil if value.nil?

        value.to_f
      end
    end
  end
end
