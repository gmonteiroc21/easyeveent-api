Rails.application.routes.draw do
  post "/auth/login", to: "auth#login"
  get  "/me",         to: "me#show"
  get  "/dashboard/events", to: "dashboard_events#index"
  get  "/dashboard/events/:id", to: "dashboard_events#show"

  resources :events do
    post :purchase, on: :member
    delete :purchase, on: :member, action: :cancel_purchase

    resources :participants, controller: "participants", only: [:index, :create, :update, :destroy] do
      post :transfer, on: :member
    end

    resources :checkin_rules, only: [:index, :show, :create, :update, :destroy] do
      put :sync, on: :collection
    end
  end
end
