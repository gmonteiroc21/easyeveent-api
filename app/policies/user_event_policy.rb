class UserEventPolicy < ApplicationPolicy
  def index?
    owner_of_event?
  end

  def show?
    owner_of_event?
  end

  def create?
    owner_of_event?
  end

  def update?
    owner_of_event?
  end

  def destroy?
    owner_of_event?
  end

  # para “transferência de evento” normalmente é um update/criação + remoção.
  # você pode tratar como update? também.
  def transfer?
    owner_of_event?
  end

  class Scope < Scope
    def resolve
      # se você listar vínculos, liste apenas os de eventos que o usuário é owner
      scope.joins(:event).joins("INNER JOIN user_events owners ON owners.event_id = events.id")
           .where(owners: { user_id: user.id, role: UserEvent.roles[:owner] })
           .distinct
    end
  end

  private

  def owner_of_event?
    event_id =
      case record
      when UserEvent
        record.event_id
      when Event
        record.id
      else
        record
      end

    UserEvent.exists?(user_id: user.id, event_id: event_id, role: UserEvent.roles[:owner])
  end
end
