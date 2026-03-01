class CreateEvents < ActiveRecord::Migration[8.1]
  def change
    create_table :events do |t|
      t.datetime :starts_at, null: false
      t.string :location, null: false
      t.decimal :price, precision: 10, scale: 2, null: false, default: 0
      t.string :banner
      t.integer :status, null: false, default: 0

      t.timestamps
    end
  end
end
