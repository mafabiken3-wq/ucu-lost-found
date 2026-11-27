import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { isAuthenticated, isAdmin, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="navbar">
      <div className="container">
        <NavLink to="/" className="navbar-brand">
          UCU Lost &amp; Found
        </NavLink>

        {isAuthenticated && (
          <nav className="nav-links" aria-label="Main navigation">
            <NavLink to="/" end>
              Browse
            </NavLink>
            <NavLink to="/report">Report Item</NavLink>
            <NavLink to="/my-items">My Items</NavLink>
            {isAdmin && <NavLink to="/admin">Admin</NavLink>}
            <span className="text-sm" style={{ opacity: 0.85, marginLeft: '0.25rem' }}>
              {user?.full_name}
            </span>
            <button type="button" onClick={handleLogout} aria-label="Log out">
              Logout
            </button>
          </nav>
        )}
      </div>
    </header>
  );
}
