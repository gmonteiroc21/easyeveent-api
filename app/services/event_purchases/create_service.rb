module EventPurchases
  class CreateService
    class ValidationError < StandardError
      attr_reader :details

      def initialize(details)
        super("invalid purchase flow")
        @details = details
      end
    end

    Result = Struct.new(:membership, :created, :purchase_payload, keyword_init: true)

    def initialize(event:, user:, purchase_input: {})
      @event = event
      @user = user
      @purchase_input = purchase_input || {}
    end

    def call
      existing = UserEvent.find_by(event_id: @event.id, user_id: @user.id)
      if existing&.participant?
        return Result.new(
          membership: existing,
          created: false,
          purchase_payload: { already_participant: true }
        )
      end

      if existing&.owner?
        raise ValidationError.new(base: ["Usuário owner já está vinculado ao evento."])
      end

      rules = active_rules_by_type
      ticket_data = CheckinRules::Rules::HalfPricePolicyService.new(
        rule: rules["half_price_policy"],
        ticket_type: @purchase_input[:ticket_type]
      ).call!
      capacity_data = run_capacity_limit!(rules["capacity_limit"])
      document_data = CheckinRules::Rules::DocumentCheckService.new(
        rule: rules["document_check"],
        document: @purchase_input[:document]
      ).call!

      membership = UserEvent.transaction do
        UserEvent.create!(
          event: @event,
          user: @user,
          role: :participant,
          document: @purchase_input[:document].to_s.strip.presence
        )
      end

      qr_code_data = CheckinRules::Rules::QrCodeService.new(
        rule: rules["qr_code"],
        event: @event,
        user: @user,
        membership: membership
      ).call

      email_data = CheckinRules::Rules::EmailConfirmationService.new(
        rule: rules["email_confirmation"],
        event: @event,
        user: @user,
        membership: membership,
        ticket_type: ticket_data[:ticket_type],
        payment_method: @purchase_input[:payment_method].to_s,
        price_multiplier: ticket_data[:price_multiplier]
      ).call

      final_price = ((@event.price || 0).to_d * ticket_data[:price_multiplier].to_d).round(2).to_f

      Result.new(
        membership: membership,
        created: true,
        purchase_payload: {
          ticket_type: ticket_data[:ticket_type],
          half_price_applied: ticket_data[:half_price_applied],
          price_multiplier: ticket_data[:price_multiplier],
          final_price: final_price,
          payment_method: @purchase_input[:payment_method].to_s.presence,
          document_check: document_data,
          capacity: capacity_data,
          qr_code: qr_code_data,
          email_confirmation: email_data
        }
      )
    rescue CheckinRules::Rules::RuleViolation => e
      raise ValidationError.new(e.details)
    end

    private

    def active_rules_by_type
      @event.checkin_rules.active.order(:sort_order, :id).group_by(&:rule_type).transform_values(&:first)
    end

    def run_capacity_limit!(rule)
      return nil unless rule

      CheckinRules::Rules::CapacityLimitService.new(event: @event, rule: rule).call!
    end
  end
end
