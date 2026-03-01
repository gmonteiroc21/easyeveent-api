class CreateCheckins < ActiveRecord::Migration[8.1]
  def change
    create_table :checkins do |t|
      t.references :user_event, null: false, foreign_key: true
      t.references :checkin_rule, null: false, foreign_key: true
      t.datetime :checked_in_at, null: false,  default: -> { "CURRENT_TIMESTAMP" }

      t.timestamps
    end
    add_index :checkins, [:user_event_id, :checkin_rule_id], unique: true
  end
end
