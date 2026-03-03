module CheckinRules
  class ConfigValidator
    class ValidationError < StandardError
      attr_reader :details

      def initialize(details)
        super("invalid checkin rules config")
        @details = details
      end
    end

    def initialize(raw_rules:)
      @raw_rules = Array(raw_rules)
    end

    def validate!
      errors = []

      errors << "Informe ao menos uma regra." if @raw_rules.empty?

      normalized = @raw_rules.map.with_index do |raw, index|
        normalize_rule(raw, index, errors)
      end.compact

      if normalized.none? { |rule| rule[:is_active] }
        errors << "Pelo menos uma regra ativa é obrigatória."
      end

      validate_required_windows_intersection!(normalized, errors)

      raise ValidationError.new(base: errors) if errors.any?

      normalized
    end

    private

    def normalize_rule(raw, index, errors)
      unless raw.is_a?(ActionController::Parameters) || raw.is_a?(Hash)
        errors << "Regra ##{index + 1}: payload inválido."
        return nil
      end

      attrs = raw.to_h.symbolize_keys
      type = attrs[:rule_type].to_s

      unless CheckinRule::RULE_TYPES.include?(type)
        errors << "Regra ##{index + 1}: rule_type inválido."
      end

      name = attrs[:name].to_s.strip
      errors << "Regra ##{index + 1}: name é obrigatório." if name.blank?

      before = to_non_negative_integer(attrs[:window_before_minutes], "window_before_minutes", index, errors)
      after = to_non_negative_integer(attrs[:window_after_minutes], "window_after_minutes", index, errors)
      sort_order = to_integer(attrs[:sort_order], "sort_order", index, errors)
      is_required = ActiveModel::Type::Boolean.new.cast(attrs[:is_required])
      is_active = ActiveModel::Type::Boolean.new.cast(attrs[:is_active])

      config = attrs[:config]
      config = {} if config.nil?
      unless config.is_a?(Hash)
        errors << "Regra ##{index + 1}: config deve ser objeto."
        config = {}
      end

      validate_type_config(type, config, index, errors)

      {
        id: attrs[:id]&.to_i,
        rule_type: type,
        name: name,
        window_before_minutes: before || 0,
        window_after_minutes: after || 0,
        is_required: is_required,
        is_active: is_active,
        sort_order: sort_order || (index + 1),
        config: config
      }
    end

    def validate_required_windows_intersection!(rules, errors)
      required_active = rules.filter { |rule| rule[:is_active] && rule[:is_required] }
      return if required_active.size < 2

      start_at = required_active.map { |rule| -rule[:window_before_minutes] }.max
      end_at = required_active.map { |rule| rule[:window_after_minutes] }.min

      errors << "Conflito: regras obrigatórias ativas sem interseção válida de janela." if start_at > end_at
    end

    def validate_type_config(type, config, index, errors)
      case type
      when "capacity_limit"
        max_users = config["max_users"] || config[:max_users]
        unless max_users.is_a?(Integer) && max_users.positive?
          errors << "Regra ##{index + 1}: capacity_limit exige config.max_users inteiro > 0."
        end
      when "half_price_policy"
        ratio = config["ratio"] || config[:ratio]
        quota = config["quota"] || config[:quota]
        unless ratio.is_a?(Numeric) && ratio.positive? && ratio <= 1
          errors << "Regra ##{index + 1}: half_price_policy exige config.ratio > 0 e <= 1."
        end
        if !quota.nil? && !(quota.is_a?(Integer) && quota >= 0)
          errors << "Regra ##{index + 1}: half_price_policy exige config.quota inteiro >= 0."
        end
      when "qr_code"
        expires = config["expires_in_minutes"] || config[:expires_in_minutes]
        if !expires.nil? && !(expires.is_a?(Integer) && expires.positive?)
          errors << "Regra ##{index + 1}: qr_code exige config.expires_in_minutes inteiro > 0."
        end
      when "printed_list"
        format = config["format"] || config[:format]
        if !format.nil? && !%w[csv pdf].include?(format.to_s)
          errors << "Regra ##{index + 1}: printed_list exige config.format em csv|pdf."
        end
      when "email_confirmation"
        send_on = config["send_on"] || config[:send_on]
        if !send_on.nil? && !%w[purchase checkin].include?(send_on.to_s)
          errors << "Regra ##{index + 1}: email_confirmation exige config.send_on em purchase|checkin."
        end
      end
    end

    def to_non_negative_integer(value, field, index, errors)
      parsed = to_integer(value, field, index, errors)
      if !parsed.nil? && parsed.negative?
        errors << "Regra ##{index + 1}: #{field} não pode ser negativo."
      end
      parsed
    end

    def to_integer(value, field, index, errors)
      return nil if value.nil?
      return value if value.is_a?(Integer)
      return value.to_i if value.is_a?(String) && value.match?(/\A-?\d+\z/)

      errors << "Regra ##{index + 1}: #{field} deve ser inteiro."
      nil
    end
  end
end
