import { createElement } from "react";
import { UserRound, UsersRound } from "lucide-react";
import { NavLink } from "react-router-dom";

const navItems = [
  { label: "Groups", description: "Manage shared meals", to: "/groups", icon: UsersRound },
  { label: "Profile", description: "Update pantry items", to: "/profile", icon: UserRound },
];

export function BottomNav() {
  return (
    <nav className="primary-nav" aria-label="Primary navigation">
      {navItems.map(({ label, description, to, icon: Icon }) => (
        <NavLink
          key={label}
          to={to}
          className={({ isActive }) => `primary-nav__link${isActive ? " active" : ""}`}
          aria-label={label}
        >
          {createElement(Icon, { size: 22, strokeWidth: 2 })}
          <span className="primary-nav__meta">
            <span className="primary-nav__label">{label}</span>
            <span className="primary-nav__description">{description}</span>
          </span>
        </NavLink>
      ))}
    </nav>
  );
}
