class AddTitleToEvents < ActiveRecord::Migration[8.1]
  def up
    add_column :events, :title, :string

    execute <<~SQL
      UPDATE events
      SET title = COALESCE(NULLIF(location, ''), 'Evento sem titulo')
      WHERE title IS NULL
    SQL

    change_column_null :events, :title, false
  end

  def down
    remove_column :events, :title
  end
end
