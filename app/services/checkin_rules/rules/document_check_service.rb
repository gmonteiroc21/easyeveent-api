module CheckinRules
  module Rules
    class DocumentCheckService
      def initialize(rule:, document:)
        @rule = rule
        @document = document.to_s.strip
      end

      def call!
        return nil unless @rule

        required_document = config_value("required_document").to_s.strip
        return nil if required_document.blank?

        if @document.blank?
          raise RuleViolation.new(
            base: ["Documento obrigatório não informado (exigido: #{required_document})."]
          )
        end

        {
          required_document: required_document,
          provided_document: @document
        }
      end

      private

      def config_value(key)
        @rule.config[key] || @rule.config[key.to_sym]
      end
    end
  end
end
