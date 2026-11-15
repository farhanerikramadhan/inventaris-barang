import { useState, useEffect, useRef, useMemo } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronRight, User, Settings, LogOut, Menu,
  Clock, Shield, Sun, Moon, Home, ChevronDown
} from "lucide-react";
import Sidebar from "./Sidebar";
import NotificationBell from "./NotificationBell";
import { useAuthStore } from "../../stores/authStore";
import { useThemeStore } from "../../stores/themeStore";

const pageTitles = {
  "/dashboard": { title: "Dashboard", icon: Home },
  "/items": { title: "Daftar Barang", icon: null },
  "/scan": { title: "Scan QR", icon: null },
  "/categories": { title: "Kategori", icon: null },
  "/locations": { title: "Lokasi", icon: null },
  "/users": { title: "Kelola Users", icon: null },
  "/activity": { title: "Log Aktivitas", icon: null },
  "/print": { title: "Cetak Label", icon: null },
};

const roleLabel = {
  super_admin: "Super Admin",
  admin: "Admin",
  viewer: "Viewer",
};

export default function AppLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { profile, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [timeNow, setTimeNow] = useState(new Date());
  const menuRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setTimeNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setShowProfileMenu(false);
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const pageInfo = useMemo(() => {
    if (pageTitles[pathname]) return pageTitles[pathname];
    if (pathname.startsWith("/items/")) return { title: "Detail Barang" };
    if (pathname.startsWith("/units/")) return { title: "Detail Unit" };
    return { title: "Inventaris" };
  }, [pathname]);

  const sectionRoot = useMemo(() => {
    if (pathname.startsWith("/items") || pathname.startsWith("/units")) return { label: "Inventaris", path: "/items" };
    if (pathname.startsWith("/categories")) return { label: "Master Data", path: "/categories" };
    if (pathname.startsWith("/locations")) return { label: "Master Data", path: "/locations" };
    if (pathname.startsWith("/users")) return { label: "Admin", path: "/users" };
    if (pathname.startsWith("/activity")) return { label: "Admin", path: "/activity" };
    return null;
  }, [pathname]);

  const initials = profile?.full_name
    ?.split(" ")
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase())
    .join("") || "U";

  const formattedTime = timeNow.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const formattedDate = timeNow.toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="mc-layout">
      <LayoutStyles />
      
      <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

      {isMobileMenuOpen && (
        <div 
          className="mc-mobile-overlay" 
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      <div className="mc-layout-main">
        <header className="mc-topbar">
          <div className="mc-breadcrumb">
            <button 
              className="mc-mobile-toggle"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Buka Menu"
            >
              <Menu size={20} />
            </button>

            <div className="mc-breadcrumb-line">
              {sectionRoot ? (
                <>
                  <button
                    onClick={() => navigate(sectionRoot.path)}
                    className="mc-breadcrumb-link"
                  >
                    {sectionRoot.label}
                  </button>
                  <ChevronRight size={14} className="mc-breadcrumb-sep" />
                </>
              ) : (
                <>
                  <span className="mc-breadcrumb-link muted">Inventaris</span>
                  <ChevronRight size={14} className="mc-breadcrumb-sep" />
                </>
              )}
              <h1 className="mc-breadcrumb-title">{pageInfo.title}</h1>
            </div>
          </div>

          <div className="mc-actions">
            <div className="mc-clock" title={`${formattedDate} · ${formattedTime} WIB`}>
              <Clock size={13} className="mc-clock-icon" />
              <div className="mc-clock-body">
                <p className="mc-clock-time">{formattedTime}</p>
                <p className="mc-clock-date">{formattedDate}</p>
              </div>
            </div>

            <div className="mc-divider" />

            <button
              onClick={toggleTheme}
              className="mc-icon-btn"
              title={theme === "light" ? "Mode Gelap" : "Mode Terang"}
            >
              <span className="mc-icon-btn-inner">
                {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
              </span>
            </button>

            <NotificationBell />

            <div className="mc-divider" />

            <div className="mc-profile-wrap" ref={menuRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className={`mc-profile-btn ${showProfileMenu ? "is-open" : ""}`}
              >
                <div className="mc-avatar">
                  {initials}
                </div>
                <div className="mc-profile-info">
                  <p className="mc-profile-name">{profile?.full_name || "User"}</p>
                  <p className="mc-profile-role">
                    {roleLabel[profile?.role] || profile?.role?.replace("_", " ") || "-"}
                  </p>
                </div>
                <ChevronDown
                  size={14}
                  className={`mc-profile-chevron ${showProfileMenu ? "is-open" : ""}`}
                />
              </button>

              {showProfileMenu && (
                <div className="mc-dropdown">
                  <div className="mc-dropdown-head">
                    <div className="mc-dropdown-avatar">
                      {initials}
                    </div>
                    <div className="mc-dropdown-info">
                      <p className="mc-dropdown-name">{profile?.full_name || "User"}</p>
                      <p className="mc-dropdown-role">
                        <Shield size={11} />
                        {roleLabel[profile?.role] || profile?.role?.replace("_", " ") || "-"}
                      </p>
                    </div>
                  </div>

                  <div className="mc-dropdown-body">
                    <button
                      onClick={() => navigate("/dashboard")}
                      className="mc-dropdown-item"
                    >
                      <span className="mc-dropdown-item-icon">
                        <User size={14} />
                      </span>
                      Profil Saya
                    </button>
                    <button className="mc-dropdown-item">
                      <span className="mc-dropdown-item-icon">
                        <Settings size={14} />
                      </span>
                      Pengaturan
                    </button>
                  </div>

                  <div className="mc-dropdown-footer">
                    <button
                      onClick={handleLogout}
                      className="mc-dropdown-item danger"
                    >
                      <span className="mc-dropdown-item-icon danger">
                        <LogOut size={14} />
                      </span>
                      Keluar Akun
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="mc-main">
          {/* ✅ KEY DIHAPUS: Agar transisi antar komponen tidak memicu blank */}
          <div className="mc-main-inner">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function LayoutStyles() {
  return (
    <style>{`
      .mc-layout {
        display: flex;
        min-height: 100vh;
        background: var(--background);
        font-family: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif;
        color: var(--text-main);
        transition: background-color 0.3s ease;
      }
      .mc-layout-main {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 0;
      }
      
      .mc-mobile-toggle {
        display: none;
        background: transparent;
        border: none;
        color: var(--text-main);
        padding: 0.4rem;
        margin-right: 0.5rem;
        border-radius: 8px;
        cursor: pointer;
      }
      
      .mc-mobile-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(2px);
        z-index: 40;
        animation: mc-fade-in 0.2s ease-out;
      }

      @media (max-width: 768px) {
        .mc-mobile-toggle { display: flex; align-items: center; justify-content: center; }
      }

      .mc-topbar {
        background: color-mix(in srgb, var(--surface) 95%, transparent);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border-bottom: 1px solid var(--border);
        padding: 0.7rem 1.5rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        position: sticky;
        top: 0;
        z-index: 30;
        transition: background 0.3s, border-color 0.3s;
      }
      @media (max-width: 640px) {
        .mc-topbar { padding: 0.6rem 1rem; }
      }
      .mc-breadcrumb { display: flex; align-items: center; min-width: 0; }
      .mc-breadcrumb-line { display: flex; align-items: center; gap: 0.35rem; min-width: 0; }
      .mc-breadcrumb-link {
        font-size: 0.8rem; font-weight: 600;
        color: var(--text-muted);
        background: transparent; border: none;
        padding: 0.25rem 0.4rem; border-radius: 6px;
        cursor: pointer; font-family: inherit;
        transition: all 0.2s; white-space: nowrap;
      }
      .mc-breadcrumb-link:hover { color: var(--accent); background: var(--accent-soft); }
      .mc-breadcrumb-link.muted { cursor: default; pointer-events: none; }
      .mc-breadcrumb-sep { color: var(--text-muted); opacity: 0.4; flex-shrink: 0; }
      .mc-breadcrumb-title {
        font-size: 1rem; font-weight: 800;
        color: var(--text-main);
        letter-spacing: -0.01em;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        padding: 0.25rem 0.4rem;
      }
      @media (min-width: 768px) { .mc-breadcrumb-title { font-size: 1.1rem; } }
      .mc-actions { display: flex; align-items: center; gap: 0.6rem; flex-shrink: 0; }
      .mc-clock {
        display: none; align-items: center; gap: 0.5rem;
        padding: 0.4rem 0.75rem;
        background: var(--accent-soft);
        border: 1px solid var(--accent-border);
        border-radius: 10px; transition: all 0.2s;
      }
      @media (min-width: 900px) { .mc-clock { display: flex; } }
      .mc-clock:hover { background: color-mix(in srgb, var(--accent-soft) 70%, var(--accent) 10%); }
      .mc-clock-icon { color: var(--accent); flex-shrink: 0; }
      .mc-clock-body { display: flex; flex-direction: column; line-height: 1; }
      .mc-clock-time { font-size: 0.82rem; font-weight: 800; color: var(--accent); font-variant-numeric: tabular-nums; }
      .mc-clock-date { font-size: 0.6rem; font-weight: 600; color: var(--accent); opacity: 0.7; margin-top: 2px; }
      .mc-divider { width: 1px; height: 24px; background: var(--border); display: none; }
      @media (min-width: 640px) { .mc-divider { display: block; } }
      .mc-icon-btn {
        width: 38px; height: 38px; border-radius: 10px;
        background: var(--surface); border: 1px solid var(--border);
        color: var(--text-muted);
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; transition: all 0.2s; padding: 0;
        font-family: inherit;
      }
      .mc-icon-btn:hover {
        color: var(--accent); border-color: var(--accent-border);
        background: var(--accent-soft); transform: translateY(-1px);
      }
      .mc-icon-btn-inner { position: relative; display: inline-flex; align-items: center; justify-content: center; }
      .mc-icon-badge {
        position: absolute; top: -3px; right: -3px;
        width: 8px; height: 8px; border-radius: 50%;
        background: #EF4444; border: 2px solid var(--surface);
        animation: mc-pulse-badge 2s ease-in-out infinite;
      }
      @keyframes mc-pulse-badge {
        0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.6); }
        50% { box-shadow: 0 0 0 4px rgba(239, 68, 68, 0); }
      }
      .mc-profile-wrap { position: relative; }
      .mc-profile-btn {
        display: flex; align-items: center; gap: 0.6rem;
        padding: 0.35rem 0.5rem 0.35rem 0.35rem;
        background: transparent; border: 1px solid transparent;
        border-radius: 11px; cursor: pointer; transition: all 0.2s;
        font-family: inherit;
      }
      .mc-profile-btn:hover, .mc-profile-btn.is-open {
        background: var(--accent-soft); border-color: var(--accent-border);
      }
      .mc-avatar {
        width: 34px; height: 34px; border-radius: 9px;
        background: linear-gradient(135deg, var(--accent) 0%, #7F1D1D 100%);
        color: white; display: flex; align-items: center; justify-content: center;
        font-size: 0.78rem; font-weight: 800; flex-shrink: 0;
        box-shadow: 0 2px 8px -2px rgba(185,28,28,0.3);
        letter-spacing: 0.02em;
      }
      .mc-profile-info { display: none; text-align: left; line-height: 1.15; min-width: 0; }
      @media (min-width: 768px) { .mc-profile-info { display: block; } }
      .mc-profile-name { font-size: 0.8rem; font-weight: 700; color: var(--text-main); max-width: 140px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .mc-profile-role { font-size: 0.68rem; color: var(--text-muted); font-weight: 500; margin-top: 1px; }
      .mc-profile-chevron { color: var(--text-muted); transition: transform 0.2s; flex-shrink: 0; display: none; }
      @media (min-width: 768px) { .mc-profile-chevron { display: block; } }
      .mc-profile-chevron.is-open { transform: rotate(180deg); }
      .mc-dropdown {
        position: absolute; top: calc(100% + 8px); right: 0; width: 240px;
        background: var(--surface); border: 1px solid var(--border);
        border-radius: 14px;
        box-shadow: 0 16px 40px -8px rgba(0, 0, 0, 0.25);
        overflow: hidden;
        animation: mc-dropdown-in 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        z-index: 40;
      }
      @keyframes mc-dropdown-in {
        from { opacity: 0; transform: translateY(-6px) scale(0.97); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      .mc-dropdown-head { display: flex; align-items: center; gap: 0.65rem; padding: 0.85rem 0.9rem; background: var(--background); border-bottom: 1px solid var(--border); }
      .mc-dropdown-avatar { width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, var(--accent) 0%, #7F1D1D 100%); color: white; display: flex; align-items: center; justify-content: center; font-size: 0.78rem; font-weight: 800; flex-shrink: 0; letter-spacing: 0.02em; }
      .mc-dropdown-info { min-width: 0; flex: 1; }
      .mc-dropdown-name { font-size: 0.82rem; font-weight: 700; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px; }
      .mc-dropdown-role { display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.68rem; color: var(--accent); font-weight: 600; }
      .mc-dropdown-body { padding: 0.35rem; }
      .mc-dropdown-footer { padding: 0.35rem; border-top: 1px solid var(--border); background: var(--background); }
      .mc-dropdown-item { width: 100%; display: flex; align-items: center; gap: 0.6rem; padding: 0.55rem 0.65rem; background: transparent; border: none; border-radius: 8px; font-size: 0.82rem; font-weight: 600; color: var(--text-main); cursor: pointer; transition: all 0.15s; font-family: inherit; text-align: left; }
      .mc-dropdown-item:hover { background: var(--accent-soft); color: var(--accent); }
      .mc-dropdown-item-icon { width: 24px; height: 24px; border-radius: 6px; background: var(--background); color: var(--text-muted); display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.15s; }
      .mc-dropdown-item:hover .mc-dropdown-item-icon { background: var(--surface); color: var(--accent); }
      .mc-dropdown-item.danger { color: #DC2626; }
      .mc-dropdown-item.danger:hover { background: rgba(239, 68, 68, 0.08); color: #DC2626; }
      .mc-dropdown-item-icon.danger { background: rgba(239, 68, 68, 0.1); color: #DC2626; }
      .mc-main { flex: 1; padding: 1.25rem; overflow-y: auto; }
      @media (min-width: 768px) { .mc-main { padding: 2rem; } }
      .mc-main-inner { max-width: 80rem; margin: 0 auto; animation: mc-fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
      @keyframes mc-fade-in {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @media (max-width: 640px) {
        .mc-profile-btn { padding: 0.25rem; }
        .mc-profile-chevron { display: none; }
      }
    `}</style>
  );
}