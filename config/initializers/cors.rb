Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    # Dev: Vite (5173), CRA (3000), etc.
    origins "http://localhost:5173", "http://localhost:3001", "http://127.0.0.1:5173"

    resource "*",
      headers: :any,
      expose: ["Authorization"],
      methods: %i[get post put patch delete options head],
      max_age: 600
  end
end