ActiveRecord::Base.transaction do
  puts "Limpando dados..."
  Checkin.delete_all
  CheckinRule.delete_all
  UserEvent.delete_all
  Event.delete_all
  User.delete_all

  puts "Criando usuários..."
  users = [
    { name: "Ana Monteiro", login: "ana", email: "ana@demo.com", phone: "+55 81 99999-1001" },
    { name: "Bruno Sales", login: "bruno", email: "bruno@demo.com", phone: "+55 81 99999-1002" },
    { name: "Carla Nunes", login: "carla", email: "carla@demo.com", phone: "+55 81 99999-1003" },
    { name: "Diego Lima", login: "diego", email: "diego@demo.com", phone: "+55 81 99999-1004" },
    { name: "Ester Rocha", login: "ester", email: "ester@demo.com", phone: "+55 81 99999-1005" },
    { name: "Felipe Souza", login: "felipe", email: "felipe@demo.com", phone: "+55 81 99999-1006" },
    { name: "Gabriela Cruz", login: "gabriela", email: "gabriela@demo.com", phone: "+55 81 99999-1007" },
    { name: "Henrique Dias", login: "henrique", email: "henrique@demo.com", phone: "+55 81 99999-1008" },
    { name: "Isabela Melo", login: "isabela", email: "isabela@demo.com", phone: "+55 81 99999-1009" },
    { name: "Joao Teixeira", login: "joao", email: "joao@demo.com", phone: "+55 81 99999-1010" },
    { name: "Karla Silva", login: "karla", email: "karla@demo.com", phone: "+55 81 99999-1011" },
    { name: "Lucas Araujo", login: "lucas", email: "lucas@demo.com", phone: "+55 81 99999-1012" }
  ].map do |attrs|
    User.create!(
      attrs.merge(password: "123456", password_confirmation: "123456", photo: nil)
    )
  end

  puts "Criando eventos..."
  events = {}
  events[:tech_summit] = Event.create!(
    title: "Tech Summit Recife 2026",
    description: "Conferencia de tecnologia com trilhas de backend, frontend e produto.",
    starts_at: 8.days.from_now.change(hour: 9, min: 0),
    location: "Porto Digital - Recife",
    price: 180.00,
    banner: nil,
    status: :published
  )

  events[:music_night] = Event.create!(
    title: "Noite Indie na Rua do Bom Jesus",
    description: "Show com bandas locais e experiencia ao ar livre.",
    starts_at: 14.days.from_now.change(hour: 20, min: 0),
    location: "Recife Antigo",
    price: 75.00,
    banner: nil,
    status: :published
  )

  events[:startup_day] = Event.create!(
    title: "Startup Day Nordeste",
    description: "Pitchs, mentorias e networking com investidores.",
    starts_at: 21.days.from_now.change(hour: 10, min: 0),
    location: "Centro de Convencoes",
    price: 120.00,
    banner: nil,
    status: :published
  )

  events[:design_workshop] = Event.create!(
    title: "Workshop de Design de Interfaces",
    description: "Evento pratico com foco em UX/UI e prototipagem.",
    starts_at: 28.days.from_now.change(hour: 14, min: 0),
    location: "Cais do Sertao",
    price: 0.00,
    banner: nil,
    status: :published
  )

  events[:data_meetup] = Event.create!(
    title: "Data & AI Meetup",
    description: "Painel tecnico sobre dados, IA aplicada e governanca.",
    starts_at: 35.days.from_now.change(hour: 18, min: 30),
    location: "SENAC Recife",
    price: 95.00,
    banner: nil,
    status: :published
  )

  puts "Criando vinculos owner..."
  owners = {
    tech_summit: users[0],
    music_night: users[1],
    startup_day: users[2],
    design_workshop: users[3],
    data_meetup: users[4]
  }

  owners.each do |event_key, owner_user|
    UserEvent.create!(user: owner_user, event: events.fetch(event_key), role: :owner)
  end

  puts "Criando participantes (com variacao de inscricao)..."
  memberships = []
  memberships << UserEvent.create!(user: users[5], event: events[:tech_summit], role: :participant, document: "123.456.789-00")
  memberships << UserEvent.create!(user: users[6], event: events[:tech_summit], role: :participant, document: "987.654.321-00")
  memberships << UserEvent.create!(user: users[7], event: events[:tech_summit], role: :participant, document: "111.222.333-44")
  memberships << UserEvent.create!(user: users[8], event: events[:tech_summit], role: :participant, document: "555.666.777-88")

  memberships << UserEvent.create!(user: users[0], event: events[:music_night], role: :participant)
  memberships << UserEvent.create!(user: users[9], event: events[:music_night], role: :participant)
  memberships << UserEvent.create!(user: users[10], event: events[:music_night], role: :participant)

  memberships << UserEvent.create!(user: users[1], event: events[:startup_day], role: :participant, document: "444.555.666-77")
  memberships << UserEvent.create!(user: users[11], event: events[:startup_day], role: :participant, document: "222.333.444-55")
  memberships << UserEvent.create!(user: users[7], event: events[:startup_day], role: :participant, document: "999.888.777-66")

  memberships << UserEvent.create!(user: users[2], event: events[:design_workshop], role: :participant)
  memberships << UserEvent.create!(user: users[5], event: events[:design_workshop], role: :participant)

  memberships << UserEvent.create!(user: users[6], event: events[:data_meetup], role: :participant)
  memberships << UserEvent.create!(user: users[8], event: events[:data_meetup], role: :participant)
  memberships << UserEvent.create!(user: users[10], event: events[:data_meetup], role: :participant)

  puts "Criando regras de check-in variadas..."
  def add_rule(event:, sort:, type:, active: true, required: false, before: 0, after: 0, config: {})
    CheckinRule.create!(
      event: event,
      rule_type: type,
      name: type.humanize,
      is_active: active,
      is_required: required,
      window_before_minutes: before,
      window_after_minutes: after,
      sort_order: sort,
      config: config
    )
  end

  # Evento 1: conjunto completo com validacoes mais fortes
  add_rule(event: events[:tech_summit], sort: 1, type: "qr_code", required: true, config: { expires_in_minutes: 60, single_use: true })
  add_rule(event: events[:tech_summit], sort: 2, type: "printed_list", config: { format: "csv" })
  add_rule(event: events[:tech_summit], sort: 3, type: "email_confirmation", config: { send_on: "purchase", subject: "Ingresso confirmado - Tech Summit" })
  add_rule(event: events[:tech_summit], sort: 4, type: "capacity_limit", required: true, config: { max_users: 6 })
  add_rule(event: events[:tech_summit], sort: 5, type: "document_check", required: true, config: { required_document: "CPF" })
  add_rule(event: events[:tech_summit], sort: 6, type: "half_price_policy", config: { ratio: 0.5, quota: 2 })
  add_rule(event: events[:tech_summit], sort: 7, type: "live_count", config: { refresh_seconds: 15 })

  # Evento 2: fluxo padrao de confirmacao
  add_rule(event: events[:music_night], sort: 1, type: "qr_code", config: { expires_in_minutes: 90, single_use: false })
  add_rule(event: events[:music_night], sort: 2, type: "printed_list", config: { format: "pdf" })
  add_rule(event: events[:music_night], sort: 3, type: "email_confirmation", config: { send_on: "purchase" })
  add_rule(event: events[:music_night], sort: 4, type: "live_count", config: { refresh_seconds: 20 })

  # Evento 3: valida documento + capacidade
  add_rule(event: events[:startup_day], sort: 1, type: "qr_code", required: true, config: { expires_in_minutes: 45, single_use: true })
  add_rule(event: events[:startup_day], sort: 2, type: "document_check", required: true, config: { required_document: "RG" })
  add_rule(event: events[:startup_day], sort: 3, type: "capacity_limit", config: { max_users: 8 })
  add_rule(event: events[:startup_day], sort: 4, type: "printed_list", config: { format: "csv" })

  # Evento 4: evento gratuito com menos restricoes
  add_rule(event: events[:design_workshop], sort: 1, type: "qr_code", config: { expires_in_minutes: 120, single_use: false })
  add_rule(event: events[:design_workshop], sort: 2, type: "email_confirmation", config: { send_on: "purchase", subject: "Confirmacao Workshop Design" })
  add_rule(event: events[:design_workshop], sort: 3, type: "live_count", config: { refresh_seconds: 30 })

  # Evento 5: meia entrada + lista + capacidade
  add_rule(event: events[:data_meetup], sort: 1, type: "qr_code", config: { expires_in_minutes: 60, single_use: true })
  add_rule(event: events[:data_meetup], sort: 2, type: "printed_list", config: { format: "csv" })
  add_rule(event: events[:data_meetup], sort: 3, type: "capacity_limit", required: true, config: { max_users: 10 })
  add_rule(event: events[:data_meetup], sort: 4, type: "half_price_policy", config: { ratio: 0.5, quota: 3 })
  add_rule(event: events[:data_meetup], sort: 5, type: "email_confirmation", config: { send_on: "purchase" })

  puts "Criando check-ins de exemplo..."
  required_rule_event_1 = events[:tech_summit].checkin_rules.find_by!(rule_type: "qr_code")
  Checkin.create!(user_event: memberships[0], checkin_rule: required_rule_event_1, checked_in_at: events[:tech_summit].starts_at - 20.minutes)
  Checkin.create!(user_event: memberships[1], checkin_rule: required_rule_event_1, checked_in_at: events[:tech_summit].starts_at - 10.minutes)

  puts "Seeds concluídas!"
  puts "Usuarios criados: #{User.count} | Eventos criados: #{Event.count} | Vinculos: #{UserEvent.count} | Regras: #{CheckinRule.count}"
  puts "Senha padrao de todos os usuarios: 123456"
  puts "Exemplo de login: ana@demo.com"
end
