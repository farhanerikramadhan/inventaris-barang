import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { logActivity } from "../../utils/logActivity";
import { buildUnitCode, findEmptySlots } from "../../utils/unitCodeGenerator";
import {
  Plus, Boxes, X, Package, TrendingUp, Lightbulb,
  AlertCircle, CheckCircle2, Loader2, Hash, Layers,
  ListPlus, ArrowRight
} from "lucide-react";
import "../../styles/modal.css";

export default function StockInForm({ item, locationName, onClose, onSuccess }) {
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const [usedNumbers, setUsedNumbers] = useState([]);
  const [newNumbers, setNewNumbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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

  // Fetch nomor terpakai
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("item_units")
        .select("unit_number")
        .eq("item_id", item.id);

      if (cancelled) return;
      const numbers = (data || []).map(u => u.unit_number).sort((a, b) => a - b);
      setUsedNumbers(numbers);
      setNewNumbers(findEmptySlots(numbers, 1));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [item.id]);

  // Update preview saat qty berubah
  useEffect(() => {
    if (!loading) setNewNumbers(findEmptySlots(usedNumbers, qty));
  }, [qty, usedNumbers, loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving || loading || newNumbers.length === 0) return;

    setSaving(true);
    setError("");

    try {
      const unitsToInsert = newNumbers.map(num => ({
        item_id: item.id,
        unit_number: num,
        unit_code: buildUnitCode(item.name, locationName, num),
        condition: "baik",
        status: "active",
        notes: notes || null,
      }));

      const { error: insErr } = await supabase.from("item_units").insert(unitsToInsert);
      if (insErr) throw insErr;

      await logActivity({
        action: "stock_in",
        entity: "items",
        entityId: item.id,
        detail: { name: item.name, unit_numbers: newNumbers, notes },
      });

      onSuccess?.();
      onClose?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const previewCodes = newNumbers.map(num => buildUnitCode(item.name, locationName, num));
  const totalAfter = usedNumbers.length + newNumbers.length;
  const hasSlots = newNumbers.length > 0;

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
        <StockInStyles />

        {/* ============ HEADER ============ */}
        <div className="mc-modal-head">
          <div className="mc-modal-head-glow" />
          <div className="mc-modal-head-content">
            <div className="mc-modal-icon">
              <Boxes size={20} />
            </div>
            <div className="mc-modal-head-text">
              <h2 className="mc-modal-title">Tambah Stok</h2>
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

          {/* Error full-width */}
          {error && (
            <div className="mc-error mc-span-full">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="mc-skel mc-span-full" />
          ) : (
            <>
              {/* ══════════════════════════════════════ */}
              {/* KOLOM KIRI — Input & Statistik         */}
              {/* ══════════════════════════════════════ */}
              <div className="mc-col">
                {/* Stats */}
                <div className="mc-stats">
                  <div className="mc-stat">
                    <span className="mc-stat-icon blue"><Layers size={13} /></span>
                    <div>
                      <p className="mc-stat-val">{usedNumbers.length}</p>
                      <p className="mc-stat-lbl">Stok saat ini</p>
                    </div>
                  </div>
                  <ArrowRight size={14} className="mc-stats-arrow" />
                  <div className="mc-stat highlight">
                    <span className="mc-stat-icon green"><TrendingUp size={13} /></span>
                    <div>
                      <p className="mc-stat-val">{totalAfter}</p>
                      <p className="mc-stat-lbl">Setelah ditambah</p>
                    </div>
                  </div>
                </div>

                {/* Qty */}
                <div className="mc-field">
                  <label className="mc-label">
                    <ListPlus size={12} />
                    Jumlah unit baru
                  </label>
                  <div className="mc-stepper">
                    <button
                      type="button"
                      onClick={() => setQty(q => Math.max(1, q - 1))}
                      disabled={qty <= 1 || saving}
                      className="mc-stepper-btn"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={qty}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        setQty(Math.max(1, Math.min(100, val)));
                      }}
                      disabled={saving}
                      className="mc-stepper-input"
                    />
                    <button
                      type="button"
                      onClick={() => setQty(q => Math.min(100, q + 1))}
                      disabled={qty >= 100 || saving}
                      className="mc-stepper-btn"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Hint */}
                <div className="mc-hint">
                  <Lightbulb size={13} />
                  <span>
                    Unit baru mengisi slot nomor urut terkecil yang kosong.
                  </span>
                </div>

                {/* Notes */}
                <div className="mc-field">
                  <label className="mc-label">
                    Catatan <span className="mc-label-opt">(opsional)</span>
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Contoh: Pengadaan baru semester 2..."
                    rows={3}
                    maxLength={200}
                    disabled={saving}
                    className="mc-textarea"
                  />
                </div>
              </div>

              {/* ══════════════════════════════════════ */}
              {/* KOLOM KANAN — Preview Slot & Kode      */}
              {/* ══════════════════════════════════════ */}
              <div className="mc-col">
                <div className="mc-preview mc-preview-tall">
                  <div className="mc-preview-head">
                    <span className="mc-preview-label">
                      <Hash size={11} />
                      Slot yang akan diisi
                    </span>
                    <span className="mc-preview-badge">{newNumbers.length} slot</span>
                  </div>

                  {hasSlots ? (
                    <>
                      {/* Slot chips — scrollable */}
                      <div className="mc-slots mc-slots-scroll">
                        {newNumbers.map(num => (
                          <span key={num} className="mc-slot">#{num}</span>
                        ))}
                      </div>

                      {/* Kode preview */}
                      <div className="mc-code-block">
                        <p className="mc-code-label">Kode unit baru:</p>
                        <div className="mc-code-list">
                          {previewCodes.slice(0, 5).map((code, i) => (
                            <div key={i} className="mc-code-item">
                              <span className="mc-code-idx">#{newNumbers[i]}</span>
                              <span className="mc-code">{code}</span>
                            </div>
                          ))}
                          {previewCodes.length > 5 && (
                            <p className="mc-code-more">
                              +{previewCodes.length - 5} kode lainnya...
                            </p>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="mc-preview-empty-wrap">
                      <Package size={24} className="mc-preview-empty-icon" />
                      <p className="mc-preview-empty">
                        Tidak ada slot kosong tersedia.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ============ FOOTER ============ */}
        <div className="mc-modal-footer">
          <div className="mc-modal-summary">
            <CheckCircle2 size={13} />
            <span>
              {hasSlots ? (
                <>Menambah <strong>{newNumbers.length}</strong> unit</>
              ) : (
                <>Tidak ada slot kosong</>
              )}
            </span>
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
              disabled={saving || loading || !hasSlots}
              className="mc-btn-primary"
            >
              {saving ? (
                <><Loader2 size={14} className="mc-spin" /> Menyimpan...</>
              ) : (
                <><Plus size={14} /> Tambah Stok</>
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
function StockInStyles() {
  return (
    <style>{`
      /* ── Wide modal (2 kolom) ── */
      .mc-modal-wide {
        max-width: 780px;
      }
      @media (max-width: 720px) {
        .mc-modal-wide { max-width: 440px; }
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
      .mc-span-full {
        grid-column: 1 / -1;
      }

      /* Kolom */
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

      /* ── Stats ── */
      .mc-stats {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .mc-stat {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 0.55rem;
        background: var(--background);
        border: 1px solid var(--border);
        border-radius: 11px;
        padding: 0.6rem 0.75rem;
        min-width: 0;
      }
      .mc-stat.highlight {
        background: rgba(16, 185, 129, 0.06);
        border-color: rgba(16, 185, 129, 0.3);
      }
      .mc-stats-arrow {
        color: var(--text-muted);
        opacity: 0.5;
        flex-shrink: 0;
      }
      .mc-stat-icon {
        width: 26px;
        height: 26px;
        border-radius: 7px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .mc-stat-icon.blue {
        background: rgba(59, 130, 246, 0.12);
        color: #3B82F6;
      }
      .mc-stat-icon.green {
        background: rgba(16, 185, 129, 0.15);
        color: #10B981;
      }
      .mc-stat-val {
        font-size: 1.15rem;
        font-weight: 800;
        color: var(--text-main);
        line-height: 1;
        font-variant-numeric: tabular-nums;
      }
      .mc-stat-lbl {
        font-size: 0.62rem;
        font-weight: 600;
        color: var(--text-muted);
        margin-top: 2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      /* ── Field ── */
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

      /* ── Stepper ── */
      .mc-stepper {
        display: flex;
        border: 1.5px solid var(--border);
        border-radius: 11px;
        overflow: hidden;
        background: var(--background);
        transition: border-color 0.2s, box-shadow 0.2s;
      }
      .mc-stepper:focus-within {
        border-color: var(--accent);
        box-shadow: 0 0 0 3px var(--accent-soft);
      }
      .mc-stepper-btn {
        width: 44px;
        background: transparent;
        border: none;
        color: var(--text-main);
        font-size: 1.3rem;
        font-weight: 700;
        cursor: pointer;
        transition: background 0.2s, color 0.2s;
        flex-shrink: 0;
      }
      .mc-stepper-btn:hover:not(:disabled) {
        background: var(--accent-soft);
        color: var(--accent);
      }
      .mc-stepper-btn:disabled { opacity: 0.3; cursor: not-allowed; }
      .mc-stepper-input {
        flex: 1;
        border: none;
        background: transparent;
        text-align: center;
        font-size: 1.35rem;
        font-weight: 800;
        color: var(--text-main);
        font-variant-numeric: tabular-nums;
        padding: 0.55rem 0;
        outline: none;
        font-family: inherit;
      }
      .mc-stepper-input::-webkit-outer-spin-button,
      .mc-stepper-input::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
      .mc-stepper-input[type=number] { -moz-appearance: textfield; }

      /* ── Hint ── */
      .mc-hint {
        display: flex;
        align-items: flex-start;
        gap: 0.45rem;
        padding: 0.55rem 0.75rem;
        background: var(--info-soft, #EFF6FF);
        border: 1px solid var(--info-border, #BFDBFE);
        border-radius: 9px;
        font-size: 0.72rem;
        color: var(--text-muted);
        line-height: 1.4;
      }
      .mc-hint svg { color: #3B82F6; flex-shrink: 0; margin-top: 1px; }
      .dark .mc-hint {
        background: rgba(59, 130, 246, 0.08);
        border-color: rgba(59, 130, 246, 0.2);
      }

      /* ── Textarea ── */
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
        min-height: 64px;
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

      /* ── Preview (KOLOM KANAN) ── */
      .mc-preview {
        background: var(--accent-soft);
        border: 1px solid var(--accent-border);
        border-radius: 11px;
        padding: 0.85rem 0.9rem;
        display: flex;
        flex-direction: column;
      }
      .mc-preview-tall {
        flex: 1;
        min-height: 0;
      }
      .mc-preview-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 0.6rem;
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

      /* Slot chips — scrollable */
      .mc-slots {
        display: flex;
        flex-wrap: wrap;
        gap: 0.3rem;
        margin-bottom: 0.6rem;
        flex-shrink: 0;
      }
      .mc-slots-scroll {
        max-height: 80px;
        overflow-y: auto;
        padding-right: 2px;
      }
      .mc-slots-scroll::-webkit-scrollbar { width: 4px; }
      .mc-slots-scroll::-webkit-scrollbar-thumb {
        background: var(--accent-border);
        border-radius: 2px;
      }
      .mc-slot {
        font-family: 'JetBrains Mono', 'Courier New', monospace;
        font-size: 0.68rem;
        font-weight: 800;
        color: var(--accent);
        background: var(--surface);
        border: 1px solid var(--accent-border);
        padding: 0.1rem 0.4rem;
        border-radius: 4px;
        font-variant-numeric: tabular-nums;
      }

      /* Kode block */
      .mc-code-block {
        padding-top: 0.65rem;
        border-top: 1px dashed var(--accent-border);
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
      }
      .mc-code-label {
        font-size: 0.68rem;
        font-weight: 600;
        color: var(--text-muted);
        margin-bottom: 0.4rem;
      }
      .mc-code-list {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
      }
      .mc-code-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.72rem;
      }
      .mc-code-idx {
        font-size: 0.62rem;
        font-weight: 800;
        color: var(--accent);
        background: var(--surface);
        border: 1px solid var(--accent-border);
        padding: 0.05rem 0.35rem;
        border-radius: 3px;
        font-variant-numeric: tabular-nums;
        flex-shrink: 0;
        min-width: 32px;
        text-align: center;
      }
      .mc-code {
        font-family: 'JetBrains Mono', 'Courier New', monospace;
        font-size: 0.72rem;
        font-weight: 700;
        color: var(--text-main);
        word-break: break-all;
        min-width: 0;
      }
      .mc-code-more {
        font-size: 0.68rem;
        color: var(--text-muted);
        font-style: italic;
        margin-top: 0.25rem;
      }

      /* Preview empty */
      .mc-preview-empty-wrap {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 1rem;
      }
      .mc-preview-empty-icon {
        color: var(--text-muted);
        opacity: 0.4;
      }
      .mc-preview-empty {
        font-size: 0.75rem;
        color: var(--danger);
        font-style: italic;
        font-weight: 600;
        text-align: center;
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

      /* ── Mobile adjustments ── */
      @media (max-width: 720px) {
        .mc-preview-tall {
          min-height: 140px;
        }
        .mc-slots-scroll { max-height: 60px; }
      }
    `}</style>
  );
}