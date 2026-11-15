import { useEffect, useState, useMemo } from "react";
import {
  Users as UsersIcon, Shield, CheckCircle2, XCircle, Lock,
  Sparkles, Search, X, ShieldCheck, User,
  Filter, ShieldAlert, Hash,
  ChevronDown, UserX, UserCheck, ArrowUpRight
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { logActivity } from "../utils/logActivity";
import { useAuthStore } from "../stores/authStore";

/* ── Meta role ── */
const roleMeta = {
  super_admin: {
    label: "Super Admin",
    color: "#8B5CF6",
    bg: "rgba(139,92,246,0.1)",
    border: "rgba(139,92,246,0.3)",
    icon: ShieldAlert,
    desc: "Akses penuh sistem",
  },
  admin: {
    label: "Admin",
    color: "#3B82F6",
    bg: "rgba(59,130,246,0.1)",
    border: "rgba(59,130,246,0.3)",
    icon: ShieldCheck,
    desc: "Kelola data & user",
  },
  viewer: {
    label: "Viewer",
    color: "#6B7280",
    bg: "rgba(107,114,128,0.1)",
    border: "rgba(107,114,128,0.3)",
    icon: User,
    desc: "Lihat data saja",
  },
};

/* ── Avatar warna konsisten ── */
const AVATAR_COLORS = [
  { bg: "rgba(212,175,55,0.12)", color: "#D4AF37" },
  { bg: "rgba(16,185,129,0.12)", color: "#10B981" },
  { bg: "rgba(139,92,246,0.12)", color: "#8B5CF6" },
  { bg: "rgba(245,158,11,0.12)", color: "#F59E0B" },
  { bg: "rgba(236,72,153,0.12)", color: "#EC4899" },
  { bg: "rgba(6,182,212,0.12)",  color: "#06B6D4" },
];

function getAvatar(name = "") {
  const initials = name.trim().split(/\s+/).slice(0, 2)
    .map(w => w[0]?.toUpperCase() || "").join("") || "?";
  const hash = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return { initials, ...AVATAR_COLORS[hash % AVATAR_COLORS.length] };
}

const FILTERS = [
  { key: "all", label: "Semua", icon: Filter },
  { key: "super_admin", label: "Super Admin", icon: ShieldAlert },
  { key: "admin", label: "Admin", icon: ShieldCheck },
  { key: "viewer", label: "Viewer", icon: User },
  { key: "inactive", label: "Nonaktif", icon: UserX },
];

export default function Users() {
  const { user } = useAuthStore();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [updating, setUpdating] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 30);
    return () => clearTimeout(t);
  }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at");
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // ── Change Role + LOG ──
  const changeRole = async (row, role) => {
    if (row.role === "super_admin") return alert("Role Super Admin terkunci!");
    if (row.id === user?.id) return alert("Anda tidak bisa mengubah role sendiri!");

    setUpdating(row.id);
    const { error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", row.id);

    if (error) {
      setUpdating(null);
      return alert(error.message);
    }

    await logActivity({
      action: "update_user_role",
      entity: "profiles",
      entityId: row.id,
      detail: {
        name: row.full_name,
        from_role: row.role,
        to_role: role,
      },
    });

    await load();
    setUpdating(null);
  };

  // ── Toggle Active + LOG ──
  const toggleActive = async (row) => {
    if (row.role === "super_admin") return alert("Akun Super Admin terkunci dan tidak bisa dinonaktifkan!");
    if (row.id === user?.id) return alert("Anda tidak bisa menonaktifkan akun sendiri!");

    const newStatus = !row.is_active;
    setUpdating(row.id);
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: newStatus })
      .eq("id", row.id);

    if (error) {
      setUpdating(null);
      return alert(error.message);
    }

    await logActivity({
      action: newStatus ? "activate_user" : "deactivate_user",
      entity: "profiles",
      entityId: row.id,
      detail: { name: row.full_name },
    });

    await load();
    setUpdating(null);
  };

  // ── Filter ──
  const filtered = useMemo(() => {
    return rows.filter(row => {
      if (filterRole === "inactive") {
        if (row.is_active || row.role === "super_admin") return false;
      } else if (filterRole !== "all") {
        if (row.role !== filterRole) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        return (
          (row.full_name || "").toLowerCase().includes(q) ||
          (row.id || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [rows, search, filterRole]);

  // ── Statistik ──
  const stats = useMemo(() => {
    return {
      total: rows.length,
      super_admin: rows.filter(r => r.role === "super_admin").length,
      admin: rows.filter(r => r.role === "admin").length,
      viewer: rows.filter(r => r.role === "viewer").length,
      inactive: rows.filter(r => !r.is_active && r.role !== "super_admin").length,
    };
  }, [rows]);

  return (
    <div className={`mc-users ${mounted ? "is-mounted" : ""}`}>
      <UsersStyles />

      {/* ============ HEADER ============ */}
      <div className="mc-head">
        <div className="mc-head-text">
          <div className="mc-eyebrow">
            <Sparkles size={12} /> Manajemen Akses
          </div>
          <h1 className="mc-title">
            <span className="mc-title-icon"><UsersIcon size={22} /></span>
            Manajemen User
          </h1>
          <p className="mc-sub">Kelola role dan status aktif pengguna sistem.</p>
        </div>
      </div>

      {/* ============ STAT SUMMARY ============ */}
      <div className="mc-stat-row">
        {[
          { label: "Total User", value: stats.total, icon: UsersIcon, color: "#D4AF37" },
          { label: "Super Admin", value: stats.super_admin, icon: ShieldAlert, color: "#8B5CF6" },
          { label: "Admin", value: stats.admin, icon: ShieldCheck, color: "#3B82F6" },
          { label: "Nonaktif", value: stats.inactive, icon: UserX, color: "#EF4444" },
        ].map((s, i) => (
          <div
            key={s.label}
            className="mc-stat-item"
            style={{
              animationDelay: `${i * 0.06}s`,
              "--stat-accent": s.color,
            }}
          >
            <span
              className="mc-stat-item-icon"
              style={{ background: `${s.color}15`, color: s.color }}
            >
              <s.icon size={14} />
            </span>
            <div className="mc-stat-item-body">
              <p className="mc-stat-item-val">{s.value}</p>
              <p className="mc-stat-item-lbl">{s.label}</p>
            </div>
            <ArrowUpRight size={12} className="mc-stat-arrow" />
          </div>
        ))}
      </div>

      {/* ============ TOOLBAR ============ */}
      <div className="mc-toolbar">
        <div className="mc-search-wrap">
          <Search size={18} className="mc-search-icon" />
          <input
            type="text"
            placeholder="Cari nama atau ID user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mc-search-input"
          />
          {search && (
            <button onClick={() => setSearch("")} className="mc-search-clear" aria-label="Clear">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="mc-filter-chips">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilterRole(f.key)}
              className={`mc-chip ${filterRole === f.key ? "is-active" : ""}`}
            >
              <f.icon size={12} />
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ============ TABEL ============ */}
      <div className="mc-table-card">
        {loading ? (
          <div className="mc-skeleton">
            <div className="mc-skel-head" />
            {[...Array(4)].map((_, i) => (
              <div key={i} className="mc-skel-row" style={{ animationDelay: `${i * 0.08}s` }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="mc-empty">
            <div className="mc-empty-glow" />
            <div className="mc-empty-icon">
              {search || filterRole !== "all" ? <Search size={32} /> : <UsersIcon size={32} />}
            </div>
            <h3 className="mc-empty-title">
              {search || filterRole !== "all" ? "Tidak ada hasil" : "Belum ada user"}
            </h3>
            <p className="mc-empty-sub">
              {search || filterRole !== "all"
                ? "Coba ubah kata kunci atau filter."
                : "User baru harus dibuat melalui halaman Register atau dashboard Supabase."}
            </p>
            {(search || filterRole !== "all") && (
              <button onClick={() => { setSearch(""); setFilterRole("all"); }} className="mc-empty-btn">
                Reset filter
              </button>
            )}
          </div>
        ) : (
          <div className="mc-table-scroll">
            <table className="mc-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const isSuper = row.role === "super_admin";
                  const isSelf = user?.id === row.id;
                  const isUpdating = updating === row.id;
                  const avatar = getAvatar(row.full_name || "");
                  const meta = roleMeta[row.role] || roleMeta.viewer;
                  const RoleIcon = meta.icon;
                  const isActive = row.is_active || isSuper;

                  return (
                    <tr key={row.id} className={isUpdating ? "is-updating" : ""}>
                      {/* User */}
                      <td>
                        <div className="mc-user-cell">
                          <div
                            className="mc-avatar"
                            style={{ background: avatar.bg, color: avatar.color }}
                          >
                            {avatar.initials}
                          </div>
                          <div className="mc-user-info">
                            <p className="mc-user-name">
                              {row.full_name || "Tanpa Nama"}
                              {isSelf && <span className="mc-badge-self">Anda</span>}
                            </p>
                            <p className="mc-user-id">
                              <Hash size={10} /> {row.id.slice(0, 8)}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td>
                        <div className="mc-role-cell">
                          {isSuper ? (
                            <span
                              className="mc-role-badge"
                              style={{ background: meta.bg, color: meta.color, borderColor: meta.border }}
                            >
                              <RoleIcon size={12} />
                              {meta.label}
                              <Lock size={10} className="mc-lock-icon" />
                            </span>
                          ) : (
                            <div className="mc-role-select-wrap">
                              <select
                                value={row.role}
                                onChange={(e) => changeRole(row, e.target.value)}
                                disabled={isUpdating || isSelf}
                                className="mc-role-select"
                                style={{ background: meta.bg, color: meta.color, borderColor: meta.border }}
                              >
                                <option value="admin">Admin</option>
                                <option value="viewer">Viewer</option>
                              </select>
                              <ChevronDown size={12} className="mc-role-arrow" />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`mc-status-pill ${isActive ? "active" : "inactive"}`}>
                          {isActive ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                          {isActive ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>

                      {/* Aksi */}
                      <td className="text-right">
                        {isSuper ? (
                          <span className="mc-action-locked">
                            <Lock size={12} /> Terkunci
                          </span>
                        ) : isSelf ? (
                          <span className="mc-action-self">Anda</span>
                        ) : (
                          <button
                            onClick={() => toggleActive(row)}
                            disabled={isUpdating}
                            className={`mc-action-btn ${row.is_active ? "danger" : "success"}`}
                          >
                            {isUpdating ? (
                              <span className="mc-btn-spinner" />
                            ) : row.is_active ? (
                              <><UserX size={13} /> Nonaktifkan</>
                            ) : (
                              <><UserCheck size={13} /> Aktifkan</>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============ INFO PANEL ============ */}
      <div className="mc-info-panel">
        <div className="mc-info-icon">
          <Shield size={18} />
        </div>
        <div className="mc-info-body">
          <p className="mc-info-title">Catatan Penting</p>
          <ul className="mc-info-list">
            <li>User baru harus dibuat melalui halaman <strong>Register</strong> atau dashboard Supabase.</li>
            <li>Akun <strong>Super Admin</strong> terkunci penuh — role & status tidak dapat diubah.</li>
            <li>Anda tidak dapat mengubah role atau menonaktifkan <strong>akun sendiri</strong>.</li>
            <li>Role <strong>Admin</strong> dan <strong>Viewer</strong> dapat diubah oleh Super Admin.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Styles — Tema Landing (Gold/Maroon/Navy)
============================================================ */
function UsersStyles() {
  return (
    <style>{`
      /* ============ CONTAINER ============ */
      .mc-users {
        width: 100%;
        max-width: 100%;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        padding-bottom: 2.5rem;
        position: relative;
      }
      .mc-users > * {
        opacity: 0;
        transform: translateY(14px);
        transition: opacity 0.5s var(--ease-out, cubic-bezier(0.16,1,0.3,1)),
                    transform 0.5s var(--ease-out, cubic-bezier(0.16,1,0.3,1));
      }
      .mc-users.is-mounted > * { opacity: 1; transform: translateY(0); }
      .mc-users.is-mounted > *:nth-child(1) { transition-delay: 0s; }
      .mc-users.is-mounted > *:nth-child(2) { transition-delay: 0.08s; }
      .mc-users.is-mounted > *:nth-child(3) { transition-delay: 0.16s; }
      .mc-users.is-mounted > *:nth-child(4) { transition-delay: 0.24s; }

      /* ============ HEADER ============ */
      .mc-head { display: flex; flex-direction: column; gap: 1.25rem; }
      .mc-head-text { flex: 1; min-width: 0; }
      .mc-eyebrow {
        display: inline-flex; align-items: center; gap: 0.35rem;
        font-size: 0.7rem; font-weight: 700;
        color: var(--gold);
        background: var(--gold-soft);
        border: 1px solid color-mix(in srgb, var(--gold) 40%, transparent);
        padding: 0.3rem 0.7rem;
        border-radius: 999px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin-bottom: 0.6rem;
      }
      .mc-eyebrow svg { animation: eyebrow-spin 4s linear infinite; }
      @keyframes eyebrow-spin { to { transform: rotate(360deg); } }

      .mc-title {
        display: flex; align-items: center; gap: 0.75rem;
        font-family: 'Playfair Display', Georgia, serif;
        font-size: 1.85rem; font-weight: 800;
        color: var(--text-main);
        letter-spacing: -0.02em;
        margin-bottom: 0.35rem;
      }
      .mc-title-icon {
        width: 44px; height: 44px;
        border-radius: 12px;
        background: linear-gradient(135deg, var(--gold) 0%, var(--maroon-light) 100%);
        border: 1px solid color-mix(in srgb, var(--gold) 40%, transparent);
        color: #fff;
        display: inline-flex; align-items: center; justify-content: center;
        box-shadow: 0 4px 16px -4px color-mix(in srgb, var(--gold) 40%, transparent);
        position: relative; overflow: hidden;
        transition: transform 0.3s var(--ease-spring, cubic-bezier(0.34,1.56,0.64,1));
      }
      .mc-title-icon::before {
        content: ''; position: absolute; inset: 0;
        background: linear-gradient(135deg, transparent, rgba(255,255,255,.4), transparent);
        transform: translateX(-100%);
        animation: icon-shimmer 3s ease-in-out infinite;
      }
      @keyframes icon-shimmer {
        0%, 100% { transform: translateX(-100%); }
        50% { transform: translateX(100%); }
      }
      .mc-users:hover .mc-title-icon { transform: scale(1.06) rotate(-4deg); }

      .mc-sub {
        font-size: 0.88rem; color: var(--text-muted);
        margin-left: 3.4rem;
      }
      @media (max-width: 640px) {
        .mc-title { font-size: 1.5rem; }
        .mc-title-icon { width: 36px; height: 36px; }
        .mc-sub { margin-left: 0; }
      }

      /* ============ STAT SUMMARY ============ */
      .mc-stat-row {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.75rem;
      }
      @media (min-width: 640px) {
        .mc-stat-row { grid-template-columns: repeat(4, 1fr); }
      }
      .mc-stat-item {
        display: flex; align-items: center; gap: 0.65rem;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 14px;
        padding: 0.85rem 1rem;
        transition: all 0.25s var(--ease-spring, cubic-bezier(0.34,1.56,0.64,1));
        animation: stat-in 0.5s var(--ease-out, cubic-bezier(0.16,1,0.3,1)) both;
        position: relative; overflow: hidden;
      }
      .mc-stat-item::before {
        content: '';
        position: absolute; top: 0; left: 0; right: 0; height: 3px;
        background: linear-gradient(90deg, transparent, var(--stat-accent, var(--gold)), transparent);
        opacity: 0; transition: opacity 0.3s;
      }
      .mc-stat-item:hover {
        border-color: color-mix(in srgb, var(--stat-accent, var(--gold)) 40%, var(--border));
        transform: translateY(-2px);
        box-shadow: 0 8px 20px -8px rgba(0,0,0,0.12);
      }
      .mc-stat-item:hover::before { opacity: 1; }
      @keyframes stat-in {
        from { opacity: 0; transform: translateY(8px) scale(0.98); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      .mc-stat-item-icon {
        width: 34px; height: 34px; border-radius: 9px;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
        transition: transform 0.3s var(--ease-spring, cubic-bezier(0.34,1.56,0.64,1));
      }
      .mc-stat-item:hover .mc-stat-item-icon { transform: scale(1.1) rotate(-4deg); }
      .mc-stat-item-body { min-width: 0; flex: 1; }
      .mc-stat-item-val {
        font-family: 'Playfair Display', Georgia, serif;
        font-size: 1.15rem; font-weight: 800;
        color: var(--text-main);
        line-height: 1;
        font-variant-numeric: tabular-nums;
      }
      .mc-stat-item-lbl {
        font-size: 0.68rem; font-weight: 600;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.04em;
        margin-top: 3px;
      }
      .mc-stat-arrow {
        color: var(--text-muted); opacity: 0;
        transform: translateX(-4px);
        transition: all 0.3s;
        flex-shrink: 0;
      }
      .mc-stat-item:hover .mc-stat-arrow {
        opacity: 1; transform: translateX(0);
        color: var(--stat-accent, var(--gold));
      }

      /* ============ TOOLBAR ============ */
      .mc-toolbar { display: flex; flex-direction: column; gap: 0.75rem; }
      @media (min-width: 768px) {
        .mc-toolbar { flex-direction: row; align-items: center; }
      }
      .mc-search-wrap { position: relative; flex: 1; }
      .mc-search-icon {
        position: absolute; left: 1rem; top: 50%;
        transform: translateY(-50%);
        color: var(--text-muted);
        pointer-events: none;
        transition: color 0.2s;
      }
      .mc-search-input {
        width: 100%;
        padding: 0.8rem 2.9rem 0.8rem 2.9rem;
        border-radius: 12px;
        border: 1.5px solid var(--border);
        background: var(--surface);
        color: var(--text-main);
        font-size: 0.9rem;
        font-family: inherit;
        transition: all 0.2s;
      }
      .mc-search-input:focus {
        outline: none;
        border-color: var(--gold);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--gold) 15%, transparent);
      }
      .mc-search-input:focus ~ .mc-search-icon { color: var(--gold); }
      .mc-search-input::placeholder { color: var(--text-muted); opacity: 0.6; }
      .mc-search-clear {
        position: absolute; right: 0.75rem; top: 50%;
        transform: translateY(-50%);
        background: var(--background);
        border: 1px solid var(--border);
        color: var(--text-muted);
        width: 24px; height: 24px;
        border-radius: 50%;
        cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: all 0.2s;
      }
      .mc-search-clear:hover {
        background: var(--gold);
        color: white;
        border-color: var(--gold);
        transform: translateY(-50%) rotate(90deg);
      }

      .mc-filter-chips {
        display: flex; gap: 0.4rem; overflow-x: auto;
        padding-bottom: 2px;
        scrollbar-width: none;
      }
      .mc-filter-chips::-webkit-scrollbar { display: none; }
      .mc-chip {
        display: inline-flex; align-items: center; gap: 0.35rem;
        padding: 0.5rem 0.85rem;
        border-radius: 999px;
        border: 1px solid var(--border);
        background: var(--surface);
        color: var(--text-muted);
        font-size: 0.78rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.25s var(--ease-spring, cubic-bezier(0.34,1.56,0.64,1));
        white-space: nowrap;
        flex-shrink: 0;
      }
      .mc-chip:hover { border-color: color-mix(in srgb, var(--gold) 50%, var(--border)); color: var(--text-main); }
      .mc-chip.is-active {
        background: linear-gradient(135deg, var(--gold) 0%, var(--maroon-light) 100%);
        color: white;
        border-color: transparent;
        box-shadow: 0 4px 12px -2px color-mix(in srgb, var(--gold) 50%, transparent);
      }

      /* ============ TABLE ============ */
      .mc-table-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 18px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0,0,0,0.03);
      }
      .mc-table-scroll { overflow-x: auto; }
      .mc-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.88rem;
      }
      .mc-table thead {
        background: var(--background);
        border-bottom: 1px solid var(--border);
      }
      .mc-table th {
        padding: 0.85rem 1.25rem;
        text-align: left;
        font-size: 0.7rem;
        font-weight: 700;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.06em;
        white-space: nowrap;
      }
      .mc-table th.text-right { text-align: right; }
      .mc-table tbody tr {
        border-bottom: 1px solid var(--border);
        transition: background 0.15s;
        position: relative;
      }
      .mc-table tbody tr:last-child { border-bottom: none; }
      .mc-table tbody tr:hover { background: var(--gold-soft); }
      .mc-table tbody tr.is-updating { opacity: 0.6; pointer-events: none; }
      .mc-table td {
        padding: 0.85rem 1.25rem;
        vertical-align: middle;
      }
      .mc-table td.text-right { text-align: right; }

      /* User cell */
      .mc-user-cell {
        display: flex; align-items: center; gap: 0.75rem;
        min-width: 200px;
      }
      .mc-avatar {
        width: 42px; height: 42px;
        border-radius: 11px;
        display: flex; align-items: center; justify-content: center;
        font-weight: 800; font-size: 0.85rem;
        flex-shrink: 0;
        letter-spacing: 0.02em;
        transition: transform 0.25s var(--ease-spring, cubic-bezier(0.34,1.56,0.64,1));
      }
      .mc-table tbody tr:hover .mc-avatar {
        transform: scale(1.08) rotate(-6deg);
      }
      .mc-user-info { min-width: 0; }
      .mc-user-name {
        font-weight: 700;
        font-size: 0.88rem;
        color: var(--text-main);
        display: flex; align-items: center; gap: 0.4rem;
        margin-bottom: 2px;
        white-space: nowrap;
      }
      .mc-badge-self {
        font-size: 0.6rem;
        font-weight: 800;
        background: linear-gradient(135deg, var(--gold) 0%, var(--maroon-light) 100%);
        color: white;
        padding: 0.1rem 0.4rem;
        border-radius: 4px;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        box-shadow: 0 2px 6px -2px color-mix(in srgb, var(--gold) 50%, transparent);
      }
      .mc-user-id {
        display: inline-flex; align-items: center; gap: 0.25rem;
        font-size: 0.7rem;
        color: var(--text-muted);
        font-family: 'JetBrains Mono', 'Courier New', monospace;
      }

      /* Role */
      .mc-role-cell { display: flex; align-items: center; }
      .mc-role-badge {
        display: inline-flex; align-items: center; gap: 0.4rem;
        padding: 0.35rem 0.7rem;
        border-radius: 8px;
        border: 1px solid;
        font-size: 0.75rem;
        font-weight: 700;
        white-space: nowrap;
      }
      .mc-lock-icon { opacity: 0.6; margin-left: 0.15rem; }

      .mc-role-select-wrap {
        position: relative;
        display: inline-flex;
        align-items: center;
      }
      .mc-role-select {
        appearance: none;
        padding: 0.35rem 1.75rem 0.35rem 0.7rem;
        border-radius: 8px;
        border: 1px solid;
        font-size: 0.75rem;
        font-weight: 700;
        font-family: inherit;
        cursor: pointer;
        transition: all 0.2s;
        background-color: transparent;
      }
      .mc-role-select:focus {
        outline: none;
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--gold) 15%, transparent);
      }
      .mc-role-select:disabled { cursor: not-allowed; opacity: 0.7; }
      .mc-role-arrow {
        position: absolute; right: 0.6rem;
        pointer-events: none;
        opacity: 0.7;
      }

      /* Status pill */
      .mc-status-pill {
        display: inline-flex; align-items: center; gap: 0.35rem;
        padding: 0.35rem 0.7rem;
        border-radius: 999px;
        border: 1px solid;
        font-size: 0.72rem;
        font-weight: 700;
        white-space: nowrap;
      }
      .mc-status-pill.active {
        background: rgba(16,185,129,0.1);
        color: #059669;
        border-color: rgba(16,185,129,0.3);
      }
      .mc-status-pill.inactive {
        background: rgba(239,68,68,0.1);
        color: #DC2626;
        border-color: rgba(239,68,68,0.3);
      }
      .dark .mc-status-pill.active { color: #34D399; }
      .dark .mc-status-pill.inactive { color: #F87171; }

      /* Action button */
      .mc-action-btn {
        display: inline-flex; align-items: center; justify-content: center;
        gap: 0.35rem;
        padding: 0.4rem 0.8rem;
        border-radius: 8px;
        font-size: 0.75rem;
        font-weight: 700;
        border: 1px solid;
        cursor: pointer;
        transition: all 0.25s var(--ease-spring, cubic-bezier(0.34,1.56,0.64,1));
        white-space: nowrap;
        background: transparent;
        font-family: inherit;
        position: relative;
        overflow: hidden;
      }
      .mc-action-btn::before {
        content: '';
        position: absolute; inset: 0;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,.3), transparent);
        transform: translateX(-100%);
        transition: transform 0.6s ease;
        pointer-events: none;
      }
      .mc-action-btn:hover::before { transform: translateX(100%); }
      .mc-action-btn > * { position: relative; z-index: 1; }

      .mc-action-btn.danger {
        color: #DC2626;
        border-color: rgba(239,68,68,0.3);
      }
      .mc-action-btn.danger:hover {
        background: rgba(239,68,68,0.08);
        border-color: #EF4444;
        transform: translateY(-1px);
      }
      .mc-action-btn.success {
        color: #059669;
        border-color: rgba(16,185,129,0.3);
      }
      .mc-action-btn.success:hover {
        background: rgba(16,185,129,0.08);
        border-color: #10B981;
        transform: translateY(-1px);
      }
      .mc-action-btn:disabled { opacity: 0.5; cursor: not-allowed; }

      .mc-action-locked, .mc-action-self {
        display: inline-flex; align-items: center; gap: 0.35rem;
        font-size: 0.72rem; font-weight: 600;
        color: var(--text-muted);
      }
      .mc-action-locked { font-style: italic; }
      .mc-action-self {
        background: var(--gold-soft);
        color: var(--gold);
        padding: 0.25rem 0.6rem;
        border-radius: 6px;
        font-weight: 700;
        border: 1px solid color-mix(in srgb, var(--gold) 30%, transparent);
      }

      .mc-btn-spinner {
        width: 12px; height: 12px;
        border: 2px solid rgba(0,0,0,0.15);
        border-top-color: currentColor;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
        display: inline-block;
      }
      @keyframes spin { to { transform: rotate(360deg); } }

      /* ============ SKELETON ============ */
      .mc-skeleton { padding: 0; }
      .mc-skel-head {
        height: 44px;
        background: var(--background);
        border-bottom: 1px solid var(--border);
        animation: pulse 1.5s ease-in-out infinite;
      }
      .mc-skel-row {
        height: 68px;
        background: var(--surface);
        border-bottom: 1px solid var(--border);
        animation: pulse 1.5s ease-in-out infinite;
      }
      .mc-skel-row:last-child { border-bottom: none; }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      /* ============ EMPTY ============ */
      .mc-empty {
        position: relative;
        padding: 3rem 1.5rem;
        text-align: center;
        display: flex; flex-direction: column; align-items: center;
        gap: 0.5rem;
        overflow: hidden;
      }
      .mc-empty-glow {
        position: absolute;
        top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        width: 300px; height: 300px;
        background: radial-gradient(circle, color-mix(in srgb, var(--gold) 15%, transparent) 0%, transparent 70%);
        filter: blur(40px);
        opacity: 0.6;
        pointer-events: none;
        animation: empty-pulse 4s ease-in-out infinite;
      }
      @keyframes empty-pulse {
        0%, 100% { opacity: 0.4; transform: translate(-50%, -50%) scale(1); }
        50% { opacity: 0.7; transform: translate(-50%, -50%) scale(1.1); }
      }
      .mc-empty-icon {
        position: relative; z-index: 1;
        width: 68px; height: 68px;
        border-radius: 50%;
        background: var(--background);
        border: 1px solid var(--border);
        color: var(--text-muted);
        display: flex; align-items: center; justify-content: center;
        margin-bottom: 0.5rem;
        animation: icon-float 3s ease-in-out infinite;
      }
      @keyframes icon-float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-6px); }
      }
      .mc-empty-title {
        position: relative; z-index: 1;
        font-family: 'Playfair Display', Georgia, serif;
        font-weight: 700; font-size: 1rem;
        color: var(--text-main);
      }
      .mc-empty-sub {
        position: relative; z-index: 1;
        font-size: 0.85rem;
        color: var(--text-muted);
        max-width: 360px;
      }
      .mc-empty-btn {
        position: relative; z-index: 1;
        margin-top: 0.75rem;
        padding: 0.5rem 1rem;
        border-radius: 8px;
        background: var(--gold-soft);
        color: var(--gold);
        border: 1px solid color-mix(in srgb, var(--gold) 40%, transparent);
        font-weight: 600;
        font-size: 0.8rem;
        cursor: pointer;
        transition: all 0.2s;
        font-family: inherit;
      }
      .mc-empty-btn:hover {
        background: var(--gold);
        color: white;
        transform: translateY(-1px);
        box-shadow: 0 4px 16px -4px color-mix(in srgb, var(--gold) 50%, transparent);
      }

      /* ============ INFO PANEL ============ */
      .mc-info-panel {
        display: flex; gap: 0.85rem;
        background: var(--gold-soft);
        border: 1px solid color-mix(in srgb, var(--gold) 40%, transparent);
        border-radius: 14px;
        padding: 1rem 1.25rem;
        position: relative;
        overflow: hidden;
      }
      .mc-info-panel::before {
        content: '';
        position: absolute; top: 0; left: 0; right: 0; height: 2px;
        background: linear-gradient(90deg, transparent, var(--gold), transparent);
        opacity: 0.7;
      }
      .mc-info-icon {
        width: 38px; height: 38px;
        border-radius: 10px;
        background: linear-gradient(135deg, var(--gold) 0%, var(--maroon-light) 100%);
        color: white;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
        box-shadow: 0 4px 12px -2px color-mix(in srgb, var(--gold) 50%, transparent);
      }
      .mc-info-body { flex: 1; min-width: 0; }
      .mc-info-title {
        font-family: 'Playfair Display', Georgia, serif;
        font-weight: 800;
        font-size: 0.9rem;
        color: var(--text-main);
        margin-bottom: 0.4rem;
      }
      .mc-info-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex; flex-direction: column;
        gap: 0.3rem;
      }
      .mc-info-list li {
        font-size: 0.8rem;
        color: var(--text-muted);
        line-height: 1.55;
        padding-left: 1rem;
        position: relative;
      }
      .mc-info-list li::before {
        content: '•';
        position: absolute;
        left: 0;
        color: var(--gold);
        font-weight: 900;
      }
      .mc-info-list strong {
        color: var(--text-main);
        font-weight: 700;
      }

      @media (max-width: 640px) {
        .mc-table th:nth-child(2),
        .mc-table td:nth-child(2) { min-width: 140px; }
      }
    `}</style>
  );
}