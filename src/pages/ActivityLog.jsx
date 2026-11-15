import { useEffect, useState, useMemo } from "react";
import {
  History, Search, Activity, Clock, Box,
  Sparkles, X, CheckCircle2, Pencil, MapPin, Tag, Upload,
  User, Filter, ChevronDown, ChevronUp, Calendar,
  Users, ShieldCheck, ArrowUpRight
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../stores/authStore";

/* ── Label ramah pengguna ── */
const actionLabels = {
  create_item: "Membuat Barang Baru",
  update_item: "Memperbarui Barang",
  delete_item: "Menghapus Barang",
  create_category: "Menambah Kategori",
  delete_category: "Menghapus Kategori",
  create_location: "Menambah Lokasi",
  delete_location: "Menghapus Lokasi",
  update_unit: "Mengubah Kondisi Unit",
  import_csv: "Import Data CSV",
};

const roleLabels = {
  super_admin: "Super Admin",
  admin: "Admin",
  viewer: "Viewer",
};

/* ── Kategori aksi → ikon + warna ── */
const getActionMeta = (action = "") => {
  if (action.includes("delete"))
    return { type: "delete", icon: Activity, color: "#EF4444", bg: "rgba(239,68,68,0.12)" };
  if (action.includes("create") && action.includes("item"))
    return { type: "create", icon: Box, color: "#10B981", bg: "rgba(16,185,129,0.12)" };
  if (action.includes("create") && action.includes("category"))
    return { type: "create", icon: Tag, color: "#8B5CF6", bg: "rgba(139,92,246,0.12)" };
  if (action.includes("create") && action.includes("location"))
    return { type: "create", icon: MapPin, color: "#06B6D4", bg: "rgba(6,182,212,0.12)" };
  if (action.includes("create"))
    return { type: "create", icon: Box, color: "#10B981", bg: "rgba(16,185,129,0.12)" };
  if (action.includes("update"))
    return { type: "update", icon: Pencil, color: "#F59E0B", bg: "rgba(245,158,11,0.12)" };
  if (action.includes("import"))
    return { type: "import", icon: Upload, color: "#3B82F6", bg: "rgba(59,130,246,0.12)" };
  return { type: "system", icon: Clock, color: "#B91C1C", bg: "rgba(185,28,28,0.12)" };
};

/* ── Avatar warna konsisten per nama ── */
const AVATAR_COLORS = [
  { bg: "rgba(212,175,55,0.12)", color: "#D4AF37" },
  { bg: "rgba(16,185,129,0.12)", color: "#10B981" },
  { bg: "rgba(139,92,246,0.12)", color: "#8B5CF6" },
  { bg: "rgba(245,158,11,0.12)", color: "#F59E0B" },
  { bg: "rgba(236,72,153,0.12)", color: "#EC4899" },
  { bg: "rgba(6,182,212,0.12)",  color: "#06B6D4" },
];

function getActorAvatar(name = "") {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() || "")
    .join("") || "?";
  const hash = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const color = AVATAR_COLORS[hash % AVATAR_COLORS.length];
  return { initials, ...color };
}

const FILTERS = [
  { key: "all", label: "Semua", icon: Filter },
  { key: "me", label: "Saya", icon: User },
  { key: "create", label: "Dibuat", icon: Box },
  { key: "update", label: "Diubah", icon: Pencil },
  { key: "delete", label: "Dihapus", icon: Activity },
  { key: "import", label: "Import", icon: Upload },
];

export default function ActivityLog() {
  const { user } = useAuthStore();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 30);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    (async () => {
      // 1. Ambil log
      const { data: logs, error } = await supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("Gagal ambil log:", error.message);
        setLoading(false);
        return;
      }

      if (!logs || logs.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      // 2. Ambil profil semua pelaku (1x query)
      const userIds = [...new Set(logs.map(l => l.user_id).filter(Boolean))];
      let profilesMap = {};

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, role")
          .in("id", userIds);

        profilesMap = Object.fromEntries(
          (profiles || []).map(p => [p.id, p])
        );
      }

      // 3. Merge actor ke log
      setRows(
        logs.map(l => ({
          ...l,
          actor: l.user_id ? profilesMap[l.user_id] || null : null,
        }))
      );
      setLoading(false);
    })();
  }, []);

  // ── Filter ──
  const filtered = useMemo(() => {
    return rows.filter(row => {
      if (filterType === "me" && row.user_id !== user?.id) return false;
      if (filterType !== "all" && filterType !== "me") {
        const meta = getActionMeta(row.action);
        if (meta.type !== filterType) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        return (
          row.action.toLowerCase().includes(q) ||
          (row.entity && row.entity.toLowerCase().includes(q)) ||
          (row.actor?.full_name && row.actor.full_name.toLowerCase().includes(q)) ||
          (row.detail && JSON.stringify(row.detail).toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [rows, search, filterType, user?.id]);

  // ── Group by tanggal ──
  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach(row => {
      const date = new Date(row.created_at);
      const key = date.toLocaleDateString("id-ID", {
        day: "numeric", month: "long", year: "numeric",
      });
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    });
    return Object.entries(groups);
  }, [filtered]);

  // ── Statistik ──
  const stats = useMemo(() => {
    const s = { create: 0, update: 0, delete: 0, import: 0 };
    rows.forEach(r => {
      const meta = getActionMeta(r.action);
      if (s[meta.type] !== undefined) s[meta.type]++;
    });
    return s;
  }, [rows]);

  const formatTime = (date) =>
    date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

  const formatRelative = (date) => {
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "baru saja";
    if (mins < 60) return `${mins} menit lalu`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} jam lalu`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} hari lalu`;
    return null;
  };

  const resetFilters = () => {
    setSearch("");
    setFilterType("all");
  };

  return (
    <div className={`mc-log ${mounted ? "is-mounted" : ""}`}>
      <LogStyles />

      {/* ========== HEADER ========== */}
      <div className="mc-log-head">
        <div className="mc-head-text">
          <div className="mc-log-eyebrow">
            <Sparkles size={12} /> Jejak Sistem
          </div>
          <h1 className="mc-log-title">
            <span className="mc-log-title-icon"><History size={22} /></span>
            Log Aktivitas
          </h1>
          <p className="mc-log-sub">
            Rekam jejak 100 aktivitas terakhir di sistem inventaris.
          </p>
        </div>
      </div>

      {/* ========== STAT SUMMARY ========== */}
      <div className="mc-stat-row">
        {[
          { label: "Dibuat", value: stats.create, icon: Box, color: "#10B981" },
          { label: "Diubah", value: stats.update, icon: Pencil, color: "#F59E0B" },
          { label: "Dihapus", value: stats.delete, icon: Activity, color: "#EF4444" },
          { label: "Import", value: stats.import, icon: Upload, color: "#3B82F6" },
        ].map((s, i) => (
          <div
            key={s.label}
            className="mc-stat-item"
            style={{ animationDelay: `${i * 0.06}s`, "--stat-accent": s.color }}
          >
            <span className="mc-stat-item-icon" style={{ background: `${s.color}15`, color: s.color }}>
              <s.icon size={14} />
            </span>
            <div className="mc-stat-item-body">
              <p className="mc-stat-item-val">{s.value}</p>
              <p className="mc-stat-item-lbl">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ========== TOOLBAR ========== */}
      <div className="mc-toolbar">
        <div className="mc-search-wrap">
          <Search size={18} className="mc-search-icon" />
          <input
            type="text"
            placeholder="Cari aksi, entitas, pelaku, atau detail..."
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
              onClick={() => setFilterType(f.key)}
              className={`mc-chip ${filterType === f.key ? "is-active" : ""}`}
            >
              <f.icon size={12} />
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ========== TIMELINE ========== */}
      {loading ? (
        <div className="mc-log-card">
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="mc-skel-row" style={{ animationDelay: `${i * 0.08}s` }} />
            ))}
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="mc-empty">
          <div className="mc-empty-glow" />
          <div className="mc-empty-icon">
            <Activity size={32} />
          </div>
          <h3 className="mc-empty-title">
            {search || filterType !== "all" ? "Tidak ada hasil" : "Belum ada aktivitas"}
          </h3>
          <p className="mc-empty-sub">
            {search || filterType !== "all"
              ? "Coba ubah kata kunci atau filter."
              : "Aktivitas pengguna akan muncul di sini."}
          </p>
          {(search || filterType !== "all") && (
            <button onClick={resetFilters} className="mc-empty-btn">
              Reset filter
            </button>
          )}
        </div>
      ) : (
        <div className="mc-log-card">
          {grouped.map(([dateLabel, items]) => (
            <div key={dateLabel} className="mc-date-group">
              <div className="mc-date-header">
                <span className="mc-date-icon"><Calendar size={13} /></span>
                <span>{dateLabel}</span>
                <span className="mc-date-count">{items.length}</span>
              </div>

              <div className="mc-timeline">
                {items.map((row, idx) => {
                  const date = new Date(row.created_at);
                  const meta = getActionMeta(row.action);
                  const Icon = meta.icon;
                  const label = actionLabels[row.action] || row.action;
                  const isExpanded = expandedId === row.id;
                  const hasDetail = row.detail && Object.keys(row.detail).length > 0;
                  const relative = formatRelative(date);
                  const actor = row.actor;
                  const avatar = actor ? getActorAvatar(actor.full_name || "") : null;

                  return (
                    <div key={row.id} className="mc-tl-item">
                      {idx < items.length - 1 && <div className="mc-tl-line" />}

                      {/* Icon aksi */}
                      <div
                        className="mc-tl-icon"
                        style={{
                          background: meta.bg,
                          color: meta.color,
                          borderColor: meta.color + "40",
                        }}
                      >
                        <Icon size={14} />
                      </div>

                      {/* Card */}
                      <div
                        className={`mc-tl-card ${hasDetail ? "has-detail" : ""} ${isExpanded ? "is-expanded" : ""}`}
                        onClick={() => hasDetail && setExpandedId(isExpanded ? null : row.id)}
                      >
                        <div className="mc-tl-card-top">
                          <div className="mc-tl-card-main">
                            <p className="mc-tl-label">{label}</p>

                            <div className="mc-tl-meta">
                              <span className="mc-tl-entity">{row.entity || "system"}</span>

                              {/* ── AKTOR ── */}
                              {actor ? (
                                <span className="mc-tl-actor" title={actor.full_name}>
                                  <span
                                    className="mc-tl-actor-avatar"
                                    style={{ background: avatar.bg, color: avatar.color }}
                                  >
                                    {avatar.initials}
                                  </span>
                                  <span className="mc-tl-actor-name">{actor.full_name}</span>
                                  {actor.role && (
                                    <span className="mc-tl-actor-role">
                                      {roleLabels[actor.role] || actor.role}
                                    </span>
                                  )}
                                </span>
                              ) : (
                                <span className="mc-tl-actor is-system">
                                  <span className="mc-tl-actor-avatar is-system">
                                    <ShieldCheck size={11} />
                                  </span>
                                  <span className="mc-tl-actor-name">Sistem</span>
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="mc-tl-time">
                            <span className="mc-tl-time-main">{formatTime(date)}</span>
                            {relative && <span className="mc-tl-time-rel">{relative}</span>}
                          </div>
                        </div>

                        {hasDetail && (
                          <>
                            <button
                              className="mc-tl-expand"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedId(isExpanded ? null : row.id);
                              }}
                            >
                              {isExpanded ? (
                                <>Sembunyikan detail <ChevronUp size={12} /></>
                              ) : (
                                <>Lihat detail <ChevronDown size={12} /></>
                              )}
                            </button>

                            {isExpanded && (
                              <div className="mc-tl-detail">
                                {Object.entries(row.detail).map(([key, val]) => (
                                  <div key={key} className="mc-tl-detail-row">
                                    <span className="mc-tl-detail-key">{key}</span>
                                    <span className="mc-tl-detail-val">
                                      {typeof val === "object" ? JSON.stringify(val) : String(val)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="mc-log-footer">
            <CheckCircle2 size={13} />
            Menampilkan <strong>{filtered.length}</strong> aktivitas
            {rows.length !== filtered.length && <> dari <strong>{rows.length}</strong></>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Styles — Tema Landing (Gold/Maroon/Navy)
============================================================ */
function LogStyles() {
  return (
    <style>{`
      /* ============ CONTAINER ============ */
      .mc-log {
        width: 100%;
        max-width: 100%;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        padding-bottom: 2.5rem;
        position: relative;
      }
      .mc-log > * {
        opacity: 0;
        transform: translateY(14px);
        transition: opacity 0.5s var(--ease-out, cubic-bezier(0.16,1,0.3,1)),
                    transform 0.5s var(--ease-out, cubic-bezier(0.16,1,0.3,1));
      }
      .mc-log.is-mounted > * { opacity: 1; transform: translateY(0); }
      .mc-log.is-mounted > *:nth-child(1) { transition-delay: 0s; }
      .mc-log.is-mounted > *:nth-child(2) { transition-delay: 0.08s; }
      .mc-log.is-mounted > *:nth-child(3) { transition-delay: 0.16s; }
      .mc-log.is-mounted > *:nth-child(4) { transition-delay: 0.24s; }

      /* ============ HEADER ============ */
      .mc-log-head { display: flex; flex-direction: column; gap: 1.25rem; }
      .mc-head-text { flex: 1; min-width: 0; }
      .mc-log-eyebrow {
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
      .mc-log-eyebrow svg { animation: eyebrow-spin 4s linear infinite; }
      @keyframes eyebrow-spin { to { transform: rotate(360deg); } }

      .mc-log-title {
        display: flex; align-items: center; gap: 0.75rem;
        font-family: 'Playfair Display', Georgia, serif;
        font-size: 1.85rem; font-weight: 800;
        color: var(--text-main);
        letter-spacing: -0.02em;
        margin-bottom: 0.35rem;
      }
      .mc-log-title-icon {
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
      .mc-log-title-icon::before {
        content: ''; position: absolute; inset: 0;
        background: linear-gradient(135deg, transparent, rgba(255,255,255,.4), transparent);
        transform: translateX(-100%);
        animation: icon-shimmer 3s ease-in-out infinite;
      }
      @keyframes icon-shimmer {
        0%, 100% { transform: translateX(-100%); }
        50% { transform: translateX(100%); }
      }
      .mc-log:hover .mc-log-title-icon { transform: scale(1.06) rotate(-4deg); }

      .mc-log-sub {
        font-size: 0.88rem; color: var(--text-muted);
        margin-left: 3.4rem;
      }
      @media (max-width: 640px) {
        .mc-log-title { font-size: 1.5rem; }
        .mc-log-title-icon { width: 36px; height: 36px; }
        .mc-log-sub { margin-left: 0; }
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
        position: relative;
        overflow: hidden;
      }
      .mc-stat-item::before {
        content: '';
        position: absolute; top: 0; left: 0; right: 0; height: 3px;
        background: linear-gradient(90deg, transparent, var(--stat-accent, var(--gold)), transparent);
        opacity: 0;
        transition: opacity 0.3s;
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

      /* ============ TOOLBAR ============ */
      .mc-toolbar {
        display: flex; flex-direction: column; gap: 0.75rem;
      }
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

      /* ============ LOG CARD ============ */
      .mc-log-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 18px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0,0,0,0.03);
      }

      .mc-date-group { padding: 1.25rem 1.5rem 0.5rem; }
      .mc-date-header {
        display: flex; align-items: center; gap: 0.5rem;
        font-size: 0.75rem; font-weight: 700;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.06em;
        margin-bottom: 0.75rem;
      }
      .mc-date-icon {
        width: 22px; height: 22px;
        border-radius: 6px;
        background: var(--gold-soft);
        color: var(--gold);
        display: inline-flex; align-items: center; justify-content: center;
      }
      .mc-date-count {
        background: var(--gold-soft);
        border: 1px solid color-mix(in srgb, var(--gold) 30%, transparent);
        color: var(--gold);
        padding: 0.1rem 0.5rem;
        border-radius: 999px;
        font-size: 0.68rem;
        margin-left: auto;
        font-weight: 700;
      }

      /* Timeline */
      .mc-timeline { position: relative; padding-left: 0.5rem; }
      .mc-tl-item {
        position: relative;
        display: flex;
        gap: 0.85rem;
        padding: 0.5rem 0;
      }
      .mc-tl-line {
        position: absolute;
        left: 17px; top: 34px; bottom: -12px;
        width: 2px;
        background: linear-gradient(to bottom, var(--border) 60%, transparent);
        border-radius: 1px;
      }
      .mc-tl-icon {
        width: 36px; height: 36px;
        border-radius: 50%;
        border: 1.5px solid;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
        position: relative;
        z-index: 1;
        background: var(--surface);
        box-shadow: 0 0 0 3px var(--background);
        transition: transform 0.25s var(--ease-spring, cubic-bezier(0.34,1.56,0.64,1));
      }
      .mc-tl-item:hover .mc-tl-icon { transform: scale(1.12); }

      .mc-tl-card {
        flex: 1;
        background: var(--background);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 0.85rem 1rem;
        transition: all 0.25s var(--ease-spring, cubic-bezier(0.34,1.56,0.64,1));
        min-width: 0;
      }
      .mc-tl-card.has-detail { cursor: pointer; }
      .mc-tl-card:hover {
        background: var(--surface);
        border-color: color-mix(in srgb, var(--gold) 40%, var(--border));
        box-shadow: 0 4px 16px -6px rgba(0,0,0,0.08);
        transform: translateX(2px);
      }
      .mc-tl-card.is-expanded {
        border-color: color-mix(in srgb, var(--gold) 50%, var(--border));
        box-shadow: 0 8px 20px -8px rgba(0,0,0,0.1);
        background: var(--surface);
      }
      .mc-tl-card-top {
        display: flex; align-items: flex-start;
        justify-content: space-between;
        gap: 0.75rem;
        flex-wrap: wrap;
      }
      .mc-tl-card-main { flex: 1; min-width: 0; }
      .mc-tl-label {
        font-size: 0.88rem; font-weight: 700;
        color: var(--text-main);
        line-height: 1.3;
      }
      .mc-tl-meta {
        display: flex; flex-wrap: wrap;
        align-items: center;
        gap: 0.4rem;
        margin-top: 0.45rem;
      }
      .mc-tl-entity {
        font-family: 'JetBrains Mono', 'Courier New', monospace;
        font-size: 0.68rem;
        background: var(--surface);
        border: 1px solid var(--border);
        color: var(--text-muted);
        padding: 0.1rem 0.45rem;
        border-radius: 4px;
        font-weight: 600;
      }

      /* Actor chip */
      .mc-tl-actor {
        display: inline-flex; align-items: center; gap: 0.35rem;
        font-size: 0.7rem;
        color: var(--text-main);
        background: var(--surface);
        border: 1px solid var(--border);
        padding: 0.15rem 0.5rem 0.15rem 0.15rem;
        border-radius: 999px;
        font-weight: 600;
        max-width: 100%;
        transition: all 0.2s;
      }
      .mc-tl-actor:hover {
        border-color: color-mix(in srgb, var(--gold) 50%, var(--border));
        background: var(--gold-soft);
      }
      .mc-tl-actor.is-system {
        color: var(--text-muted);
        font-style: italic;
      }
      .mc-tl-actor-avatar {
        width: 20px; height: 20px;
        border-radius: 50%;
        display: inline-flex; align-items: center; justify-content: center;
        font-size: 0.6rem; font-weight: 800;
        letter-spacing: 0.02em;
        flex-shrink: 0;
      }
      .mc-tl-actor-avatar.is-system {
        background: var(--background);
        color: var(--text-muted);
        border: 1px solid var(--border);
      }
      .mc-tl-actor-name {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 140px;
      }
      .mc-tl-actor-role {
        font-size: 0.6rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--gold);
        background: var(--gold-soft);
        border: 1px solid color-mix(in srgb, var(--gold) 40%, transparent);
        padding: 0.05rem 0.4rem;
        border-radius: 4px;
      }

      .mc-tl-time {
        display: flex; flex-direction: column;
        align-items: flex-end;
        gap: 1px;
        flex-shrink: 0;
      }
      .mc-tl-time-main {
        font-size: 0.78rem; font-weight: 700;
        color: var(--text-main);
        font-variant-numeric: tabular-nums;
      }
      .mc-tl-time-rel {
        font-size: 0.68rem;
        color: var(--text-muted);
      }

      /* Expand */
      .mc-tl-expand {
        display: inline-flex; align-items: center; gap: 0.25rem;
        margin-top: 0.6rem;
        background: transparent;
        border: none;
        color: var(--gold);
        font-size: 0.72rem;
        font-weight: 600;
        cursor: pointer;
        padding: 0.25rem 0;
        transition: opacity 0.2s;
        font-family: inherit;
      }
      .mc-tl-expand:hover { opacity: 0.75; }

      /* Detail */
      .mc-tl-detail {
        margin-top: 0.5rem;
        padding: 0.65rem 0.8rem;
        background: var(--gold-soft);
        border: 1px solid color-mix(in srgb, var(--gold) 30%, transparent);
        border-radius: 8px;
        display: flex; flex-direction: column; gap: 0.35rem;
        animation: detail-in 0.25s var(--ease-out, cubic-bezier(0.16,1,0.3,1));
      }
      @keyframes detail-in {
        from { opacity: 0; transform: translateY(-4px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .mc-tl-detail-row {
        display: flex; gap: 0.5rem;
        font-size: 0.72rem;
        align-items: baseline;
      }
      .mc-tl-detail-key {
        color: var(--text-muted);
        text-transform: capitalize;
        font-weight: 600;
        min-width: 70px;
        flex-shrink: 0;
      }
      .mc-tl-detail-val {
        color: var(--text-main);
        font-weight: 500;
        word-break: break-word;
      }

      /* Footer */
      .mc-log-footer {
        display: flex; align-items: center; justify-content: center;
        gap: 0.4rem;
        padding: 0.85rem;
        font-size: 0.78rem;
        color: var(--text-muted);
        border-top: 1px solid var(--border);
        background: var(--background);
      }
      .mc-log-footer svg { color: #10B981; }
      .mc-log-footer strong { color: var(--text-main); font-weight: 700; }

      /* ============ SKELETON ============ */
      .mc-skel-row {
        height: 70px;
        border-radius: 12px;
        background: var(--background);
        animation: pulse 1.5s ease-in-out infinite;
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      /* ============ EMPTY ============ */
      .mc-empty {
        position: relative;
        background: var(--surface);
        border: 1.5px dashed var(--border);
        border-radius: 18px;
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
        max-width: 320px;
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

      @media (max-width: 640px) {
        .mc-date-group { padding: 1rem 1rem 0.5rem; }
        .mc-tl-card-top { flex-direction: column; gap: 0.35rem; }
        .mc-tl-time { flex-direction: row; align-items: center; gap: 0.4rem; }
        .mc-tl-actor-name { max-width: 100px; }
      }
    `}</style>
  );
}