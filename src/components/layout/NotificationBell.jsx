import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell, X, CheckCheck, Clock, AlertCircle, AlertTriangle,
  CheckCircle2, Info, Package, Tag, MapPin, Box, Upload,
  User as UserIcon, UserCog, ShieldAlert, ChevronRight
} from "lucide-react";
import { useNotifications } from "../../hooks/useNotifications";

/* ── Icon + warna per level ── */
const levelMeta = {
  info:    { icon: Info,            color: "#3B82F6", bg: "rgba(59,130,246,0.12)",  border: "rgba(59,130,246,0.3)" },
  success: { icon: CheckCircle2,    color: "#10B981", bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.3)" },
  warning: { icon: AlertTriangle,   color: "#F59E0B", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.3)" },
  danger:  { icon: AlertCircle,     color: "#EF4444", bg: "rgba(239,68,68,0.12)",   border: "rgba(239,68,68,0.3)" },
};

/* ── Icon per entity/action ── */
function getEntityIcon(action) {
  if (action.includes("user") || action.includes("register")) return UserIcon;
  if (action.includes("category")) return Tag;
  if (action.includes("location")) return MapPin;
  if (action.includes("unit")) return Box;
  if (action.includes("item")) return Package;
  if (action.includes("import")) return Upload;
  if (action.includes("stock")) return Box;
  return Bell;
}

/* ── Format relative time ── */
function formatRelative(dateStr) {
  const date = new Date(dateStr);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins} mnt lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAllRead, loading } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Tutup saat klik di luar
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ESC close
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Auto mark as read saat panel dibuka (delay 2 detik)
  useEffect(() => {
    if (open && unreadCount > 0) {
      const timer = setTimeout(markAllRead, 2000);
      return () => clearTimeout(timer);
    }
  }, [open, unreadCount, markAllRead]);

  const handleItemClick = (notif) => {
    setOpen(false);
    // Arahkan sesuai entity
    switch (notif.entity) {
      case "items":
        if (notif.action.startsWith("delete")) return;
        navigate(notif.entityId ? `/items/${notif.entityId}` : "/items");
        break;
      case "item_units":
        navigate("/items");
        break;
      case "categories":
        navigate("/categories");
        break;
      case "locations":
        navigate("/locations");
        break;
      case "profiles":
      case "users":
        navigate("/users");
        break;
      default:
        navigate("/activity");
    }
  };

  // Kelompokkan: unread dulu, baru read
  const { unread, read } = useMemo(() => {
    return {
      unread: notifications.filter(n => n.isUnread),
      read: notifications.filter(n => !n.isUnread),
    };
  }, [notifications]);

  return (
    <div className="notif-wrap" ref={ref}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`notif-btn ${open ? "is-open" : ""}`}
        title="Notifikasi"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="notif-badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="notif-panel">
          {/* Header */}
          <div className="notif-panel-head">
            <div>
              <h3 className="notif-panel-title">Notifikasi</h3>
              <p className="notif-panel-sub">
                {unreadCount > 0 ? `${unreadCount} belum dibaca` : "Semua sudah dibaca"}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="notif-mark-all"
                title="Tandai semua sudah dibaca"
              >
                <CheckCheck size={13} />
                Tandai dibaca
              </button>
            )}
          </div>

          {/* Body */}
          <div className="notif-panel-body">
            {loading ? (
              <div className="notif-loading">
                {[1, 2, 3].map(i => (
                  <div key={i} className="notif-skel" style={{ animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="notif-empty">
                <div className="notif-empty-icon">
                  <Bell size={28} />
                </div>
                <p className="notif-empty-title">Tidak ada notifikasi</p>
                <p className="notif-empty-sub">
                  Aktivitas penting akan muncul di sini.
                </p>
              </div>
            ) : (
              <>
                {/* Unread group */}
                {unread.length > 0 && (
                  <div className="notif-group">
                    <p className="notif-group-label">
                      <span className="notif-group-dot" />
                      Baru
                    </p>
                    {unread.map(n => <NotifItem key={n.id} notif={n} onClick={() => handleItemClick(n)} />)}
                  </div>
                )}

                {/* Read group */}
                {read.length > 0 && (
                  <div className="notif-group">
                    {unread.length > 0 && (
                      <p className="notif-group-label">Sebelumnya</p>
                    )}
                    {read.map(n => <NotifItem key={n.id} notif={n} onClick={() => handleItemClick(n)} />)}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="notif-panel-foot">
              <button
                onClick={() => { setOpen(false); navigate("/activity"); }}
                className="notif-view-all"
              >
                Lihat semua aktivitas
                <ChevronRight size={13} />
              </button>
            </div>
          )}
        </div>
      )}

      <NotificationStyles />
    </div>
  );
}

/* ── Notif item ── */
function NotifItem({ notif, onClick }) {
  const meta = levelMeta[notif.level] || levelMeta.info;
  const LevelIcon = meta.icon;
  const EntityIcon = getEntityIcon(notif.action);

  return (
    <button
      onClick={onClick}
      className={`notif-item ${notif.isUnread ? "is-unread" : ""}`}
    >
      {/* Icon */}
      <div
        className="notif-item-icon"
        style={{ background: meta.bg, color: meta.color, borderColor: meta.border }}
      >
        <EntityIcon size={14} />
      </div>

      {/* Content */}
      <div className="notif-item-body">
        <p className="notif-item-msg">{notif.message}</p>
        <div className="notif-item-meta">
          <span
            className="notif-item-level"
            style={{ color: meta.color }}
          >
            <LevelIcon size={9} /> {notif.level}
          </span>
          <span className="notif-item-time">
            <Clock size={9} /> {formatRelative(notif.createdAt)}
          </span>
        </div>
      </div>

      {/* Unread dot */}
      {notif.isUnread && <span className="notif-item-dot" />}
    </button>
  );
}

/* ============================================================
   Styles
============================================================ */
function NotificationStyles() {
  return (
    <style>{`
      .notif-wrap { position: relative; }

      /* ── Bell Button ── */
      .notif-btn {
        position: relative;
        width: 38px;
        height: 38px;
        border-radius: 10px;
        background: var(--surface);
        border: 1px solid var(--border);
        color: var(--text-muted);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s;
        font-family: inherit;
        padding: 0;
      }
      .notif-btn:hover,
      .notif-btn.is-open {
        color: var(--accent);
        border-color: var(--accent-border);
        background: var(--accent-soft);
        transform: translateY(-1px);
      }
      .notif-badge {
        position: absolute;
        top: -4px;
        right: -4px;
        min-width: 18px;
        height: 18px;
        padding: 0 4px;
        border-radius: 999px;
        background: #EF4444;
        color: white;
        font-size: 0.6rem;
        font-weight: 800;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid var(--surface);
        font-variant-numeric: tabular-nums;
        animation: notif-badge-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      @keyframes notif-badge-in {
        from { transform: scale(0); }
        to { transform: scale(1); }
      }

      /* ── Panel ── */
      .notif-panel {
        position: absolute;
        top: calc(100% + 8px);
        right: 0;
        width: 380px;
        max-width: calc(100vw - 2rem);
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 14px;
        box-shadow: 0 16px 48px -8px rgba(0, 0, 0, 0.25);
        overflow: hidden;
        animation: notif-panel-in 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        z-index: 50;
        display: flex;
        flex-direction: column;
      }
      @keyframes notif-panel-in {
        from { opacity: 0; transform: translateY(-6px) scale(0.97); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }

      /* Header */
      .notif-panel-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 0.5rem;
        padding: 0.9rem 1rem 0.75rem;
        border-bottom: 1px solid var(--border);
        background: var(--background);
      }
      .notif-panel-title {
        font-size: 0.92rem;
        font-weight: 800;
        color: var(--text-main);
        margin-bottom: 2px;
      }
      .notif-panel-sub {
        font-size: 0.7rem;
        color: var(--text-muted);
        font-weight: 500;
      }
      .notif-mark-all {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.3rem 0.55rem;
        border-radius: 6px;
        background: var(--surface);
        border: 1px solid var(--accent-border);
        color: var(--accent);
        font-size: 0.66rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
        font-family: inherit;
        white-space: nowrap;
        flex-shrink: 0;
      }
      .notif-mark-all:hover {
        background: var(--accent);
        color: white;
        border-color: var(--accent);
      }

      /* Body */
      .notif-panel-body {
        max-height: 420px;
        overflow-y: auto;
        padding: 0.4rem 0;
      }
      .notif-panel-body::-webkit-scrollbar { width: 6px; }
      .notif-panel-body::-webkit-scrollbar-thumb {
        background: var(--border);
        border-radius: 3px;
      }

      /* Loading */
      .notif-loading { padding: 0.5rem; display: flex; flex-direction: column; gap: 0.4rem; }
      .notif-skel {
        height: 56px;
        border-radius: 8px;
        background: var(--background);
        animation: notif-pulse 1.5s ease-in-out infinite;
      }
      @keyframes notif-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      /* Empty */
      .notif-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 2.5rem 1rem;
        text-align: center;
      }
      .notif-empty-icon {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: var(--background);
        border: 1px solid var(--border);
        color: var(--text-muted);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 0.75rem;
        opacity: 0.6;
      }
      .notif-empty-title {
        font-size: 0.88rem;
        font-weight: 700;
        color: var(--text-main);
        margin-bottom: 0.2rem;
      }
      .notif-empty-sub {
        font-size: 0.74rem;
        color: var(--text-muted);
      }

      /* Group */
      .notif-group { padding: 0.25rem 0; }
      .notif-group + .notif-group { border-top: 1px solid var(--border); margin-top: 0.25rem; padding-top: 0.5rem; }
      .notif-group-label {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        font-size: 0.62rem;
        font-weight: 800;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.06em;
        padding: 0.25rem 1rem 0.4rem;
      }
      .notif-group-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #EF4444;
        animation: notif-dot-pulse 2s ease-in-out infinite;
      }
      @keyframes notif-dot-pulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.6); }
        50% { box-shadow: 0 0 0 3px rgba(239, 68, 68, 0); }
      }

      /* Item */
      .notif-item {
        display: flex;
        align-items: flex-start;
        gap: 0.65rem;
        width: 100%;
        padding: 0.65rem 1rem;
        background: transparent;
        border: none;
        border-left: 2px solid transparent;
        cursor: pointer;
        transition: all 0.15s;
        font-family: inherit;
        text-align: left;
        position: relative;
      }
      .notif-item:hover {
        background: var(--background);
      }
      .notif-item.is-unread {
        background: var(--accent-soft);
        border-left-color: var(--accent);
      }
      .notif-item.is-unread:hover {
        background: color-mix(in srgb, var(--accent-soft) 80%, var(--accent) 5%);
      }

      /* Item icon */
      .notif-item-icon {
        width: 30px;
        height: 30px;
        border-radius: 8px;
        border: 1px solid;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      /* Body */
      .notif-item-body { flex: 1; min-width: 0; }
      .notif-item-msg {
        font-size: 0.78rem;
        color: var(--text-main);
        line-height: 1.4;
        margin-bottom: 0.25rem;
        word-break: break-word;
      }
      .notif-item.is-unread .notif-item-msg {
        font-weight: 600;
      }
      .notif-item-meta {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        font-size: 0.65rem;
        color: var(--text-muted);
      }
      .notif-item-level {
        display: inline-flex;
        align-items: center;
        gap: 0.2rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }
      .notif-item-time {
        display: inline-flex;
        align-items: center;
        gap: 0.2rem;
      }

      /* Unread dot */
      .notif-item-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #EF4444;
        flex-shrink: 0;
        margin-top: 6px;
      }

      /* Footer */
      .notif-panel-foot {
        border-top: 1px solid var(--border);
        background: var(--background);
        padding: 0.35rem;
      }
      .notif-view-all {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.3rem;
        padding: 0.55rem;
        background: transparent;
        border: none;
        border-radius: 8px;
        color: var(--accent);
        font-size: 0.78rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
        font-family: inherit;
      }
      .notif-view-all:hover {
        background: var(--accent-soft);
      }

      /* Mobile */
      @media (max-width: 480px) {
        .notif-panel {
          position: fixed;
          top: auto;
          bottom: 0;
          left: 0;
          right: 0;
          width: 100%;
          max-width: 100%;
          border-radius: 16px 16px 0 0;
          max-height: 80vh;
          animation: notif-panel-mobile-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes notif-panel-mobile-in {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .notif-panel-body { max-height: 60vh; }
      }
    `}</style>
  );
}