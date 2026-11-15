import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { logActivity } from "../../utils/logActivity";
import { buildUnitCode } from "../../utils/unitCodeGenerator";
import { 
  Plus, Boxes, X, Hash, AlertCircle, Lightbulb, 
  CheckCircle2, Loader2, Package, ListChecks
} from "lucide-react";

export default function AddUnitModal({ 
  item, lastUnitNumber, itemName, locationName, onClose, onSuccess 
}) {
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ── ESC untuk tutup ──
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (qty < 1 || saving) return;

    setSaving(true);
    setError("");

    try {
      const unitsToInsert = [];
      for (let i = 0; i < qty; i++) {
        const num = lastUnitNumber + 1 + i;
        const code = buildUnitCode(itemName, locationName, num);
        unitsToInsert.push({
          item_id: item.id,
          unit_number: num,
          unit_code: code,
          condition: "baik",
          status: "active",
          notes: notes || null,
        });
      }

      const { error: insErr } = await supabase.from("item_units").insert(unitsToInsert);
      if (insErr) throw insErr;

      await logActivity({
        action: "add_unit",
        entity: "items",
        entityId: item.id,
        detail: { name: itemName, qty, notes },
      });

      onSuccess?.();
      onClose?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Preview kode ──
  const previewFirst = buildUnitCode(itemName, locationName, lastUnitNumber + 1);
  const previewLast = buildUnitCode(itemName, locationName, lastUnitNumber + Math.max(qty, 1));
  const unitNumbers = Array.from({ length: Math.min(qty, 10) }, (_, i) => lastUnitNumber + 1 + i);

  return (
    <div className="mc-modal-backdrop" onClick={(e) => e.target === e.currentTarget && !saving && onClose?.()}>
      <form onSubmit={handleSubmit} className="mc-modal" onClick={(e) => e.stopPropagation()}>
        <AddUnitStyles />

        {/* ============ HEADER ============ */}
        <div className="mc-modal-head">
          <div className="mc-modal-head-glow" />
          <div className="mc-modal-head-content">
            <div className="mc-modal-icon">
              <Boxes size={22} />
            </div>
            <div className="mc-modal-head-text">
              <h2 className="mc-modal-title">Tambah Unit Baru</h2>
              <p className="mc-modal-sub">
                <Package size={11} /> {itemName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="mc-modal-close"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {/* ============ BODY ============ */}
        <div className="mc-modal-body">
          {error && (
            <div className="mc-modal-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Info hint */}
          <div className="mc-modal-hint">
            <div className="mc-modal-hint-icon">
              <Lightbulb size={14} />
            </div>
            <p>
              Unit baru akan dibuat dengan kode berurutan setelah unit terakhir{" "}
              <strong>#{lastUnitNumber}</strong>.
            </p>
          </div>

          {/* Jumlah */}
          <div className="mc-field">
            <label className="mc-label">
              <ListChecks size={13} />
              Berapa unit yang ditambahkan?
            </label>
            <div className="mc-qty-wrap">
              <button
                type="button"
                onClick={() => setQty(q => Math.max(1, q - 1))}
                disabled={qty <= 1 || saving}
                className="mc-qty-btn"
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
                className="mc-qty-input"
              />
              <button
                type="button"
                onClick={() => setQty(q => Math.min(100, q + 1))}
                disabled={qty >= 100 || saving}
                className="mc-qty-btn"
              >
                +
              </button>
            </div>
            <p className="mc-field-hint">Maksimal 100 unit per penambahan</p>
          </div>

          {/* Preview kode */}
          <div className="mc-preview">
            <p className="mc-preview-label">
              <Hash size={11} /> Preview Kode Unit
            </p>

            {qty === 1 ? (
              <p className="mc-preview-code">{previewFirst}</p>
            ) : (
              <div className="mc-preview-list">
                {unitNumbers.map((num, i) => (
                  <div key={num} className="mc-preview-item">
                    <span className="mc-preview-num">#{num}</span>
                    <span className="mc-preview-code-sm">
                      {buildUnitCode(itemName, locationName, num)}
                    </span>
                    {i === unitNumbers.length - 1 && qty > 10 && (
                      <span className="mc-preview-more">+{qty - 10} lagi</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="mc-field">
            <label className="mc-label">
              Catatan <span className="mc-label-optional">(Opsional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Pengadaan baru tahun 2026..."
              rows={2}
              maxLength={200}
              disabled={saving}
              className="mc-textarea"
            />
            <p className="mc-field-hint" style={{ textAlign: "right" }}>
              {notes.length}/200
            </p>
          </div>
        </div>

        {/* ============ FOOTER ============ */}
        <div className="mc-modal-footer">
          <div className="mc-modal-summary">
            <CheckCircle2 size={13} />
            <span>
              Akan menambahkan <strong>{qty}</strong> unit baru
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
              disabled={saving || qty < 1}
              className="mc-btn-primary"
            >
              {saving ? (
                <>
                  <Loader2 size={15} className="mc-spin" /> Menambahkan...
                </>
              ) : (
                <>
                  <Plus size={15} /> Tambah {qty} Unit
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

/* ============================================================
   Styles
============================================================ */
function AddUnitStyles() {
  return (
    <style>{`
      /* ============ BACKDROP ============ */
      .mc-modal-backdrop {
        position: fixed; inset: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center;
        z-index: 50;
        padding: 1rem;
        animation: backdrop-in 0.2s ease;
      }
      @keyframes backdrop-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      /* ============ MODAL ============ */
      .mc-modal {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 20px;
        box-shadow: 0 24px 48px -12px rgba(0,0,0,0.4);
        width: 100%;
        max-width: 480px;
        max-height: calc(100vh - 2rem);
        display: flex; flex-direction: column;
        overflow: hidden;
        animation: modal-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes modal-in {
        from { opacity: 0; transform: scale(0.96) translateY(8px); }
        to { opacity: 1; transform: scale(1) translateY(0); }
      }

      /* ============ HEADER ============ */
      .mc-modal-head {
        position: relative;
        background: linear-gradient(135deg, var(--accent) 0%, #7F1D1D 100%);
        padding: 1.1rem 1.25rem;
        color: white;
        overflow: hidden;
      }
      .mc-modal-head-glow {
        position: absolute;
        top: -50%; right: -20%;
        width: 200px; height: 200px;
        background: radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%);
        filter: blur(30px);
        pointer-events: none;
      }
      .mc-modal-head-content {
        display: flex; align-items: center; gap: 0.75rem;
        position: relative; z-index: 1;
      }
      .mc-modal-icon {
        width: 42px; height: 42px;
        border-radius: 12px;
        background: rgba(255,255,255,0.2);
        border: 1px solid rgba(255,255,255,0.3);
        backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
      }
      .mc-modal-head-text { flex: 1; min-width: 0; }
      .mc-modal-title {
        font-size: 1.1rem; font-weight: 800;
        letter-spacing: -0.01em;
        margin-bottom: 0.2rem;
      }
      .mc-modal-sub {
        display: flex; align-items: center; gap: 0.3rem;
        font-size: 0.78rem;
        color: rgba(255,255,255,0.85);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .mc-modal-close {
        width: 32px; height: 32px;
        border-radius: 8px;
        background: rgba(255,255,255,0.15);
        border: 1px solid rgba(255,255,255,0.2);
        color: white;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer;
        transition: all 0.2s;
        position: relative; z-index: 1;
        flex-shrink: 0;
      }
      .mc-modal-close:hover:not(:disabled) {
        background: rgba(255,255,255,0.25);
        transform: rotate(90deg);
      }
      .mc-modal-close:disabled { opacity: 0.5; cursor: not-allowed; }

      /* ============ BODY ============ */
      .mc-modal-body {
        padding: 1.25rem;
        overflow-y: auto;
        display: flex; flex-direction: column; gap: 1rem;
      }

      .mc-modal-error {
        display: flex; align-items: flex-start; gap: 0.5rem;
        background: var(--danger-soft, #FEF2F2);
        border: 1px solid var(--danger-border, #FECACA);
        color: var(--danger, #DC2626);
        padding: 0.7rem 0.85rem;
        border-radius: 10px;
        font-size: 0.82rem;
        font-weight: 500;
        animation: shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97);
      }
      .mc-modal-error svg { flex-shrink: 0; margin-top: 1px; }
      @keyframes shake {
        10%, 90% { transform: translateX(-1px); }
        20%, 80% { transform: translateX(2px); }
        30%, 50%, 70% { transform: translateX(-4px); }
        40%, 60% { transform: translateX(4px); }
      }

      .mc-modal-hint {
        display: flex; align-items: flex-start; gap: 0.6rem;
        background: var(--info-soft, #EFF6FF);
        border: 1px solid var(--info-border, #BFDBFE);
        border-radius: 10px;
        padding: 0.7rem 0.85rem;
        font-size: 0.8rem;
        color: var(--text-main);
        line-height: 1.45;
      }
      .mc-modal-hint-icon {
        width: 26px; height: 26px;
        border-radius: 7px;
        background: rgba(59,130,246,0.15);
        color: #2563EB;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
      }
      .dark .mc-modal-hint {
        background: rgba(59,130,246,0.1);
        border-color: rgba(59,130,246,0.25);
      }
      .dark .mc-modal-hint-icon {
        background: rgba(59,130,246,0.2);
        color: #60A5FA;
      }
      .mc-modal-hint strong {
        color: var(--accent);
        font-weight: 800;
      }

      /* Fields */
      .mc-field { display: flex; flex-direction: column; }
      .mc-label {
        display: flex; align-items: center; gap: 0.35rem;
        font-size: 0.78rem; font-weight: 700;
        color: var(--text-main);
        margin-bottom: 0.5rem;
      }
      .mc-label-optional {
        font-weight: 500;
        color: var(--text-muted);
        font-size: 0.72rem;
      }
      .mc-field-hint {
        font-size: 0.7rem;
        color: var(--text-muted);
        margin-top: 0.35rem;
      }

      /* Qty input */
      .mc-qty-wrap {
        display: flex;
        border: 1.5px solid var(--border);
        border-radius: 12px;
        overflow: hidden;
        background: var(--background);
        transition: border-color 0.2s, box-shadow 0.2s;
      }
      .mc-qty-wrap:focus-within {
        border-color: var(--accent);
        box-shadow: 0 0 0 3px var(--accent-soft);
      }
      .mc-qty-btn {
        width: 48px;
        background: transparent;
        border: none;
        color: var(--text-main);
        font-size: 1.35rem;
        font-weight: 700;
        cursor: pointer;
        transition: background 0.2s;
        flex-shrink: 0;
      }
      .mc-qty-btn:hover:not(:disabled) {
        background: var(--accent-soft);
        color: var(--accent);
      }
      .mc-qty-btn:disabled { opacity: 0.3; cursor: not-allowed; }
      .mc-qty-input {
        flex: 1;
        border: none;
        background: transparent;
        text-align: center;
        font-size: 1.5rem;
        font-weight: 800;
        color: var(--text-main);
        font-variant-numeric: tabular-nums;
        padding: 0.6rem 0;
        outline: none;
      }
      .mc-qty-input::-webkit-outer-spin-button,
      .mc-qty-input::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
      .mc-qty-input[type=number] { -moz-appearance: textfield; }

      /* Preview */
      .mc-preview {
        background: var(--accent-soft);
        border: 1px solid var(--accent-border);
        border-radius: 12px;
        padding: 0.85rem 1rem;
      }
      .mc-preview-label {
        display: flex; align-items: center; gap: 0.3rem;
        font-size: 0.7rem; font-weight: 700;
        color: var(--accent);
        text-transform: uppercase;
        letter-spacing: 0.06em;
        margin-bottom: 0.5rem;
      }
      .mc-preview-code {
        font-family: 'JetBrains Mono', 'Courier New', monospace;
        font-size: 1.1rem;
        font-weight: 800;
        color: var(--accent);
        letter-spacing: 0.03em;
        word-break: break-all;
      }
      .mc-preview-list {
        display: flex; flex-direction: column;
        gap: 0.35rem;
        max-height: 140px;
        overflow-y: auto;
      }
      .mc-preview-item {
        display: flex; align-items: center; gap: 0.5rem;
        font-size: 0.8rem;
      }
      .mc-preview-num {
        font-size: 0.7rem;
        font-weight: 800;
        color: var(--accent);
        background: var(--surface);
        border: 1px solid var(--accent-border);
        padding: 0.1rem 0.4rem;
        border-radius: 4px;
        font-variant-numeric: tabular-nums;
        flex-shrink: 0;
      }
      .mc-preview-code-sm {
        font-family: 'JetBrains Mono', 'Courier New', monospace;
        font-size: 0.75rem;
        font-weight: 700;
        color: var(--text-main);
        word-break: break-all;
      }
      .mc-preview-more {
        font-size: 0.7rem;
        color: var(--text-muted);
        font-style: italic;
        margin-left: auto;
      }

      /* Textarea */
      .mc-textarea {
        width: 100%;
        background: var(--background);
        border: 1.5px solid var(--border);
        border-radius: 10px;
        color: var(--text-main);
        padding: 0.65rem 0.85rem;
        font-size: 0.85rem;
        font-family: inherit;
        resize: vertical;
        min-height: 60px;
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

      /* ============ FOOTER ============ */
      .mc-modal-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        padding: 0.85rem 1.25rem;
        background: var(--background);
        border-top: 1px solid var(--border);
        flex-wrap: wrap;
      }
      .mc-modal-summary {
        display: flex; align-items: center; gap: 0.35rem;
        font-size: 0.78rem;
        color: var(--text-muted);
      }
      .mc-modal-summary svg { color: var(--success, #10B981); }
      .mc-modal-summary strong {
        color: var(--text-main);
        font-weight: 800;
      }

      .mc-modal-actions {
        display: flex; gap: 0.5rem;
      }
      .mc-btn-ghost, .mc-btn-primary {
        display: inline-flex; align-items: center; justify-content: center;
        gap: 0.4rem;
        padding: 0.55rem 1rem;
        border-radius: 9px;
        font-size: 0.82rem;
        font-weight: 700;
        border: 1.5px solid transparent;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
      }
      .mc-btn-ghost {
        background: var(--surface);
        color: var(--text-main);
        border-color: var(--border);
      }
      .mc-btn-ghost:hover:not(:disabled) {
        background: var(--background);
        border-color: var(--text-muted);
      }
      .mc-btn-primary {
        background: var(--accent);
        color: white;
        box-shadow: 0 4px 12px -2px rgba(185,28,28,0.3);
      }
      .mc-btn-primary:hover:not(:disabled) {
        background: var(--accent-hover);
        transform: translateY(-1px);
        box-shadow: 0 8px 20px -4px rgba(185,28,28,0.4);
      }
      .mc-btn-ghost:disabled,
      .mc-btn-primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
      }
      .mc-spin { animation: spin 0.8s linear infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }

      @media (max-width: 480px) {
        .mc-modal-footer { flex-direction: column; align-items: stretch; }
        .mc-modal-summary { justify-content: center; }
        .mc-modal-actions { justify-content: flex-end; }
      }
    `}</style>
  );
}