class PurchaseMailer < ApplicationMailer
  def confirmation(user:, event:, membership:, subject:, ticket_type:, payment_method:, price_multiplier:)
    @user = user
    @event = event
    @membership = membership
    @ticket_type = ticket_type
    @payment_method = payment_method
    @price_multiplier = price_multiplier
    @final_price = ((event.price || 0).to_d * price_multiplier.to_d).round(2)

    mail(to: user.email, subject: subject)
  end
end
