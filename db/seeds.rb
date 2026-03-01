ActiveRecord::Base.transaction do
  puts "Limpando dados..."
  # Ordem importa por causa das FKs
  Checkin.delete_all
  CheckinRule.delete_all
  UserEvent.delete_all
  Event.delete_all
  User.delete_all

  puts "Criando usuários..."
  owner = User.create!(
    name: "Owner Demo",
    login: "owner",
    email: "owner@demo.com",
    phone: "+55 81 99999-0001",
    photo: nil,
    password: "123456",
    password_confirmation: "123456"
  )

  participant1 = User.create!(
    name: "Participant 1",
    login: "p1",
    email: "p1@demo.com",
    phone: "+55 81 99999-0002",
    photo: nil,
    password: "123456",
    password_confirmation: "123456"
  )

  participant2 = User.create!(
    name: "Participant 2",
    login: "p2",
    email: "p2@demo.com",
    phone: "+55 81 99999-0003",
    photo: nil,
    password: "123456",
    password_confirmation: "123456"
  )

  puts "Criando evento..."
  event = Event.create!(
    starts_at: 10.days.from_now.change(hour: 19, min: 0),
    location: "Recife - PE",
    price: 0,
    banner: nil,
    status: :published
  )

  puts "Vinculando usuários ao evento..."
  owner_membership = UserEvent.create!(
    user: owner,
    event: event,
    role: :owner
  )

  p1_membership = UserEvent.create!(
    user: participant1,
    event: event,
    role: :participant
  )

  p2_membership = UserEvent.create!(
    user: participant2,
    event: event,
    role: :participant
  )

  puts "Criando regras de check-in..."
  rule_required = CheckinRule.create!(
    event: event,
    name: "Check-in padrão",
    window_before_minutes: 60,
    window_after_minutes: 15,
    is_required: true,
    is_active: true,
    sort_order: 1
  )

  rule_optional = CheckinRule.create!(
    event: event,
    name: "Check-in de confirmação (opcional)",
    window_before_minutes: 10,
    window_after_minutes: 10,
    is_required: false,
    is_active: true,
    sort_order: 2
  )

  puts "Criando alguns check-ins (exemplo)..."
  Checkin.create!(
    user_event: p1_membership,
    checkin_rule: rule_required,
    checked_in_at: event.starts_at - 30.minutes
  )

  Checkin.create!(
    user_event: p2_membership,
    checkin_rule: rule_required,
    checked_in_at: event.starts_at - 10.minutes
  )

  puts "Seeds concluídas!"
  puts "Login demo (para JWT): owner@demo.com / 123456"
end