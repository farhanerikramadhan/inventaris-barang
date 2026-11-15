import { useEffect, useState } from "react";
import { 
  Plus, Pencil, Trash2, MapPin, RefreshCw, 
  ArrowDownToLine, ArrowUpFromLine, ScanLine,
  Clock, History, Package, ArrowRight, 
  TrendingUp, TrendingDown, AlertCircle, Sparkles
} from "lucide-react";
import { supabase } from "../../lib/supabase";

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
    label: "Ubah Status", icon: AlertCircle, color: "#6366F1", bg: "rgba(99,102,241,0.12)", border: "rgba(99,102,241,0.3)",
  },
};

/* ── Label maps ── */
const conditionLabel = { baik: "Baik", rusak_ringan: "Rusak Ringan", rusak_berat: "Rusak Berat" };
const statusLabel = {
  active: "Aktif", rusak: "Rusak", hilang: "Hilang", dipinjam: "Dipinjam", maintenance: "Perbaikan",
};

/* ── Format relative time ── */
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

export default function ItemHistory({ itemId }) {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("item_movements")
        .select(`
          *,
          from_location:locations!item_movements_from_location_id_fkey(name),
          to_location:locations!item_movements_to_location_id_fkey(name)
        `)
        .eq("item_id", itemId)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      setMovements(data || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [itemId]);

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="mc-ih">
        <ItemHistoryStyles />
        {[1, 2, 3].map(i => (
          <div key={i} className="mc-ih-skel" style={{ animationDelay: `${i * 0.1}s` }} />
        ))}
      </div>
    );
  }

  // ── Empty ──
  if (movements.length === 0) {
    return (
      <div className="mc-ih">
        <ItemHistoryStyles />
        <div className="mc-ih-empty">
          <div className="mc-ih-empty-icon">
            <History size={28} />
          </div>
          <p className="mc-ih-empty-title">Belum ada riwayat</p>
          <p className="mc-ih-empty-sub">
            Aktivitas barang induk akan muncul di sini seiring waktu.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mc-ih">
      <ItemHistoryStyles />
      <div className="mc-ih-list">
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
            <div key={m.id} className="mc-ih-item">
              {!isLast && <div className="mc-ih-line" />}

              {/* Icon dot */}
              <div
                className="mc-ih-icon"
                style={{ background: meta.bg, color: meta.color, borderColor: meta.border }}
              >
                <Icon size={14} />
              </div>

              {/* Content */}
              <div className="mc-ih-content">
                {/* Header */}
                <div className="mc-ih-header">
                  <span
                    className="mc-ih-badge"
                    style={{ background: meta.bg, color: meta.color, borderColor: meta.border }}
                  >
                    {meta.label}
                  </span>
                  <span className="mc-ih-time">
                    <Clock size={10} />
                    {date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    {relative && (
                      <>
                        <span className="mc-ih-time-sep">·</span>
                        <span className="mc-ih-time-rel">{relative}</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Body — detail per tipe */}
                <div className="mc-ih-body">
                  {/* Pindah lokasi */}
                  {m.movement_type === "moved_location" && (
                    <div className="mc-ih-change-row">
                      <MapPin size={11} className="mc-ih-change-icon" />
                      <span className="mc-ih-change-label">Lokasi:</span>
                      <strong className="mc-ih-change-tag">{m.from_location?.name || "-"}</strong>
                      <ArrowRight size={11} className="mc-ih-arrow" />
                      <strong className="mc-ih-change-tag highlight">{m.to_location?.name || "-"}</strong>
                    </div>
                  )}

                  {/* Ubah kondisi */}
                  {m.movement_type === "changed_condition" && (
                    <div className="mc-ih-change-row">
                      <RefreshCw size={11} className="mc-ih-change-icon" />
                      <span className="mc-ih-change-label">Kondisi:</span>
                      <strong className="mc-ih-change-tag">
                        {conditionLabel[m.from_condition] || m.from_condition || "-"}
                      </strong>
                      <ArrowRight size={11} className="mc-ih-arrow" />
                      <strong className="mc-ih-change-tag highlight">
                        {conditionLabel[m.to_condition] || m.to_condition || "-"}
                      </strong>
                    </div>
                  )}

                  {/* Ubah status */}
                  {m.movement_type === "status_changed" && (
                    <div className="mc-ih-change-row">
                      <AlertCircle size={11} className="mc-ih-change-icon" />
                      <span className="mc-ih-change-label">Status:</span>
                      <strong className="mc-ih-change-tag">
                        {statusLabel[m.from_status] || m.from_status || "-"}
                      </strong>
                      <ArrowRight size={11} className="mc-ih-arrow" />
                      <strong className="mc-ih-change-tag highlight">
                        {statusLabel[m.to_status] || m.to_status || "-"}
                      </strong>
                    </div>
                  )}

                  {/* Qty in/out */}
                  {(m.movement_type === "qty_in" || m.movement_type === "qty_out") && (
                    <div className="mc-ih-qty">
                      <div className="mc-ih-qty-badge">
                        {m.movement_type === "qty_in" ? (
                          <><TrendingUp size={12} /> Masuk</>
                        ) : (
                          <><TrendingDown size={12} /> Keluar</>
                        )}
                      </div>
                      <div className="mc-ih-qty-flow">
                        <span className="mc-ih-qty-num">{m.qty_before ?? "-"}</span>
                        <ArrowRight size={11} className="mc-ih-arrow" />
                        <span
                          className="mc-ih-qty-num highlight"
                          style={{
                            color: m.movement_type === "qty_in" ? "#10B981" : "#F59E0B",
                            background: m.movement_type === "qty_in" ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)",
                            borderColor: m.movement_type === "qty_in" ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.3)",
                          }}
                        >
                          {m.qty_after ?? "-"}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {m.notes && (
                    <p className="mc-ih-notes">"{m.notes}"</p>
                  )}
                </div>

                {/* Date */}
                <p className="mc-ih-date">
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
function ItemHistoryStyles() {
  return (
    <style>{`
      .mc-ih { display: flex; flex-direction: column; }

      .mc-ih-list {
        display: flex;
        flex-direction: column;
        padding: 0.25rem 0;
      }

      .mc-ih-item {
        position: relative;
        display: flex;
        gap: 0.75rem;
        padding: 0.5rem 0;
      }
      .mc-ih-line {
        position: absolute;
        left: 17px;
        top: 38px;
        bottom: -8px;
        width: 2px;
        background: linear-gradient(to bottom, var(--border) 60%, transparent);
        border-radius: 1px;
      }
      .mc-ih-icon {
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

      .mc-ih-content {
        flex: 1;
        min-width: 0;
        padding-bottom: 0.6rem;
      }

      .mc-ih-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        flex-wrap: wrap;
        margin-bottom: 0.35rem;
      }
      .mc-ih-badge {
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
      .mc-ih-time {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.7rem;
        font-weight: 600;
        color: var(--text-muted);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .mc-ih-time-sep { opacity: 0.5; margin: 0 1px; }
      .mc-ih-time-rel {
        color: var(--text-muted);
        font-weight: 500;
        font-style: italic;
      }

      /* Body */
      .mc-ih-body {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
      }

      /* Change row (location, condition, status) */
      .mc-ih-change-row {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        font-size: 0.78rem;
        color: var(--text-muted);
        flex-wrap: wrap;
      }
      .mc-ih-change-icon {
        color: var(--accent);
        opacity: 0.7;
        flex-shrink: 0;
      }
      .mc-ih-change-label {
        font-weight: 600;
      }
      .mc-ih-change-tag {
        font-weight: 800;
        color: var(--text-main);
        background: var(--background);
        border: 1px solid var(--border);
        padding: 0.05rem 0.4rem;
        border-radius: 4px;
        font-size: 0.72rem;
      }
      .mc-ih-change-tag.highlight {
        background: var(--accent-soft);
        border-color: var(--accent-border);
        color: var(--accent);
      }
      .mc-ih-arrow {
        color: var(--accent);
        opacity: 0.7;
        flex-shrink: 0;
      }

      /* Qty flow */
      .mc-ih-qty {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
      .mc-ih-qty-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.65rem;
        font-weight: 800;
        text-transform: uppercase;
        color: var(--text-muted);
        padding: 0.15rem 0.4rem;
        background: var(--background);
        border: 1px solid var(--border);
        border-radius: 4px;
        letter-spacing: 0.03em;
      }
      .mc-ih-qty-flow {
        display: flex;
        align-items: center;
        gap: 0.3rem;
      }
      .mc-ih-qty-num {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 32px;
        padding: 0.15rem 0.5rem;
        font-size: 0.82rem;
        font-weight: 800;
        color: var(--text-main);
        background: var(--background);
        border: 1px solid var(--border);
        border-radius: 6px;
        font-variant-numeric: tabular-nums;
      }
      .mc-ih-qty-num.highlight {
        border-width: 1.5px;
      }

      /* Notes */
      .mc-ih-notes {
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
      .mc-ih-date {
        font-size: 0.65rem;
        color: var(--text-muted);
        opacity: 0.7;
        margin-top: 0.4rem;
        font-weight: 500;
      }

      /* Skeleton */
      .mc-ih-skel {
        height: 64px;
        border-radius: 10px;
        background: var(--background);
        animation: mc-ih-pulse 1.5s ease-in-out infinite;
      }
      @keyframes mc-ih-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      /* Empty */
      .mc-ih-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 2rem 1rem;
        text-align: center;
        gap: 0.4rem;
      }
      .mc-ih-empty-icon {
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
      .mc-ih-empty-title {
        font-size: 0.9rem;
        font-weight: 700;
        color: var(--text-main);
      }
      .mc-ih-empty-sub {
        font-size: 0.78rem;
        color: var(--text-muted);
        max-width: 260px;
        line-height: 1.4;
      }

      /* Mobile */
      @media (max-width: 640px) {
        .mc-ih-item { gap: 0.6rem; }
        .mc-ih-icon { width: 32px; height: 32px; }
        .mc-ih-line { left: 15px; top: 34px; }
        .mc-ih-header { gap: 0.3rem; }
        .mc-ih-badge { font-size: 0.6rem; padding: 0.15rem 0.4rem; }
        .mc-ih-time { font-size: 0.65rem; }
      }
    `}</style>
  );
}