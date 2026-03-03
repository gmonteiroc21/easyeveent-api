class AddDescriptionToEvents < ActiveRecord::Migration[8.1]
  def change
    add_column :events, :description, :text
  end
end
