import { useState, useMemo, useEffect } from "react";
import { 
  Edit, Search, Filter, X, QrCode, Hash, 
  Package, Box, ListFilter, LayoutGrid, 
  AlertCircle, Sparkles, ChevronDown
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import UnitForm from "./UnitForm";

const conditionMeta = {
  baik:         { label: "Baik",          color: "#10B981", bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.3)" },
  rusak_ringan: { label: "Rusak Ringan",  color: "#F59E0B", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.3)" },
  rusak_berat:  { label: "Rusak Berat",   color: "#EF4444", bg: "rgba(239,68,68,0.12)",   border: "rgba(239,68,68,0.3)" },
};

const statusMeta = {
  active:      { label: "Aktif",      color: "#3B82F6", bg: "rgba(59,130,246,0.12)" },
  rusak:       { label: "Rusak",      color: "#EF4444", bg: "rgba(239,68,68,0.12)" },
  hilang:      { label: "Hilang",     color: "#6B7280", bg: "rgba(107,114,128,0.12)" },
  dipinjam:    { label: "Dipinjam",   color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
  maintenance: { label: "Perbaikan",  color: "#EAB308", bg: "rgba(234,179,8,0.12)" },
};

export default function UnitTable({ units, onRefresh, canWrite }) {
  const [editingUnit, setEditingUnit] = useState(null);
  const [search, setSearch] = useState("");
  const [filterCond, setFilterCond] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const filtered = useMemo(() => {
    return units.filter((u) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        u.unit_code.toLowerCase().includes(q) ||
        String(u.unit_number).includes(q);
      const matchCond = filterCond === "all" || u.condition === filterCond;
      const matchStatus = filterStatus === "all" || u.status === filterStatus;
      return matchSearch && matchCond && matchStatus;
    });
  }, [units, search, filterCond, filterStatus]);

  const hasFilter = search || filterCond !== "all" || filterStatus !== "all";

  const resetFilters = () => {
    setSearch("");
    setFilterCond("all");
    setFilterStatus("all");
  };

  // ── Empty (belum ada unit sama sekali) ──
  if (units.length === 0) {
    return (
      <div className="mc-ut-empty">
        <UnitTableStyles />
        <div className="mc-ut-empty-icon">
          <Box size={36} />
        </div>
        <h3 className="mc-ut-empty-title">Belum ada unit</h3>
        <p className="mc-ut-empty-sub">
          Tambahkan unit baru terlebih dahulu untuk melihat daftar unit fisik.
        </p>
      </div>
    );
  }

  return (
    <div className="mc-ut">
      <UnitTableStyles />

      {/* ============ TOOLBAR ============ */}
      <div className="mc-ut-toolbar">
        {/* Search */}
        <div className="mc-ut-search">
          <Search size={15} className="mc-ut-search-icon" />
          <input
            type="text"
            placeholder="Cari kode / nomor unit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mc-ut-search-input"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="mc-ut-search-clear"
              aria-label="Clear"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="mc-ut-filters">
          <div className="mc-ut-filter-wrap">
            <ListFilter size={12} className="mc-ut-filter-icon" />
            <select
              value={filterCond}
              onChange={(e) => setFilterCond(e.target.value)}
              className="mc-ut-select"
            >
              <option value="all">Semua Kondisi</option>
              <option value="baik">Baik</option>
              <option value="rusak_ringan">Rusak Ringan</option>
              <option value="rusak_berat">Rusak Berat</option>
            </select>
          </div>

          <div className="mc-ut-filter-wrap">
            <Filter size={12} className="mc-ut-filter-icon" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="mc-ut-select"
            >
              <option value="all">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="rusak">Rusak</option>
              <option value="hilang">Hilang</option>
              <option value="dipinjam">Dipinjam</option>
              <option value="maintenance">Perbaikan</option>
            </select>
          </div>

          {hasFilter && (
            <button onClick={resetFilters} className="mc-ut-reset" title="Reset filter">
              <X size={12} /> Reset
            </button>
          )}
        </div>
      </div>

      {/* Info count */}
      <div className="mc-ut-count">
        <span className="mc-ut-count-val">{filtered.length}</span>
        <span className="mc-ut-count-lbl">dari {units.length} unit</span>
        {hasFilter && <span className="mc-ut-count-badge">terfilter</span>}
      </div>

      {/* ============ GRID UNIT ============ */}
      {filtered.length === 0 ? (
        <div className="mc-ut-empty" style={{ padding: "2.5rem 1rem" }}>
          <div className="mc-ut-empty-icon" style={{ width: 56, height: 56 }}>
            <Search size={26} />
          </div>
          <h3 className="mc-ut-empty-title" style={{ fontSize: "1rem" }}>
            Tidak ada unit cocok
          </h3>
          <p className="mc-ut-empty-sub">
            Coba ubah kata kunci atau filter.
          </p>
          <button onClick={resetFilters} className="mc-ut-reset-btn">
            <X size={13} /> Reset filter
          </button>
        </div>
      ) : (
        <div className="mc-ut-grid">
          {filtered.map((u, idx) => {
            const cond = conditionMeta[u.condition] || conditionMeta.baik;
            const stat = statusMeta[u.status] || statusMeta.active;

            return (
              <div
                key={u.id}
                className="mc-ut-card"
                style={{ animationDelay: `${Math.min(idx, 10) * 0.03}s` }}
              >
                {/* Badge nomor urut */}
                <div className="mc-ut-badge">
                  <Hash size={9} /> {u.unit_number}
                </div>

                {/* QR */}
                <div className="mc-ut-qr">
                  <QRCodeSVG value={u.unit_code} size={72} level="M" />
                </div>

                {/* Kode unit */}
                <p className="mc-ut-code" title={u.unit_code}>
                  {u.unit_code}
                </p>

                {/* Chips kondisi + status */}
                <div className="mc-ut-chips">
                  <span
                    className="mc-ut-chip"
                    style={{ color: cond.color, background: cond.bg, borderColor: cond.border }}
                  >
                    {cond.label}
                  </span>
                  <span
                    className="mc-ut-chip solid"
                    style={{ color: stat.color, background: stat.bg }}
                  >
                    {stat.label}
                  </span>
                </div>

                {/* Notes */}
                {u.notes && (
                  <p className="mc-ut-notes" title={u.notes}>
                    "{u.notes}"
                  </p>
                )}

                {/* Edit */}
                {canWrite && (
                  <button
                    onClick={() => setEditingUnit(u)}
                    className="mc-ut-edit"
                  >
                    <Edit size={12} /> Edit Unit
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Edit */}
      {editingUnit && (
        <UnitForm
          unit={editingUnit}
          onClose={() => setEditingUnit(null)}
          onSaved={() => { onRefresh?.(); setEditingUnit(null); }}
        />
      )}
    </div>
  );
}

/* ============================================================
   Styles
============================================================ */
function UnitTableStyles() {
  return (
    <style>{`
      .mc-ut { display: flex; flex-direction: column; gap: 0.85rem; }

      /* ── Toolbar ── */
      .mc-ut-toolbar {
        display: flex; flex-direction: column; gap: 0.6rem;
        padding: 0.7rem;
        background: var(--background);
        border: 1px solid var(--border);
        border-radius: 12px;
      }
      @media (min-width: 640px) {
        .mc-ut-toolbar { flex-direction: row; align-items: center; }
      }

      /* Search */
      .mc-ut-search {
        position: relative;
        flex: 1;
        min-width: 0;
      }
      .mc-ut-search-icon {
        position: absolute; left: 0.7rem; top: 50%;
        transform: translateY(-50%);
        color: var(--text-muted);
        pointer-events: none;
      }
      .mc-ut-search-input {
        width: 100%;
        padding: 0.5rem 2.2rem 0.5rem 2.1rem;
        border-radius: 8px;
        border: 1.5px solid var(--border);
        background: var(--surface);
        color: var(--text-main);
        font-size: 0.82rem;
        font-family: inherit;
        transition: all 0.2s;
      }
      .mc-ut-search-input:focus {
        outline: none;
        border-color: var(--accent);
        box-shadow: 0 0 0 3px var(--accent-soft);
      }
      .mc-ut-search-input::placeholder { color: var(--text-muted); opacity: 0.6; }
      .mc-ut-search-clear {
        position: absolute; right: 0.5rem; top: 50%;
        transform: translateY(-50%);
        width: 20px; height: 20px;
        border-radius: 50%;
        border: none;
        background: var(--border);
        color: var(--text-muted);
        display: flex; align-items: center; justify-content: center;
        cursor: pointer;
        transition: all 0.2s;
      }
      .mc-ut-search-clear:hover {
        background: var(--accent);
        color: white;
      }

      /* Filters */
      .mc-ut-filters {
        display: flex; flex-wrap: wrap; gap: 0.4rem;
        align-items: center;
      }
      .mc-ut-filter-wrap {
        position: relative;
        display: inline-flex;
        align-items: center;
      }
      .mc-ut-filter-icon {
        position: absolute; left: 0.55rem;
        color: var(--text-muted);
        pointer-events: none;
      }
      .mc-ut-select {
        appearance: none;
        padding: 0.5rem 1.8rem 0.5rem 1.9rem;
        border-radius: 8px;
        border: 1.5px solid var(--border);
        background: var(--surface);
        color: var(--text-main);
        font-size: 0.78rem;
        font-weight: 600;
        font-family: inherit;
        cursor: pointer;
        transition: all 0.2s;
        background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
        background-repeat: no-repeat;
        background-position: right 0.5rem center;
      }
      .mc-ut-select:focus {
        outline: none;
        border-color: var(--accent);
        box-shadow: 0 0 0 3px var(--accent-soft);
      }

      .mc-ut-reset {
        display: inline-flex; align-items: center; gap: 0.3rem;
        padding: 0.5rem 0.7rem;
        border-radius: 8px;
        border: 1.5px solid var(--danger-border);
        background: var(--danger-soft);
        color: var(--danger);
        font-size: 0.72rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
      }
      .mc-ut-reset:hover { transform: translateY(-1px); }
      .dark .mc-ut-reset {
        background: rgba(239,68,68,0.1);
        border-color: rgba(239,68,68,0.25);
      }

      /* Count info */
      .mc-ut-count {
        display: flex; align-items: baseline; gap: 0.4rem;
        font-size: 0.78rem;
        color: var(--text-muted);
        padding: 0 0.25rem;
      }
      .mc-ut-count-val {
        font-size: 1.05rem; font-weight: 800;
        color: var(--text-main);
        font-variant-numeric: tabular-nums;
      }
      .mc-ut-count-lbl { font-weight: 500; }
      .mc-ut-count-badge {
        font-size: 0.62rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--accent);
        background: var(--accent-soft);
        border: 1px solid var(--accent-border);
        padding: 0.1rem 0.4rem;
        border-radius: 4px;
        margin-left: 0.2rem;
      }

      /* ── Grid ── */
      .mc-ut-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.6rem;
      }
      @media (min-width: 640px) {
        .mc-ut-grid { grid-template-columns: repeat(3, 1fr); }
      }
      @media (min-width: 1024px) {
        .mc-ut-grid { grid-template-columns: repeat(4, 1fr); }
      }

      /* ── Card ── */
      .mc-ut-card {
        position: relative;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 0.85rem 0.65rem 0.65rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.4rem;
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        animation: mc-ut-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
        overflow: hidden;
      }
      @keyframes mc-ut-in {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .mc-ut-card:hover {
        border-color: var(--accent-border);
        box-shadow: 0 8px 24px -8px rgba(0, 0, 0, 0.15);
        transform: translateY(-2px);
      }

      /* Badge nomor */
      .mc-ut-badge {
        position: absolute; top: 0.45rem; left: 0.5rem;
        display: inline-flex; align-items: center; gap: 0.15rem;
        font-size: 0.6rem;
        font-weight: 800;
        font-family: 'JetBrains Mono', 'Courier New', monospace;
        color: var(--text-muted);
        background: var(--background);
        border: 1px solid var(--border);
        padding: 0.1rem 0.35rem;
        border-radius: 4px;
        font-variant-numeric: tabular-nums;
      }

      /* QR */
      .mc-ut-qr {
        margin-top: 0.5rem;
        background: white;
        padding: 5px;
        border-radius: 8px;
        border: 1px solid var(--border);
        transition: transform 0.25s;
        display: flex;
      }
      .mc-ut-card:hover .mc-ut-qr {
        transform: scale(1.05);
      }
      .mc-ut-qr svg {
        width: 72px !important;
        height: 72px !important;
        display: block;
      }

      /* Kode */
      .mc-ut-code {
        font-family: 'JetBrains Mono', 'Courier New', monospace;
        font-size: 0.72rem;
        font-weight: 800;
        color: var(--text-main);
        text-align: center;
        letter-spacing: 0.02em;
        width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-top: 0.15rem;
      }

      /* Chips */
      .mc-ut-chips {
        display: flex; flex-wrap: wrap;
        justify-content: center;
        gap: 0.25rem;
        margin-top: 0.15rem;
      }
      .mc-ut-chip {
        font-size: 0.6rem;
        font-weight: 700;
        padding: 0.1rem 0.4rem;
        border-radius: 4px;
        border: 1px solid transparent;
        white-space: nowrap;
        text-transform: uppercase;
        letter-spacing: 0.02em;
      }
      .mc-ut-chip.solid {
        border: none;
      }

      /* Notes */
      .mc-ut-notes {
        font-size: 0.62rem;
        color: var(--text-muted);
        font-style: italic;
        text-align: center;
        line-height: 1.3;
        width: 100%;
        display: -webkit-box;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
        overflow: hidden;
        opacity: 0.8;
      }

      /* Edit button */
      .mc-ut-edit {
        margin-top: 0.3rem;
        width: 100%;
        padding: 0.4rem;
        border-radius: 7px;
        border: 1.5px solid var(--border);
        background: var(--background);
        color: var(--text-main);
        font-size: 0.7rem;
        font-weight: 700;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.3rem;
        transition: all 0.2s;
        opacity: 0;
        font-family: inherit;
      }
      .mc-ut-card:hover .mc-ut-edit { opacity: 1; }
      .mc-ut-edit:hover {
        background: var(--accent);
        color: white;
        border-color: var(--accent);
      }

      /* ── Empty ── */
      .mc-ut-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 2rem 1rem;
        text-align: center;
        gap: 0.4rem;
        background: var(--surface);
        border: 1.5px dashed var(--border);
        border-radius: 12px;
      }
      .mc-ut-empty-icon {
        width: 68px; height: 68px;
        border-radius: 50%;
        background: var(--background);
        border: 1px solid var(--border);
        color: var(--text-muted);
        display: flex; align-items: center; justify-content: center;
        margin-bottom: 0.4rem;
      }
      .mc-ut-empty-title {
        font-size: 1.1rem; font-weight: 700;
        color: var(--text-main);
      }
      .mc-ut-empty-sub {
        font-size: 0.8rem;
        color: var(--text-muted);
        max-width: 320px;
        line-height: 1.5;
      }
      .mc-ut-reset-btn {
        display: inline-flex; align-items: center; gap: 0.35rem;
        margin-top: 0.75rem;
        padding: 0.5rem 1rem;
        border-radius: 8px;
        background: var(--accent-soft);
        color: var(--accent);
        border: 1px solid var(--accent-border);
        font-size: 0.78rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
      }
      .mc-ut-reset-btn:hover {
        background: var(--accent);
        color: white;
      }

      /* Mobile */
      @media (max-width: 640px) {
        .mc-ut-edit { opacity: 1; }
        .mc-ut-qr svg {
          width: 64px !important;
          height: 64px !important;
        }
      }
    `}</style>
  );
}