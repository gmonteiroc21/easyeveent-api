class CreateUserEvents < ActiveRecord::Migration[8.1]
  def change
    create_table :user_events do |t|
      t.references :user, null: false, foreign_key: true
      t.references :event, null: false, foreign_key: true
      t.integer :role, null: false, default: 1

      t.timestamps
    end
    add_index :user_events, [:user_id, :event_id], unique: true
    add_index :user_events, [:event_id, :role]
  end
end
