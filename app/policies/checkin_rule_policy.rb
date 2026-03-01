class CheckinRulePolicy < ApplicationPolicy
  def index?   = owner_of_event?
  def show?    = owner_of_event?
  def create?  = owner_of_event?
  def update?  = owner_of_event?
  def destroy? = owner_of_event?

  class Scope < Scope
    def resolve
      scope.joins(:event)
           .joins("INNER JOIN user_events owners ON owners.event_id = events.id")
           .where(owners: { user_id: user.id, role: UserEvent.roles[:owner] })
           .distinct
    end
  end

  private

  def owner_of_event?
    UserEvent.exists?(
      user_id: user.id,
      event_id: record.event_id,
      role: UserEvent.roles[:owner]
    )
  end
end