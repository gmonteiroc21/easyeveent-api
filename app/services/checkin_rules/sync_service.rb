module CheckinRules
  class SyncService
    def initialize(event:, raw_rules:)
      @event = event
      @raw_rules = raw_rules
    end

    def call
      normalized_rules = ConfigValidator.new(raw_rules: @raw_rules).validate!

      CheckinRule.transaction do
        existing = @event.checkin_rules.index_by(&:id)
        incoming_ids = normalized_rules.map { |rule| rule[:id] }.compact.select(&:positive?)
        unknown_ids = incoming_ids - existing.keys
        if unknown_ids.any?
          raise ConfigValidator::ValidationError.new(base: ["IDs de regra inválidos no payload: #{unknown_ids.join(', ')}"])
        end

        @event.checkin_rules.where.not(id: incoming_ids).destroy_all

        normalized_rules.each_with_index do |rule, index|
          attrs = rule.except(:id).merge(sort_order: index + 1)
          if rule[:id].present? && existing.key?(rule[:id])
            existing[rule[:id]].update!(attrs)
          else
            @event.checkin_rules.create!(attrs)
          end
        end
      end

      @event.checkin_rules.order(:sort_order, :id)
    end
  end
end
