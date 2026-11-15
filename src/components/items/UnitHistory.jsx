import { useEffect, useState, useMemo } from "react";
import { 
  Plus, Pencil, Trash2, MapPin, RefreshCw, 
  ArrowDownToLine, ArrowUpFromLine, ScanLine, 
  Flag, Clock, History, Package, ArrowRight,
  AlertCircle, CheckCircle2
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useThemeStore } from "../../stores/themeStore";

/* ── Meta per tipe movement ── */
const typeMeta = {
  created: {
    label: "Dibuat", icon: Plus, color: "#10B981", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)",
  },
  updated: {
    label: "Diperbarui", icon: Pencil, color: "#3B82F6", bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.3)",
  },
  deleted: {
    label: "Dihapus", icon: Trash2, color: "#EF4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)",
  },
  moved_location: {
    label: "Pindah Lokasi", icon: MapPin, color: "#8B5CF6", bg: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.3)",
  },
  changed_condition: {
    label: "Ubah Kondisi", icon: RefreshCw, color: "#F59E0B", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)",
  },
  qty_in: {
    label: "Stok Masuk", icon: ArrowDownToLine, color: "#10B981", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)",
  },
  qty_out: {
    label: "Stok Keluar", icon: ArrowUpFromLine, color: "#F59E0B", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)",
  },
  scanned: {
    label: "Di-scan", icon: ScanLine, color: "#6B7280", bg: "rgba(107,114,128,0.12)", border: "rgba(107,114,128,0.3)",
  },
  status_changed: {
    label: "Ubah Status", icon: Flag, color: "#6366F1", bg: "rgba(99,102,241,0.12)", border: "rgba(99,102,241,0.3)",
  },
};

const conditionLabel = { baik: "Baik", rusak_ringan: "Rusak Ringan", rusak_berat: "Rusak Berat" };
const statusLabel = {
  active: "Aktif", rusak: "Rusak", hilang: "Hilang", dipinjam: "Dipinjam", maintenance: "Perbaikan",
};

/* ── Format waktu relatif ── */
function formatRelative(date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  return null;
}

export default function UnitHistory({ unitId }) {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("item_movements")
        .select("*")
        .eq("unit_id", unitId)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      setMovements(data || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [unitId]);

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="mc-hist">
        <HistoryStyles />
        {[1, 2, 3].map(i => (
          <div key={i} className="mc-hist-skel" style={{ animationDelay: `${i * 0.1}s` }} />
        ))}
      </div>
    );
  }

  // ── Empty ──
  if (movements.length === 0) {
    return (
      <div className="mc-hist">
        <HistoryStyles />
        <div className="mc-hist-empty">
          <div className="mc-hist-empty-icon">
            <History size={28} />
          </div>
          <p className="mc-hist-empty-title">Belum ada riwayat</p>
          <p className="mc-hist-empty-sub">
            Aktivitas unit akan muncul di sini seiring waktu.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mc-hist">
      <HistoryStyles />
      <div className="mc-hist-list">
        {movements.map((m, idx) => {
          const meta = typeMeta[m.movement_type] || {
            label: m.movement_type,
            icon: Package,
            color: "#6B7280",
            bg: "rgba(107,114,128,0.12)",
            border: "rgba(107,114,128,0.3)",
          };
          const Icon = meta.icon;
          const date = new Date(m.created_at);
          const relative = formatRelative(date);
          const isLast = idx === movements.length - 1;

          return (
            <div key={m.id} className="mc-hist-item">
              {/* Connector line */}
              {!isLast && <div className="mc-hist-line" />}

              {/* Icon dot */}
              <div
                className="mc-hist-icon"
                style={{
                  background: meta.bg,
                  color: meta.color,
                  borderColor: meta.border,
                }}
              >
                <Icon size={14} />
              </div>

              {/* Content */}
              <div className="mc-hist-content">
                {/* Header row */}
                <div className="mc-hist-header">
                  <span
                    className="mc-hist-badge"
                    style={{
                      background: meta.bg,
                      color: meta.color,
                      borderColor: meta.border,
                    }}
                  >
                    {meta.label}
                  </span>
                  <span className="mc-hist-time">
                    <Clock size={10} />
                    {date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    {relative && (
                      <>
                        <span className="mc-hist-time-sep">·</span>
                        <span className="mc-hist-time-rel">{relative}</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Detail content */}
                <div className="mc-hist-body">
                  {m.movement_type === "changed_condition" && (
                    <p className="mc-hist-change">
                      Kondisi:{" "}
                      <strong>{conditionLabel[m.from_condition] || m.from_condition || "-"}</strong>
                      <ArrowRight size={11} className="mc-hist-arrow" />
                      <strong>{conditionLabel[m.to_condition] || m.to_condition || "-"}</strong>
                    </p>
                  )}

                  {m.movement_type === "status_changed" && (
                    <p className="mc-hist-change">
                      Status:{" "}
                      <strong>{statusLabel[m.from_status] || m.from_status || "-"}</strong>
                      <ArrowRight size={11} className="mc-hist-arrow" />
                      <strong>{statusLabel[m.to_status] || m.to_status || "-"}</strong>
                    </p>
                  )}

                  {m.movement_type === "moved_location" && (
                    <p className="mc-hist-change">
                      Lokasi:{" "}
                      <strong>{m.from_location || "-"}</strong>
                      <ArrowRight size={11} className="mc-hist-arrow" />
                      <strong>{m.to_location || "-"}</strong>
                    </p>
                  )}

                  {m.notes && (
                    <p className="mc-hist-notes">"{m.notes}"</p>
                  )}
                </div>

                {/* Date (absolute) */}
                <p className="mc-hist-date">
                  {date.toLocaleDateString("id-ID", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   Styles
============================================================ */
function HistoryStyles() {
  return (
    <style>{`
      .mc-hist { display: flex; flex-direction: column; }

      /* ── List container ── */
      .mc-hist-list {
        display: flex;
        flex-direction: column;
        padding: 0.25rem 0;
      }

      /* ── Item row ── */
      .mc-hist-item {
        position: relative;
        display: flex;
        gap: 0.75rem;
        padding: 0.5rem 0;
      }

      /* Connector line */
      .mc-hist-line {
        position: absolute;
        left: 17px;
        top: 38px;
        bottom: -8px;
        width: 2px;
        background: linear-gradient(to bottom, var(--border) 60%, transparent);
        border-radius: 1px;
      }

      /* Icon dot */
      .mc-hist-icon {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 1.5px solid;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        position: relative;
        z-index: 1;
        background: var(--surface);
      }

      /* ── Content ── */
      .mc-hist-content {
        flex: 1;
        min-width: 0;
        padding-bottom: 0.6rem;
      }

      /* Header row */
      .mc-hist-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        flex-wrap: wrap;
        margin-bottom: 0.35rem;
      }
      .mc-hist-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.65rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        padding: 0.2rem 0.55rem;
        border-radius: 999px;
        border: 1px solid;
      }
      .mc-hist-time {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.7rem;
        font-weight: 600;
        color: var(--text-muted);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .mc-hist-time-sep {
        opacity: 0.5;
        margin: 0 1px;
      }
      .mc-hist-time-rel {
        color: var(--text-muted);
        font-weight: 500;
        font-style: italic;
      }

      /* Body */
      .mc-hist-body {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }
      .mc-hist-change {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        font-size: 0.82rem;
        color: var(--text-main);
        flex-wrap: wrap;
      }
      .mc-hist-change strong {
        font-weight: 800;
        color: var(--text-main);
        background: var(--background);
        border: 1px solid var(--border);
        padding: 0.05rem 0.4rem;
        border-radius: 4px;
        font-size: 0.75rem;
      }
      .mc-hist-arrow {
        color: var(--accent);
        opacity: 0.7;
        flex-shrink: 0;
      }
      .mc-hist-notes {
        font-size: 0.78rem;
        font-style: italic;
        color: var(--text-muted);
        padding: 0.35rem 0.6rem;
        background: var(--background);
        border-left: 2px solid var(--border);
        border-radius: 0 6px 6px 0;
        line-height: 1.4;
      }

      /* Date */
      .mc-hist-date {
        font-size: 0.65rem;
        color: var(--text-muted);
        opacity: 0.7;
        margin-top: 0.4rem;
        font-weight: 500;
      }

      /* ── Skeleton ── */
      .mc-hist-skel {
        height: 64px;
        border-radius: 10px;
        background: var(--background);
        animation: mc-hist-pulse 1.5s ease-in-out infinite;
      }
      @keyframes mc-hist-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      /* ── Empty ── */
      .mc-hist-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 2rem 1rem;
        text-align: center;
        gap: 0.4rem;
      }
      .mc-hist-empty-icon {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: var(--background);
        border: 1px solid var(--border);
        color: var(--text-muted);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 0.5rem;
      }
      .mc-hist-empty-title {
        font-size: 0.9rem;
        font-weight: 700;
        color: var(--text-main);
      }
      .mc-hist-empty-sub {
        font-size: 0.78rem;
        color: var(--text-muted);
        max-width: 260px;
        line-height: 1.4;
      }

      /* Mobile */
      @media (max-width: 640px) {
        .mc-hist-item { gap: 0.6rem; }
        .mc-hist-icon { width: 32px; height: 32px; }
        .mc-hist-line { left: 15px; top: 34px; }
        .mc-hist-header { gap: 0.3rem; }
        .mc-hist-badge { font-size: 0.6rem; padding: 0.15rem 0.4rem; }
        .mc-hist-time { font-size: 0.65rem; }
      }
    `}</style>
  );
}