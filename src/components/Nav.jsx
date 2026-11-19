import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { useData } from '../data.jsx';
import { Avatar } from './bits.jsx';

export function Logo() {
  return (
    <Link to="/" className="logo">
      <svg viewBox="0 0 64 64" width="26" height="26" aria-hidden>
        <path d="M6 38c6-8 10-8 16 0s10 8 16 0 10-8 16 0" fill="none" stroke="#f5b041" strokeWidth="5" strokeLinecap="round" />
        <path d="M6 26c6-8 10-8 16 0s10 8 16 0 10-8 16 0" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity=".6" />
      </svg>
      <span>WAVE 49A</span>
    </Link>
  );
}

export default function Nav() {
  const { user, signOut } = useAuth();
  const { openUpload, openProfile } = useData();
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  return (
    <header className={`nav ${scrolled ? 'nav--solid' : ''}`}>
      <Logo />
      <nav className="nav-links">
        <NavLink to="/" end>Home</NavLink>
        <NavLink to="/albums">Albums</NavLink>
        <NavLink to="/crew">The Crew</NavLink>
        {user.isAdmin && <NavLink to="/admin">Admin</NavLink>}
      </nav>
      <div className="nav-right">
        <button className="btn btn--accent btn--sm" onClick={() => openUpload()}>
          + Add memory
        </button>
        <div className="nav-user">
          <button className="nav-avatar" onClick={() => setMenu((m) => !m)} aria-label="Account menu">
            <Avatar user={user} size={34} />
          </button>
          {menu && (
            <div className="nav-menu" onMouseLeave={() => setMenu(false)}>
              <div className="nav-menu-head">
                <strong>{user.displayName}</strong>
                <span>@{user.username}</span>
              </div>
              <button onClick={() => { setMenu(false); openProfile(); }}>Edit profile</button>
              <button onClick={signOut}>Log out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
