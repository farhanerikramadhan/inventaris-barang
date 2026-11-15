import { useState, useEffect, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import { logActivity } from "../../utils/logActivity";
import {
  AlertTriangle, Trash2, X, CheckSquare, Square,
  Package, ListChecks, AlertCircle, CheckCircle2,
  Loader2, Hash, ArrowRight, Info
} from "lucide-react";
import "../../styles/modal.css";

export default function StockOutForm({ item, onClose, onSuccess }) {
  const [units, setUnits] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [reason, setReason] = useState("hilang");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const reasons = [
    { value: "hilang", label: "Hilang (tidak ditemukan)" },
    { value: "rusak_total", label: "Rusak total (tidak bisa dipakai)" },
    { value: "dipindahkan", label: "Dipindahkan ke sekolah lain" },
    { value: "dihibahkan", label: "Dihibahkan / disumbangkan" },
    { value: "lainnya", label: "Lainnya..." },
  ];

  // ESC + lock scroll
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape" && !saving) onClose?.();
    };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [saving, onClose]);

  // Fetch units
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("item_units")
        .select("*")
        .eq("item_id", item.id)
        .order("unit_number", { ascending: true });
      if (cancelled) return;
      setUnits(data || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [item.id]);

  // ── Derived ──
  const selectedUnits = useMemo(
    () => units.filter(u => selectedIds.includes(u.id)),
    [units, selectedIds]
  );
  const allSelected = units.length > 0 && selectedIds.length === units.length;
  const hasSelection = selectedIds.length > 0;

  const toggleUnit = (unitId) => {
    setSelectedIds(prev =>
      prev.includes(unitId)
        ? prev.filter(id => id !== unitId)
        : [...prev, unitId]
    );
  };

  const toggleAll = () => {
    setSelectedIds(allSelected ? [] : units.map(u => u.id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedIds.length === 0) {
      setError("Pilih minimal 1 unit yang ingin dihapus.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      // 1. Catat riwayat
      const movements = selectedUnits.map(u => ({
        item_id: item.id,
        unit_id: u.id,
        movement_type: "qty_out",
        reason: reason,
        from_condition: u.condition,
        from_status: u.status,
        notes: notes || `Unit #${u.unit_number} dihapus. Alasan: ${reason}`,
      }));
      const { error: movErr } = await supabase.from("item_movements").insert(movements);
      if (movErr) throw movErr;

      // 2. Hapus unit
      const { error: delErr } = await supabase
        .from("item_units")
        .delete()
        .in("id", selectedIds);
      if (delErr) throw delErr;

      // 3. Log
      await logActivity({
        action: "stock_out",
        entity: "items",
        entityId: item.id,
        detail: {
          name: item.name,
          unit_numbers: selectedUnits.map(u => u.unit_number),
          reason,
          notes,
        },
      });

      onSuccess?.();
      onClose?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="mc-modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && !saving && onClose?.()}
    >
      <form
        onSubmit={handleSubmit}
        className="mc-modal mc-modal-wide"
        onClick={(e) => e.stopPropagation()}
      >
        <StockOutStyles />

        {/* ============ HEADER ============ */}
        <div className="mc-modal-head mc-head-danger">
          <div className="mc-modal-head-glow" />
          <div className="mc-modal-head-content">
            <div className="mc-modal-icon">
              <AlertTriangle size={20} />
            </div>
            <div className="mc-modal-head-text">
              <h2 className="mc-modal-title">Kurangi Stok</h2>
              <p className="mc-modal-sub">
                <Package size={10} /> {item.name}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="mc-modal-close"
              aria-label="Tutup"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ============ BODY — 2 KOLOM ============ */}
        <div className="mc-modal-body mc-body-grid">
          {error && (
            <div className="mc-error mc-span-full">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="mc-skel mc-span-full" />
          ) : units.length === 0 ? (
            <div className="mc-empty mc-span-full">
              <Package size={28} className="mc-empty-icon" />
              <p className="mc-empty-title">Tidak ada unit</p>
              <p className="mc-empty-sub">
                Barang ini belum memiliki unit fisik yang bisa dikurangi.
              </p>
            </div>
          ) : (
            <>
              {/* ══════════════════════════════════════ */}
              {/* KOLOM KIRI — Pilih Unit                */}
              {/* ══════════════════════════════════════ */}
              <div className="mc-col">
                {/* Info + toggle all */}
                <div className="mc-sel-header">
                  <div className="mc-sel-info">
                    <span className="mc-sel-count">
                      <strong>{selectedIds.length}</strong>
                      <span>/ {units.length}</span>
                    </span>
                    <span className="mc-sel-lbl">unit dipilih</span>
                  </div>
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="mc-sel-all"
                  >
                    {allSelected ? (
                      <><Square size={12} /> Batal pilih</>
                    ) : (
                      <><CheckSquare size={12} /> Pilih semua</>
                    )}
                  </button>
                </div>

                {/* Grid unit */}
                <div className="mc-units-grid">
                  {units.map(u => {
                    const isSelected = selectedIds.includes(u.id);
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => toggleUnit(u.id)}
                        disabled={saving}
                        className={`mc-unit-btn ${isSelected ? "is-selected" : ""}`}
                      >
                        <span className="mc-unit-num">#{u.unit_number}</span>
                        {isSelected && (
                          <span className="mc-unit-check">
                            <CheckSquare size={9} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Warning */}
                <div className="mc-hint mc-hint-danger">
                  <AlertTriangle size={13} />
                  <span>
                    Unit yang dipilih akan <strong>dihapus permanen</strong> dari sistem.
                    Tindakan ini tidak dapat dibatalkan.
                  </span>
                </div>
              </div>

              {/* ══════════════════════════════════════ */}
              {/* KOLOM KANAN — Detail & Alasan          */}
              {/* ══════════════════════════════════════ */}
              <div className="mc-col">
                {/* Preview unit terpilih */}
                <div className="mc-preview mc-preview-tall">
                  <div className="mc-preview-head">
                    <span className="mc-preview-label">
                      <Hash size={11} /> Unit terpilih
                    </span>
                    <span className="mc-preview-badge">{selectedIds.length} unit</span>
                  </div>

                  {hasSelection ? (
                    <div className="mc-selected-list">
                      {selectedUnits.map(u => (
                        <div key={u.id} className="mc-selected-item">
                          <span className="mc-selected-num">#{u.unit_number}</span>
                          <span className="mc-selected-code">{u.unit_code}</span>
                          <button
                            type="button"
                            onClick={() => toggleUnit(u.id)}
                            disabled={saving}
                            className="mc-selected-remove"
                            title="Hapus dari pilihan"
                          >
                            <X size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mc-preview-empty-wrap">
                      <ListChecks size={28} className="mc-preview-empty-icon" />
                      <p className="mc-preview-empty">
                        Belum ada unit dipilih.
                      </p>
                      <p className="mc-preview-empty-hint">
                        Klik unit di sebelah kiri untuk memilih.
                      </p>
                    </div>
                  )}
                </div>

                {/* Alasan */}
                <div className="mc-field">
                  <label className="mc-label">
                    <Info size={12} />
                    Alasan penghapusan
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    disabled={saving}
                    className="mc-select"
                  >
                    {reasons.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>

                {/* Notes */}
                <div className="mc-field">
                  <label className="mc-label">
                    Catatan <span className="mc-label-opt">(opsional)</span>
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Contoh: Hilang saat kegiatan outbound..."
                    rows={2}
                    maxLength={200}
                    disabled={saving}
                    className="mc-textarea"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* ============ FOOTER ============ */}
        <div className="mc-modal-footer">
          <div className={`mc-modal-summary ${hasSelection ? "danger" : ""}`}>
            {hasSelection ? (
              <><AlertTriangle size={13} /> {selectedIds.length} unit akan dihapus</>
            ) : (
              <><Info size={13} /> Belum ada unit dipilih</>
            )}
          </div>
          <div className="mc-modal-actions">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="mc-btn-ghost"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving || loading || !hasSelection}
              className="mc-btn-danger"
            >
              {saving ? (
                <><Loader2 size={14} className="mc-spin" /> Memproses...</>
              ) : (
                <><Trash2 size={14} /> Hapus {selectedIds.length || ""} Unit</>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

/* ============================================================
   Component-specific styles
============================================================ */
function StockOutStyles() {
  return (
    <style>{`
      /* ── Wide modal ── */
      .mc-modal-wide { max-width: 780px; }
      @media (max-width: 720px) {
        .mc-modal-wide { max-width: 440px; }
      }

      /* ── Header danger variant ── */
      .mc-head-danger {
        background: linear-gradient(135deg, #B91C1C 0%, #7F1D1D 100%) !important;
      }

      /* ── Body grid 2 kolom ── */
      .mc-body-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.1rem;
        align-items: stretch;
      }
      @media (max-width: 720px) {
        .mc-body-grid {
          grid-template-columns: 1fr;
          gap: 0.9rem;
        }
      }
      .mc-span-full { grid-column: 1 / -1; }

      .mc-col {
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
        min-width: 0;
      }

      /* ── Error ── */
      .mc-error {
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;
        background: var(--danger-soft, #FEF2F2);
        border: 1px solid var(--danger-border, #FECACA);
        color: var(--danger, #DC2626);
        padding: 0.65rem 0.85rem;
        border-radius: 10px;
        font-size: 0.8rem;
        font-weight: 500;
      }
      .mc-error svg { flex-shrink: 0; margin-top: 1px; }
      .dark .mc-error {
        background: rgba(239, 68, 68, 0.1);
        border-color: rgba(239, 68, 68, 0.25);
        color: #F87171;
      }

      /* ── Selection header ── */
      .mc-sel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        padding: 0.6rem 0.8rem;
        background: var(--background);
        border: 1px solid var(--border);
        border-radius: 11px;
      }
      .mc-sel-info {
        display: flex;
        align-items: baseline;
        gap: 0.35rem;
      }
      .mc-sel-count {
        font-size: 1.15rem;
        font-weight: 800;
        color: var(--text-main);
        font-variant-numeric: tabular-nums;
        line-height: 1;
      }
      .mc-sel-count span {
        font-size: 0.75rem;
        color: var(--text-muted);
        font-weight: 600;
      }
      .mc-sel-lbl {
        font-size: 0.72rem;
        color: var(--text-muted);
        font-weight: 500;
      }
      .mc-sel-all {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        font-size: 0.7rem;
        font-weight: 700;
        color: var(--accent);
        background: var(--accent-soft);
        border: 1px solid var(--accent-border);
        padding: 0.3rem 0.6rem;
        border-radius: 7px;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
      }
      .mc-sel-all:hover {
        background: var(--accent);
        color: white;
        border-color: var(--accent);
      }

      /* ── Units grid ── */
      .mc-units-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
        gap: 0.4rem;
        max-height: 280px;
        overflow-y: auto;
        padding: 2px;
      }
      .mc-units-grid::-webkit-scrollbar { width: 4px; }
      .mc-units-grid::-webkit-scrollbar-thumb {
        background: var(--border);
        border-radius: 2px;
      }
      .mc-unit-btn {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0.55rem 0.4rem;
        border-radius: 8px;
        border: 1.5px solid var(--border);
        background: var(--background);
        color: var(--text-main);
        font-family: 'JetBrains Mono', 'Courier New', monospace;
        font-size: 0.72rem;
        font-weight: 800;
        cursor: pointer;
        transition: all 0.15s;
        font-variant-numeric: tabular-nums;
      }
      .mc-unit-btn:hover:not(:disabled) {
        border-color: var(--accent-border);
        background: var(--accent-soft);
        color: var(--accent);
      }
      .mc-unit-btn.is-selected {
        background: var(--accent);
        border-color: var(--accent);
        color: white;
        box-shadow: 0 4px 10px -2px rgba(185, 28, 28, 0.4);
      }
      .mc-unit-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .mc-unit-check {
        position: absolute;
        top: -5px;
        right: -5px;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: white;
        color: var(--accent);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
        animation: mc-pop 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      @keyframes mc-pop {
        from { transform: scale(0); }
        to { transform: scale(1); }
      }

      /* ── Hint danger ── */
      .mc-hint {
        display: flex;
        align-items: flex-start;
        gap: 0.45rem;
        padding: 0.55rem 0.75rem;
        border-radius: 9px;
        font-size: 0.72rem;
        line-height: 1.4;
        color: var(--text-muted);
      }
      .mc-hint-danger {
        background: rgba(239, 68, 68, 0.06);
        border: 1px solid rgba(239, 68, 68, 0.2);
      }
      .mc-hint-danger svg {
        color: #EF4444;
        flex-shrink: 0;
        margin-top: 1px;
      }
      .mc-hint-danger strong {
        color: #EF4444;
        font-weight: 700;
      }

      /* ── Preview (kolom kanan) ── */
      .mc-preview {
        background: var(--accent-soft);
        border: 1px solid var(--accent-border);
        border-radius: 11px;
        padding: 0.75rem 0.9rem;
        display: flex;
        flex-direction: column;
      }
      .mc-preview-tall {
        flex: 1;
        min-height: 140px;
      }
      .mc-preview-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 0.5rem;
        flex-shrink: 0;
      }
      .mc-preview-label {
        display: flex;
        align-items: center;
        gap: 0.3rem;
        font-size: 0.68rem;
        font-weight: 700;
        color: var(--accent);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .mc-preview-badge {
        font-size: 0.65rem;
        font-weight: 800;
        color: var(--accent);
        background: var(--surface);
        border: 1px solid var(--accent-border);
        padding: 0.1rem 0.45rem;
        border-radius: 999px;
      }

      /* Selected list */
      .mc-selected-list {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
        max-height: 180px;
        overflow-y: auto;
        padding-right: 2px;
      }
      .mc-selected-list::-webkit-scrollbar { width: 4px; }
      .mc-selected-list::-webkit-scrollbar-thumb {
        background: var(--accent-border);
        border-radius: 2px;
      }
      .mc-selected-item {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.35rem 0.5rem;
        background: var(--surface);
        border: 1px solid var(--accent-border);
        border-radius: 7px;
        font-size: 0.72rem;
      }
      .mc-selected-num {
        font-size: 0.62rem;
        font-weight: 800;
        color: var(--accent);
        background: var(--accent-soft);
        padding: 0.05rem 0.3rem;
        border-radius: 3px;
        font-variant-numeric: tabular-nums;
        flex-shrink: 0;
        min-width: 28px;
        text-align: center;
      }
      .mc-selected-code {
        font-family: 'JetBrains Mono', 'Courier New', monospace;
        font-size: 0.7rem;
        font-weight: 700;
        color: var(--text-main);
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .mc-selected-remove {
        width: 20px;
        height: 20px;
        border-radius: 5px;
        border: none;
        background: transparent;
        color: var(--text-muted);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.15s;
        flex-shrink: 0;
      }
      .mc-selected-remove:hover {
        background: rgba(239, 68, 68, 0.15);
        color: #EF4444;
      }

      /* Preview empty */
      .mc-preview-empty-wrap {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.35rem;
        padding: 1rem;
        text-align: center;
      }
      .mc-preview-empty-icon {
        color: var(--text-muted);
        opacity: 0.4;
        margin-bottom: 0.25rem;
      }
      .mc-preview-empty {
        font-size: 0.78rem;
        font-weight: 600;
        color: var(--text-muted);
      }
      .mc-preview-empty-hint {
        font-size: 0.68rem;
        color: var(--text-muted);
        opacity: 0.7;
      }

      /* ── Fields ── */
      .mc-field { display: flex; flex-direction: column; }
      .mc-label {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        font-size: 0.75rem;
        font-weight: 700;
        color: var(--text-main);
        margin-bottom: 0.45rem;
      }
      .mc-label-opt {
        font-weight: 500;
        color: var(--text-muted);
        font-size: 0.7rem;
      }

      .mc-select {
        width: 100%;
        background: var(--background);
        border: 1.5px solid var(--border);
        border-radius: 10px;
        color: var(--text-main);
        padding: 0.55rem 0.8rem;
        font-size: 0.82rem;
        font-family: inherit;
        cursor: pointer;
        transition: all 0.2s;
      }
      .mc-select:focus {
        outline: none;
        border-color: var(--accent);
        box-shadow: 0 0 0 3px var(--accent-soft);
      }
      .mc-select:disabled { opacity: 0.6; cursor: not-allowed; }

      .mc-textarea {
        width: 100%;
        background: var(--background);
        border: 1.5px solid var(--border);
        border-radius: 10px;
        color: var(--text-main);
        padding: 0.6rem 0.8rem;
        font-size: 0.82rem;
        font-family: inherit;
        resize: vertical;
        min-height: 56px;
        transition: all 0.2s;
      }
      .mc-textarea:focus {
        outline: none;
        border-color: var(--accent);
        background: var(--surface);
        box-shadow: 0 0 0 3px var(--accent-soft);
      }
      .mc-textarea::placeholder { color: var(--text-muted); opacity: 0.6; }
      .mc-textarea:disabled { opacity: 0.6; cursor: not-allowed; }

      /* ── Empty state ── */
      .mc-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 2.5rem 1rem;
        text-align: center;
        gap: 0.4rem;
      }
      .mc-empty-icon {
        color: var(--text-muted);
        opacity: 0.4;
        margin-bottom: 0.25rem;
      }
      .mc-empty-title {
        font-size: 0.95rem;
        font-weight: 700;
        color: var(--text-main);
      }
      .mc-empty-sub {
        font-size: 0.8rem;
        color: var(--text-muted);
        max-width: 280px;
      }

      /* ── Skeleton ── */
      .mc-skel {
        height: 240px;
        border-radius: 11px;
        background: var(--background);
        animation: mc-pulse 1.5s ease-in-out infinite;
      }
      @keyframes mc-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      /* ── Footer danger variant ── */
      .mc-modal-summary.danger { color: #EF4444; }
      .mc-modal-summary.danger svg { color: #EF4444; }

      /* ── Mobile ── */
      @media (max-width: 720px) {
        .mc-preview-tall { min-height: 120px; }
        .mc-units-grid { max-height: 200px; }
        .mc-selected-list { max-height: 140px; }
      }
    `}</style>
  );
}