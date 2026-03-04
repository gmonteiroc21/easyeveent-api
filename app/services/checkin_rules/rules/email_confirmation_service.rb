module CheckinRules
  module Rules
    class EmailConfirmationService
      def initialize(rule:, event:, user:, membership:, ticket_type:, payment_method:, price_multiplier:)
        @rule = rule
        @event = event
        @user = user
        @membership = membership
        @ticket_type = ticket_type
        @payment_method = payment_method
        @price_multiplier = price_multiplier
      end

      def call
        return nil unless @rule
        return nil unless send_on_purchase?

        subject = config_value("subject").to_s.strip
        subject = "Confirmação de compra - #{@event.title}" if subject.blank?

        Rails.logger.info(
          "[email_confirmation_simulated] event_id=#{@event.id} user_id=#{@user.id} membership_id=#{@membership.id} " \
          "ticket_type=#{@ticket_type} payment_method=#{@payment_method} subject=#{subject.inspect}"
        )

        { sent: true, simulated: true, send_on: "purchase", subject: subject }
      end

      private

      def send_on_purchase?
        config_value("send_on").to_s == "purchase"
      end

      def config_value(key)
        @rule.config[key] || @rule.config[key.to_sym]
      end
    end
  end
end
