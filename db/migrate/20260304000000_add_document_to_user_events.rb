class AddDocumentToUserEvents < ActiveRecord::Migration[8.0]
  def change
    add_column :user_events, :document, :string
  end
end
