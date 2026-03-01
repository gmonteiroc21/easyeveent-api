class ApplicationPolicy
  attr_reader :user, :record

  def initialize(user, record)
    raise Pundit::NotAuthorizedError, "must be logged in" if user.nil?
    @user = user
    @record = record
  end

  # Defaults: tudo negado, você libera explicitamente nas policies filhas
  def index?   = false
  def show?    = false
  def create?  = false
  def update?  = false
  def destroy? = false

  # Scope base
  class Scope
    attr_reader :user, :scope

    def initialize(user, scope)
      raise Pundit::NotAuthorizedError, "must be logged in" if user.nil?
      @user = user
      @scope = scope
    end

    def resolve
      scope.none
    end
  end
end