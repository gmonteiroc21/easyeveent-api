class ApplicationController < ActionController::API
  include Pundit::Authorization
  include JwtAuthenticatable

  rescue_from Pundit::NotAuthorizedError, with: :render_forbidden

  private

  def render_forbidden(exception)
    render json: { error: "forbidden", message: exception.message }, status: :forbidden
  end
end