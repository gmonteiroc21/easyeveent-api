module JwtAuthenticatable
  extend ActiveSupport::Concern

  included do
    before_action :authorize_request
    attr_reader :current_user
  end

  private

  def authorize_request
    token = bearer_token
    return render_unauthorized("Missing token") if token.blank?

    payload = JwtService.decode(token)
    @current_user = User.find(payload[:sub])
  rescue ActiveRecord::RecordNotFound
    render_unauthorized("User not found")
  rescue JWT::ExpiredSignature
    render_unauthorized("Token expired")
  rescue JWT::DecodeError
    render_unauthorized("Invalid token")
  end

  def bearer_token
    header = request.headers["Authorization"].to_s
    scheme, token = header.split(" ", 2)
    scheme&.downcase == "bearer" ? token : nil
  end

  def render_unauthorized(message)
    render json: { error: "unauthorized", message: message }, status: :unauthorized
  end
end