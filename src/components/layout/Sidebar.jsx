import { useState, useEffect } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Package, ScanLine, Tag, MapPin,
  Users, History, LogOut, Boxes, Sparkles,
  FileBarChart, PanelLeftClose, PanelLeftOpen, X
} from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import RoleBadge from "../ui/RoleBadge";

const menuGroups = [
  {
    title: "Utama",
    roles: ["super_admin", "admin", "viewer"],
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/reports",   label: "Laporan",   icon: FileBarChart },
      { to: "/scan",      label: "Scan QR",   icon: ScanLine },
    ],
  },
  {
    title: "Inventaris",
    roles: ["super_admin", "admin"],
    items: [
      { to: "/items", label: "Barang", icon: Package },
    ],
  },
  {
    title: "Master Data",
    roles: ["super_admin", "admin"],
    items: [
      { to: "/categories", label: "Kategori",      icon: Tag },
      { to: "/locations",  label: "Lokasi",        icon: MapPin },
      { to: "/activity",   label: "Log Aktivitas", icon: History },
    ],
  },
  {
    title: "Administrator",
    roles: ["super_admin"],
    items: [
      { to: "/users", label: "Kelola Users", icon: Users },
    ],
  },
];

const STORAGE_KEY = "sidebar_collapsed";

export default function Sidebar({ isOpen, onClose }) {
  const { profile, logout } = useAuthStore();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) === "true";
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 30);
    return () => clearTimeout(t);
  }, []);

  // Tutup sidebar HP saat pindah rute
  useEffect(() => {
    if (isOpen && onClose) {
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  };

  return (
    <aside className={`mc-side ${collapsed ? "is-collapsed" : ""} ${mounted ? "is-mounted" : ""} ${isOpen ? "is-mobile-open" : ""}`}>
      <SidebarStyles />

      {/* Tombol Close (Hanya muncul di HP) */}
      <button className="mc-side-mobile-close" onClick={onClose}>
        <X size={20} />
      </button>

      {/* ================= LOGO ================= */}
      <div className="mc-side-logo-wrap">
        <Link to="/dashboard" className="mc-side-logo">
          <div className="mc-side-logo-icon">
            <Boxes size={20} />
            <span className="mc-side-logo-glow" />
          </div>
          <div className="mc-side-logo-text">
            <h1>INVENTARIS</h1>
            <p>SMA PASUNDAN</p>
          </div>
        </Link>

        <button
          onClick={toggleCollapse}
          className="mc-side-toggle"
          title={collapsed ? "Buka sidebar" : "Tutup sidebar"}
          aria-label={collapsed ? "Buka sidebar" : "Tutup sidebar"}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* ================= NAVIGATION ================= */}
      <nav className="mc-side-nav">
        {menuGroups.map((group, gIdx) => {
          if (!group.roles.includes(profile?.role)) return null;

          return (
            <div
              key={gIdx}
              className="mc-side-group"
              style={{ animationDelay: `${gIdx * 0.08}s` }}
            >
              {!collapsed && (
                <p className="mc-side-group-label">
                  {gIdx === 0 && <Sparkles size={10} />}
                  <span>{group.title}</span>
                </p>
              )}

              <div className="mc-side-items">
                {group.items.map((item, iIdx) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `mc-side-item ${isActive ? "is-active" : ""}`
                    }
                    style={{ animationDelay: `${(gIdx * 4 + iIdx) * 0.035}s` }}
                    title={collapsed ? item.label : undefined}
                  >
                    {({ isActive }) => (
                      <>
                        <span className="mc-side-item-bar" />
                        <span className="mc-side-item-icon">
                          <item.icon size={18} />
                        </span>
                        <span className="mc-side-item-label">{item.label}</span>
                        {isActive && <span className="mc-side-item-dot" />}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* ================= USER PROFILE ================= */}
      <div className="mc-side-footer">
        <div className="mc-side-user">
          <div className="mc-side-avatar">
            {profile?.full_name?.[0]?.toUpperCase() || "?"}
            <span className="mc-side-online" />
          </div>

          {!collapsed && (
            <div className="mc-side-user-info">
              <p className="mc-side-user-name" title={profile?.full_name}>
                {profile?.full_name}
              </p>
              <div className="mc-side-user-role">
                <RoleBadge role={profile?.role} />
              </div>
            </div>
          )}
        </div>

        <button
          onClick={logout}
          className="mc-side-logout"
          title="Logout"
        >
          <LogOut size={16} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}

function SidebarStyles() {
  return (
    <style>{`
      /* ============ SHELL ============ */
      .mc-side {
        width: 260px;
        background: var(--surface);
        border-right: 1px solid var(--border);
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        flex-shrink: 0;
        position: relative;
        z-index: 50; /* Ditinggikan untuk mobile */
        transition: width 0.35s cubic-bezier(0.16, 1, 0.3, 1),
                    background-color 0.3s,
                    border-color 0.3s,
                    transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        overflow: hidden;
      }
      .mc-side.is-collapsed { width: 76px; }

      /* Mobile Close Button */
      .mc-side-mobile-close {
        display: none;
        position: absolute;
        top: 1rem;
        right: 1rem;
        background: var(--background);
        border: 1px solid var(--border);
        color: var(--text-muted);
        border-radius: 8px;
        padding: 0.4rem;
        cursor: pointer;
        z-index: 60;
      }

      @media (max-width: 768px) {
        .mc-side { 
          position: fixed;
          top: 0;
          bottom: 0;
          left: 0;
          transform: translateX(-100%);
          box-shadow: 4px 0 24px rgba(0,0,0,0.2);
          width: 280px; /* Sedikit lebih lebar di HP */
        }
        .mc-side.is-collapsed { width: 280px; } /* Abaikan collapse di HP */
        .mc-side.is-mobile-open {
          transform: translateX(0);
        }
        .mc-side-mobile-close { display: flex; align-items: center; justify-content: center; }
        .mc-side-toggle { display: none; } /* Sembunyikan tombol collapse di HP */
      }

      /* ============ LOGO ============ */
      .mc-side-logo-wrap {
        height: 80px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 1rem;
        border-bottom: 1px solid var(--border);
        gap: 0.5rem;
        flex-shrink: 0;
        position: relative;
      }
      .mc-side-logo {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        text-decoration: none;
        min-width: 0;
        flex: 1;
      }
      .mc-side-logo-icon {
        width: 42px;
        height: 42px;
        border-radius: 12px;
        background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        position: relative;
        box-shadow: 0 4px 16px -4px rgba(185,28,28,0.45);
        transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      .mc-side-logo:hover .mc-side-logo-icon {
        transform: rotate(-6deg) scale(1.08);
      }
      .mc-side-logo-glow {
        position: absolute;
        inset: -6px;
        border-radius: 16px;
        background: radial-gradient(circle, var(--accent-soft) 0%, transparent 70%);
        opacity: 0;
        transition: opacity 0.35s;
        animation: logo-pulse 3s ease-in-out infinite;
      }
      .mc-side-logo:hover .mc-side-logo-glow { opacity: 1; }
      @keyframes logo-pulse {
        0%, 100% { transform: scale(1); opacity: 0.3; }
        50% { transform: scale(1.15); opacity: 0.6; }
      }

      .mc-side-logo-text {
        min-width: 0;
        line-height: 1.1;
        transition: opacity 0.2s, transform 0.3s;
        opacity: 1;
      }
      .mc-side.is-collapsed .mc-side-logo-text {
        opacity: 0;
        transform: translateX(-8px);
        pointer-events: none;
        width: 0;
      }
      .mc-side-logo-text h1 {
        font-size: 0.9rem;
        font-weight: 900;
        color: var(--text-main);
        letter-spacing: -0.01em;
        white-space: nowrap;
      }
      .mc-side-logo-text p {
        font-size: 0.6rem;
        font-weight: 800;
        color: var(--accent);
        letter-spacing: 0.12em;
        margin-top: 2px;
        white-space: nowrap;
      }

      /* Toggle */
      .mc-side-toggle {
        width: 28px;
        height: 28px;
        border-radius: 7px;
        background: var(--background);
        border: 1px solid var(--border);
        color: var(--text-muted);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s;
        flex-shrink: 0;
        padding: 0;
        font-family: inherit;
      }
      .mc-side-toggle:hover {
        background: var(--accent-soft);
        border-color: var(--accent-border);
        color: var(--accent);
        transform: scale(1.05);
      }
      .mc-side.is-collapsed .mc-side-toggle {
        position: absolute;
        bottom: -14px;
        right: -14px;
        width: 26px;
        height: 26px;
        background: var(--surface);
        border: 1.5px solid var(--border);
        z-index: 2;
        box-shadow: 0 4px 12px -2px rgba(0,0,0,0.1);
      }

      /* ============ NAV ============ */
      .mc-side-nav {
        flex: 1;
        padding: 1rem 0.75rem;
        overflow-y: auto;
        overflow-x: hidden;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        scrollbar-width: thin;
        scrollbar-color: var(--border) transparent;
      }
      .mc-side-nav::-webkit-scrollbar { width: 4px; }
      .mc-side-nav::-webkit-scrollbar-thumb {
        background: var(--border);
        border-radius: 2px;
      }

      .mc-side-group {
        opacity: 0;
        transform: translateX(-8px);
        transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1),
                    transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .mc-side.is-mounted .mc-side-group {
        opacity: 1;
        transform: translateX(0);
      }

      .mc-side-group-label {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0 0.75rem;
        margin-bottom: 0.5rem;
        font-size: 0.62rem;
        font-weight: 800;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        white-space: nowrap;
      }
      .mc-side-group-label svg { color: var(--accent); flex-shrink: 0; }
      .mc-side.is-collapsed .mc-side-group-label {
        padding: 0;
        height: 4px;
        overflow: hidden;
      }

      .mc-side-items {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      /* Item */
      .mc-side-item {
        display: flex;
        align-items: center;
        gap: 0.7rem;
        padding: 0.65rem 0.75rem;
        border-radius: 10px;
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--text-muted);
        text-decoration: none;
        position: relative;
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        overflow: hidden;
        opacity: 0;
        transform: translateX(-6px);
      }
      .mc-side.is-mounted .mc-side-item {
        opacity: 1;
        transform: translateX(0);
      }

      .mc-side-item:not(.is-active):hover {
        background: var(--accent-soft);
        color: var(--accent);
        transform: translateX(3px);
      }

      .mc-side-item.is-active {
        background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
        color: white;
        box-shadow: 0 4px 16px -4px rgba(185,28,28,0.45);
      }

      .mc-side-item-bar {
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%) scaleY(0);
        width: 3px;
        height: 60%;
        background: var(--accent);
        border-radius: 0 3px 3px 0;
        transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      .mc-side-item-icon {
        width: 22px;
        height: 22px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      .mc-side-item:hover .mc-side-item-icon,
      .mc-side-item.is-active .mc-side-item-icon {
        transform: scale(1.12);
      }

      .mc-side-item-label {
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        transition: opacity 0.2s;
      }
      .mc-side.is-collapsed .mc-side-item-label {
        opacity: 0;
        width: 0;
        pointer-events: none;
      }

      .mc-side-item-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: white;
        flex-shrink: 0;
        animation: dot-pulse 2s ease-in-out infinite;
      }
      @keyframes dot-pulse {
        0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,255,255,0.7); }
        50% { transform: scale(1.2); box-shadow: 0 0 0 4px rgba(255,255,255,0); }
      }
      .mc-side.is-collapsed .mc-side-item-dot {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 5px;
        height: 5px;
      }

      .mc-side.is-collapsed .mc-side-item {
        justify-content: center;
        padding: 0.7rem;
        gap: 0;
      }

      /* ============ FOOTER ============ */
      .mc-side-footer {
        padding: 0.85rem 0.85rem 1rem;
        border-top: 1px solid var(--border);
        background: var(--background);
        flex-shrink: 0;
        transition: padding 0.3s;
      }

      .mc-side-user {
        display: flex;
        align-items: center;
        gap: 0.65rem;
        margin-bottom: 0.65rem;
        min-width: 0;
      }
      .mc-side.is-collapsed .mc-side-user {
        justify-content: center;
        margin-bottom: 0.5rem;
      }

      .mc-side-avatar {
        width: 38px;
        height: 38px;
        border-radius: 11px;
        background: var(--accent-soft);
        border: 1px solid var(--accent-border);
        color: var(--accent);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.85rem;
        font-weight: 800;
        flex-shrink: 0;
        position: relative;
        transition: transform 0.25s;
      }
      .mc-side-avatar:hover { transform: scale(1.05); }

      .mc-side-online {
        position: absolute;
        bottom: -2px;
        right: -2px;
        width: 12px;
        height: 12px;
        background: #10B981;
        border: 2px solid var(--surface);
        border-radius: 50%;
        animation: online-pulse 2.5s ease-in-out infinite;
      }
      @keyframes online-pulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.6); }
        50% { box-shadow: 0 0 0 4px rgba(16,185,129,0); }
      }

      .mc-side-user-info {
        flex: 1;
        min-width: 0;
        transition: opacity 0.2s;
      }
      .mc-side.is-collapsed .mc-side-user-info {
        opacity: 0;
        width: 0;
        pointer-events: none;
        overflow: hidden;
      }
      .mc-side-user-name {
        font-size: 0.82rem;
        font-weight: 800;
        color: var(--text-main);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        line-height: 1.15;
      }
      .mc-side-user-role { margin-top: 3px; }

      .mc-side-logout {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.6rem 0.75rem;
        border-radius: 9px;
        background: rgba(239,68,68,0.08);
        border: 1px solid rgba(239,68,68,0.2);
        color: #DC2626;
        font-size: 0.78rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        font-family: inherit;
      }
      .mc-side-logout:hover {
        background: rgba(239,68,68,0.15);
        border-color: #EF4444;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px -4px rgba(239,68,68,0.35);
      }
      .mc-side.is-collapsed .mc-side-logout {
        padding: 0.6rem;
      }
      .mc-side.is-collapsed .mc-side-logout span {
        display: none;
      }

      /* ============ TOOLTIP ============ */
      .mc-side.is-collapsed .mc-side-item::after {
        content: attr(title);
        position: absolute;
        left: calc(100% + 12px);
        top: 50%;
        transform: translateY(-50%) translateX(-4px);
        background: var(--text-main);
        color: var(--surface);
        padding: 0.4rem 0.7rem;
        border-radius: 7px;
        font-size: 0.72rem;
        font-weight: 700;
        white-space: nowrap;
        opacity: 0;
        pointer-events: none;
        transition: all 0.2s;
        z-index: 100;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      }
      .mc-side.is-collapsed .mc-side-item:hover::after {
        opacity: 1;
        transform: translateY(-50%) translateX(0);
      }
      .mc-side.is-collapsed .mc-side-item::before {
        content: '';
        position: absolute;
        left: calc(100% + 8px);
        top: 50%;
        transform: translateY(-50%);
        border: 4px solid transparent;
        border-right-color: var(--text-main);
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s;
        z-index: 100;
      }
      .mc-side.is-collapsed .mc-side-item:hover::before {
        opacity: 1;
      }
    `}</style>
  );
}