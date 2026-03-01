class EventPolicy < ApplicationPolicy
  def index?
    true
  end

  def show?
    member?
  end

  def create?
    true
  end

  def update?
    owner?
  end

  def destroy?
    owner?
  end

  class Scope < Scope
    def resolve
      # eventos em que o usuário tem vínculo (owner ou participant)
      scope.joins(:user_events).where(user_events: { user_id: user.id }).distinct
    end
  end

  private

  def member?
    record.user_events.exists?(user_id: user.id)
  end

  def owner?
    record.user_events.exists?(user_id: user.id, role: UserEvent.roles[:owner])
  end
end