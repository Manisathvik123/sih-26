import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  HeartPulse,
  Brain,
  Lightbulb,
  History,
  ChevronLeft,
  ChevronRight,
  User,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import PersonnelSelector from "./PersonnelSelector.jsx";

const NAV = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/checkin", label: "Wellness Check-In", icon: HeartPulse },
  { path: "/analysis", label: "AI Analysis", icon: Brain },
  { path: "/recommendations", label: "Recommendations", icon: Lightbulb },
  { path: "/timeline", label: "Timeline", icon: History },
];

export default function Sidebar({ personnel, selectedId, onChange }) {
  const [collapsed, setCollapsed] = useState(false);
  const { pathname } = useLocation();

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-top">
        <div className="brand">
          <span className="brand-mark">
            <ShieldCheck size={22} />
          </span>
          {!collapsed && (
            <div className="brand-text">
              <span className="brand-name">PRAHARI</span>
              <span className="brand-tag">Stress &amp; Welfare</span>
            </div>
          )}
        </div>
        <button
          type="button"
          className="collapse-btn"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {NAV.map(({ path, label, icon: Icon }) => {
          const active = path === "/" ? pathname === "/" : pathname.startsWith(path);
          return (
            <Link
              key={path}
              to={path}
              className={`nav-item ${active ? "active" : ""}`}
              title={label}
            >
              <Icon size={20} className="nav-icon" />
              {!collapsed && <span className="nav-label">{label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        {!collapsed && <div className="sidebar-divider" />}
        <PersonnelSelector
          personnel={personnel}
          selectedId={selectedId}
          onChange={onChange}
          collapsed={collapsed}
        />

        <div className="profile-placeholder">
          <span className="avatar">
            <User size={18} />
          </span>
          {!collapsed && (
            <div className="profile-info">
              <span className="profile-name">Officer</span>
              <span className="profile-role">Not signed in</span>
            </div>
          )}
          {!collapsed && (
            <button type="button" className="logout-btn" disabled title="Reserved for future auth">
              <LogOut size={16} />
            </button>
          )}
        </div>

        {!collapsed && (
          <p className="sidebar-disclaimer">Prototype — not a diagnostic system.</p>
        )}
      </div>
    </aside>
  );
}