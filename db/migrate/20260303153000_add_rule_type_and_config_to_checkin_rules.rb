class AddRuleTypeAndConfigToCheckinRules < ActiveRecord::Migration[8.1]
  def change
    add_column :checkin_rules, :rule_type, :string, null: false, default: "time_window"
    add_column :checkin_rules, :config, :jsonb, null: false, default: {}

    add_index :checkin_rules, [:event_id, :rule_type]
  end
end
