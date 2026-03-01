class AuthController < ApplicationController
  # login é público
  skip_before_action :authorize_request, only: [:login]

  def login
    identifier = params[:identifier].to_s.strip.downcase
    password = params[:password].to_s

    user = User.find_by("LOWER(email) = ? OR LOWER(login) = ?", identifier, identifier)
    return render json: { error: "invalid_credentials" }, status: :unauthorized unless user&.authenticate(password)

    token = JwtService.encode({ sub: user.id })
    
        render json: {
      token: token,
      user: { id: user.id, name: user.name, email: user.email, login: user.login }
    }
  end
end