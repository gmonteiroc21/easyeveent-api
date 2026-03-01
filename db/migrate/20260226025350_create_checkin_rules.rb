class CreateCheckinRules < ActiveRecord::Migration[8.1]
  def change
    create_table :checkin_rules do |t|
      t.references :event, null: false, foreign_key: true
      t.string :name, null: false
      t.integer :window_before_minutes, null: false, default: 0
      t.integer :window_after_minutes, null: false, default: 0
      t.boolean :is_required, null: false, default: false
      t.boolean :is_active, null: false, default: true
      t.integer :sort_order, null: false, default: true

      t.timestamps
    end
    add_index :checkin_rules, [:event_id, :is_active]
  end
end
