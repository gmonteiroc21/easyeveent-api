class MeController < ApplicationController
  # GET /me
  def show
    render json: {
      id: current_user.id,
      name: current_user.name,
      email: current_user.email,
      login: current_user.login
    }
  end
end