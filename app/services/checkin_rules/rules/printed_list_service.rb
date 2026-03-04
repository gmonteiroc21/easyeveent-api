module CheckinRules
  module Rules
    class PrintedListService
      def initialize(event:, rule: nil)
        @event = event
        @rule = rule
      end

      def call
        participants = @event.participant_user_events.includes(:user).order(created_at: :asc)
        format = list_format

        {
          format: format,
          file_name: "event-#{@event.id}-participants.#{format}",
          content: generate_content(participants, format),
          participants_count: participants.size
        }
      end

      private

      def list_format
        return "csv" unless @rule

        raw = @rule.config["format"] || @rule.config[:format]
        %w[csv pdf].include?(raw.to_s) ? raw.to_s : "csv"
      end

      def generate_content(participants, format)
        case format
        when "pdf"
          generate_plain_text_list(participants)
        else
          generate_csv(participants)
        end
      end

      def generate_csv(participants)
        lines = csv_headers

        participants.each do |membership|
          row = [
            membership.id,
            membership.user_id,
            csv_escape(membership.user.name),
            csv_escape(membership.user.email),
            csv_escape(membership.user.login),
            membership.created_at.iso8601
          ]
          row << csv_escape(membership.document) if include_document_column?
          lines << row.join(",")
        end

        lines.join("\n")
      end

      def generate_plain_text_list(participants)
        lines = ["Lista de participantes - Evento ##{@event.id}"]
        participants.each do |membership|
          lines << "- #{membership.user.name} (#{membership.user.email})"
        end
        lines.join("\n")
      end

      def csv_escape(value)
        escaped = value.to_s.gsub('"', '""')
        %("#{escaped}")
      end

      def csv_headers
        headers = ["membership_id,user_id,name,email,login,joined_at"]
        if include_document_column?
          headers = ["membership_id,user_id,name,email,login,joined_at,document"]
        end
        headers
      end

      def include_document_column?
        @include_document_column ||= @event.checkin_rules.active.exists?(rule_type: "document_check")
      end
    end
  end
end
