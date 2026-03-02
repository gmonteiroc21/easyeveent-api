import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

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
        <div className="brand">EasyEvent</div>
        <nav className="nav">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/eventos">Eventos</Link>
          <Link to="/participantes">Participantes</Link>
        </nav>
        <button className="btn" onClick={handleLogout}>Sair</button>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
