# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_03_01_120000) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "checkin_rules", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "event_id", null: false
    t.boolean "is_active", default: true, null: false
    t.boolean "is_required", default: false, null: false
    t.string "name", null: false
    t.integer "sort_order", default: 1, null: false
    t.datetime "updated_at", null: false
    t.integer "window_after_minutes", default: 0, null: false
    t.integer "window_before_minutes", default: 0, null: false
    t.index ["event_id", "is_active"], name: "index_checkin_rules_on_event_id_and_is_active"
    t.index ["event_id"], name: "index_checkin_rules_on_event_id"
  end

  create_table "checkins", force: :cascade do |t|
    t.datetime "checked_in_at", default: -> { "CURRENT_TIMESTAMP" }, null: false
    t.bigint "checkin_rule_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_event_id", null: false
    t.index ["checkin_rule_id"], name: "index_checkins_on_checkin_rule_id"
    t.index ["user_event_id", "checkin_rule_id"], name: "index_checkins_on_user_event_id_and_checkin_rule_id", unique: true
    t.index ["user_event_id"], name: "index_checkins_on_user_event_id"
  end

  create_table "events", force: :cascade do |t|
    t.string "banner"
    t.datetime "created_at", null: false
    t.string "location", null: false
    t.decimal "price", precision: 10, scale: 2, default: "0.0", null: false
    t.datetime "starts_at", null: false
    t.integer "status", default: 0, null: false
    t.string "title", null: false
    t.datetime "updated_at", null: false
  end

  create_table "user_events", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "event_id", null: false
    t.integer "role", default: 1, null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["event_id", "role"], name: "index_user_events_on_event_id_and_role"
    t.index ["event_id"], name: "index_user_events_on_event_id"
    t.index ["user_id", "event_id"], name: "index_user_events_on_user_id_and_event_id", unique: true
    t.index ["user_id"], name: "index_user_events_on_user_id"
  end

  create_table "users", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "email", null: false
    t.string "login", null: false
    t.string "name", null: false
    t.string "password_digest", null: false
    t.string "phone"
    t.string "photo"
    t.string "role"
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["login"], name: "index_users_on_login", unique: true
  end

  add_foreign_key "checkin_rules", "events"
  add_foreign_key "checkins", "checkin_rules"
  add_foreign_key "checkins", "user_events"
  add_foreign_key "user_events", "events"
  add_foreign_key "user_events", "users"
end
