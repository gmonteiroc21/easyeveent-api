import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import systemLogo from "../assets/system_logo.png";

export function AppShell() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <img src={systemLogo} alt="EasyEvents"className="brandLogo" />
          {/* <span>EasyEvent</span> */}
        </div>
        <nav className="nav">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `navItem ${isActive ? "active" : ""}`}
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/eventos"
            className={({ isActive }) => `navItem ${isActive ? "active" : ""}`}
          >
            Eventos
          </NavLink>
          <NavLink
            to="/participantes"
            className={({ isActive }) => `navItem ${isActive ? "active" : ""}`}
          >
            Participantes
          </NavLink>
        </nav>
        <button className="btn sidebarLogout" onClick={handleLogout}>Sair</button>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
