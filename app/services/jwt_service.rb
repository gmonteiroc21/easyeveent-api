# app/services/jwt_service.rb
class JwtService
  ALGORITHM = "HS256".freeze
  DEFAULT_TTL = 24.hours

  class << self
    def encode(payload, ttl: DEFAULT_TTL)
      now = Time.current
      data = payload.merge(
        iat: now.to_i,
        exp: (now + ttl).to_i
      )

      JWT.encode(data, secret, ALGORITHM)
    end

    def decode(token)
      decoded, = JWT.decode(token, secret, true, { algorithm: ALGORITHM })
      decoded.with_indifferent_access
    end

    private

    # Em desafio técnico, o mais prático é usar ENV.
    # Em produção, você setaria JWT_SECRET no deploy.
    def secret
      ENV.fetch("JWT_SECRET") { Rails.application.secret_key_base }
    end
  end
end