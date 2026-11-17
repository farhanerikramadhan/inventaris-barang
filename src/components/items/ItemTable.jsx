import { Link } from "react-router-dom";
import { 
  Eye, Trash2, Boxes, Package, Tag, MapPin, 
  CheckCircle2, AlertTriangle, Pencil 
} from "lucide-react";

export default function ItemTable({ items, loading, onDeleteClick, onEditClick, canWrite }) {
  // ── Skeleton ──
  if (loading) {
    return (
      <div className="mc-table-card">
        <div className="mc-skeleton">
          <div className="mc-skel-head" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="mc-skel-row" style={{ animationDelay: `${i * 0.08}s` }} />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="mc-table-card">
      <div className="mc-table-scroll">
        <table className="mc-table" style={{ tableLayout: "fixed", width: "100%" }}>
          <colgroup>
            <col style={{ width: "26%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "20%" }} />
          </colgroup>

          <thead>
            <tr>
              <th>Nama Barang</th>
              <th>Kategori</th>
              <th>Lokasi</th>
              <th className="text-center">Total Unit</th>
              <th>Kondisi</th>
              <th className="text-right">Aksi</th>
            </tr>
          </thead>

          <tbody>
            {items.map((item) => {
              const baik = item.condition_summary?.baik || 0;
              const rusak = item.condition_summary?.rusak || 0;
              const total = item.total_units || 0;
              const persenBaik = total > 0 ? Math.round((baik / total) * 100) : 0;

              return (
                <tr key={item.id}>
                  {/* Nama */}
                  <td>
                    <div className="mc-item-name-cell">
                      <div className="mc-item-icon">
                        <Package size={15} />
                      </div>
                      <div className="mc-item-info">
                        <p className="mc-item-name">{item.name}</p>
                        {item.notes && (
                          <p className="mc-item-notes" title={item.notes}>
                            {item.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Kategori */}
                  <td>
                    <span className="mc-chip">
                      <Tag size={11} />
                      {item.category?.name || "-"}
                    </span>
                  </td>

                  {/* Lokasi */}
                  <td>
                    <span className="mc-loc">
                      <MapPin size={12} />
                      {item.location?.name || "-"}
                    </span>
                  </td>

                  {/* Total Unit */}
                  <td className="text-center">
                    <span className="mc-unit-badge">
                      <Boxes size={12} />
                      {total}
                    </span>
                  </td>

                  {/* Kondisi */}
                  <td>
                    {total === 0 ? (
                      <span className="mc-cond-empty">Belum ada unit</span>
                    ) : (
                      <div className="mc-cond-wrap">
                        <div className="mc-cond-bar">
                          <div className="mc-cond-fill good" style={{ width: `${persenBaik}%` }} />
                          <div className="mc-cond-fill bad" style={{ width: `${100 - persenBaik}%` }} />
                        </div>
                        <div className="mc-cond-legend">
                          <span className="mc-cond-item good">
                            <CheckCircle2 size={10} /> {baik}
                          </span>
                          {rusak > 0 && (
                            <span className="mc-cond-item bad">
                              <AlertTriangle size={10} /> {rusak}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </td>

                  {/* Aksi */}
                  <td className="text-right">
                    <div className="mc-action-wrap">
                      <Link to={`/items/${item.id}`} className="mc-act-btn primary" title="Detail">
                        <Eye size={14} /> <span>Detail</span>
                      </Link>
                      
                      {canWrite && (
                        <>
                          <button
                            onClick={() => onEditClick?.(item)}
                            className="mc-act-btn edit"
                            title="Edit Barang"
                          >
                            <Pencil size={14} />
                          </button>
                          
                          <button
                            onClick={() => onDeleteClick?.(item)}
                            className="mc-act-btn danger"
                            title="Hapus Barang"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ItemTableStyles />
    </div>
  );
}

function ItemTableStyles() {
  return (
    <style>{`
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
      .mc-table th.text-center { text-align: center; }
      .mc-table th.text-right { text-align: right; }

      .mc-table tbody tr {
        border-bottom: 1px solid var(--border);
        transition: background 0.15s;
      }
      .mc-table tbody tr:last-child { border-bottom: none; }
      .mc-table tbody tr:hover { background: var(--gold-soft, var(--background)); }

      .mc-table td {
        padding: 0.85rem 1.25rem;
        vertical-align: middle;
        color: var(--text-main);
      }
      .mc-table td.text-center { text-align: center; }
      .mc-table td.text-right { text-align: right; }

      .mc-item-name-cell {
        display: flex; align-items: center; gap: 0.65rem;
        min-width: 0;
      }
      .mc-item-icon {
        width: 36px; height: 36px;
        border-radius: 10px;
        background: var(--gold-soft);
        border: 1px solid color-mix(in srgb, var(--gold) 40%, transparent);
        color: var(--gold);
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
        transition: transform 0.25s var(--ease-spring, cubic-bezier(0.34,1.56,0.64,1));
      }
      .mc-table tbody tr:hover .mc-item-icon {
        transform: scale(1.08) rotate(-6deg);
      }
      .mc-item-info { min-width: 0; }
      .mc-item-name {
        font-weight: 700;
        font-size: 0.88rem;
        color: var(--text-main);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
      }
      .mc-item-notes {
        font-size: 0.7rem;
        color: var(--text-muted);
        margin-top: 2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
      }

      .mc-chip {
        display: inline-flex; align-items: center; gap: 0.3rem;
        padding: 0.3rem 0.65rem;
        border-radius: 6px;
        background: var(--background);
        border: 1px solid var(--border);
        color: var(--text-main);
        font-size: 0.75rem;
        font-weight: 600;
        white-space: nowrap;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .mc-chip svg { color: var(--text-muted); opacity: 0.7; flex-shrink: 0; }

      .mc-loc {
        display: inline-flex; align-items: center; gap: 0.3rem;
        font-size: 0.78rem;
        color: var(--text-muted);
        white-space: nowrap;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .mc-loc svg { opacity: 0.6; flex-shrink: 0; }

      .mc-unit-badge {
        display: inline-flex; align-items: center; gap: 0.3rem;
        background: var(--gold-soft);
        color: var(--gold);
        border: 1px solid color-mix(in srgb, var(--gold) 40%, transparent);
        padding: 0.3rem 0.7rem;
        border-radius: 8px;
        font-size: 0.78rem;
        font-weight: 800;
        font-variant-numeric: tabular-nums;
      }

      .mc-cond-wrap {
        display: flex; flex-direction: column; gap: 0.35rem;
        min-width: 0;
      }
      .mc-cond-bar {
        display: flex;
        height: 5px;
        border-radius: 3px;
        overflow: hidden;
        background: var(--border);
      }
      .mc-cond-fill.good { background: #10B981; }
      .mc-cond-fill.bad { background: #EF4444; }
      .mc-cond-legend {
        display: flex; gap: 0.5rem;
        font-size: 0.68rem;
        font-weight: 700;
      }
      .mc-cond-item {
        display: inline-flex; align-items: center; gap: 0.2rem;
      }
      .mc-cond-item.good { color: #059669; }
      .mc-cond-item.bad { color: #DC2626; }
      .dark .mc-cond-item.good { color: #34D399; }
      .dark .mc-cond-item.bad { color: #F87171; }
      .mc-cond-empty {
        font-size: 0.72rem;
        color: var(--text-muted);
        font-style: italic;
      }

      .mc-action-wrap {
        display: inline-flex; align-items: center; gap: 0.4rem;
        justify-content: flex-end;
      }
      
      .mc-act-btn {
        display: inline-flex; align-items: center; justify-content: center;
        gap: 0.35rem;
        border-radius: 8px;
        font-size: 0.75rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.25s cubic-bezier(0.34,1.56,0.64,1);
        text-decoration: none;
        white-space: nowrap;
        font-family: inherit;
        position: relative;
        overflow: hidden;
      }

      .mc-act-btn.primary {
        padding: 0.45rem 0.85rem;
        background: var(--surface);
        color: var(--text-main);
        border: 1.5px solid var(--border);
      }
      .mc-act-btn.primary:hover {
        background: var(--gold);
        color: white;
        border-color: var(--gold);
        transform: translateY(-2px);
        box-shadow: 0 6px 16px -4px color-mix(in srgb, var(--gold) 50%, transparent);
      }
      .mc-act-btn.primary:hover svg { stroke: white; }
      .mc-act-btn.primary:active { transform: translateY(0); }

      .mc-act-btn.edit {
        width: 34px;
        height: 34px;
        padding: 0;
        background: transparent;
        color: var(--text-muted);
        border: 1.5px solid transparent;
      }
      .mc-act-btn.edit:hover {
        background: rgba(212,175,55,0.1);
        color: var(--gold);
        border-color: rgba(212,175,55,0.3);
        transform: scale(1.1) rotate(5deg);
      }

      .mc-act-btn.danger {
        width: 34px;
        height: 34px;
        padding: 0;
        background: transparent;
        color: var(--text-muted);
        border: 1.5px solid transparent;
      }
      .mc-act-btn.danger:hover {
        background: rgba(239,68,68,0.08);
        color: #EF4444;
        border-color: rgba(239,68,68,0.25);
        transform: scale(1.1) rotate(5deg);
        box-shadow: 0 4px 12px -2px rgba(239,68,68,0.2);
      }
      .mc-act-btn.danger:active { transform: scale(0.95); }

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

      @media (max-width: 640px) {
        .mc-table th, .mc-table td { padding: 0.7rem 0.85rem; }
        .mc-act-btn.primary span { display: none; }
        .mc-act-btn.primary { padding: 0.45rem; width: 34px; height: 34px; }
      }
    `}</style>
  );
}