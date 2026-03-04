module CheckinRules
  module Rules
    class RuleViolation < StandardError
      attr_reader :details

      def initialize(details)
        super("checkin rule violation")
        @details = details
      end
    end
  end
end
