import { useState, useEffect } from "react";
import { 
  AlertTriangle, Trash2, X, Package, Hash, 
  AlertCircle, Info, Loader2, ShieldAlert,
  CheckCircle2, Box
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { logActivity } from "../../utils/logActivity";
import "../../styles/modal.css";

const reasons = [
  { value: "hilang",      label: "Hilang (tidak ditemukan)" },
  { value: "rusak_total", label: "Rusak total (tidak bisa dipakai)" },
  { value: "dipindahkan", label: "Dipindahkan ke sekolah lain" },
  { value: "dihibahkan",  label: "Dihibahkan / disumbangkan" },
  { value: "lainnya",     label: "Lainnya..." },
];

// ✅ Tambahkan prop 'item' di sini
export default function DeleteUnitModal({ unit, item, onClose, onSuccess }) {
  const [reason, setReason] = useState("hilang");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmText, setConfirmText] = useState("");

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

  // User harus ketik kode unit untuk konfirmasi
  const confirmRequired = unit.unit_code;
  const isConfirmed = confirmText.trim() === confirmRequired;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isConfirmed || saving) return;

    setSaving(true);
    setError("");

    try {
      // 1. Catat riwayat SEBELUM menghapus
      const { error: movErr } = await supabase.from("item_movements").insert({
        item_id: unit.item_id,
        unit_id: unit.id,
        movement_type: "qty_out",
        reason: reason,
        from_condition: unit.condition,
        from_status: unit.status,
        notes: notes || `Unit #${unit.unit_number} (${unit.unit_code}) dihapus. Alasan: ${reason}`,
      });
      if (movErr) throw movErr;

      // 2. Hapus unit
      const { error: delErr } = await supabase
        .from("item_units")
        .delete()
        .eq("id", unit.id);
      if (delErr) throw delErr;

      // 3. Log global
      await logActivity({
        action: "delete_unit",
        entity: "item_units",
        entityId: unit.id,
        detail: { 
          item_name: item?.name || "Barang", // ✅ Simpan nama barang
          code: unit.unit_code, 
          reason, 
          notes 
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
      // ✅ FIX BUG: e.target.currentTarget diubah menjadi e.target === e.currentTarget
      onClick={(e) => e.target === e.currentTarget && !saving && onClose?.()}
    >
      <form
        onSubmit={handleSubmit}
        className="mc-modal mc-modal-wide"
        onClick={(e) => e.stopPropagation()}
      >
        <DeleteUnitStyles />

        {/* ============ HEADER DANGER ============ */}
        <div className="mc-modal-head mc-head-danger">
          <div className="mc-modal-head-glow" />
          <div className="mc-modal-head-content">
            <div className="mc-modal-icon mc-icon-danger">
              <AlertTriangle size={20} />
            </div>
            <div className="mc-modal-head-text">
              <h2 className="mc-modal-title">Hapus Unit?</h2>
              <p className="mc-modal-sub">
                <Hash size={10} /> #{unit.unit_number}
                <span className="mc-sub-dot" />
                <span className="mc-sub-code">{unit.unit_code}</span>
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

        {/* ============ BODY ============ */}
        <div className="mc-modal-body mc-body-grid">
          {error && (
            <div className="mc-error mc-span-full">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {/* KOLOM KIRI */}
          <div className="mc-col">
            <div className="mc-danger-banner">
              <div className="mc-danger-banner-icon">
                <ShieldAlert size={18} />
              </div>
              <div className="mc-danger-banner-body">
                <p className="mc-danger-banner-title">Tindakan Permanen</p>
                <p className="mc-danger-banner-text">
                  Unit akan dihapus <strong>permanen</strong> dari sistem.
                  Tindakan ini <strong>tidak bisa dibatalkan</strong>.
                </p>
              </div>
            </div>

            <div className="mc-unit-info">
              <div className="mc-unit-info-head">
                <span className="mc-unit-info-label">
                  <Box size={11} /> Unit yang akan dihapus
                </span>
              </div>

              <div className="mc-unit-info-body">
                <div className="mc-unit-info-row">
                  <span className="mc-unit-info-key">Barang</span>
                  <span className="mc-unit-info-val">{item?.name || "-"}</span>
                </div>
                <div className="mc-unit-info-row">
                  <span className="mc-unit-info-key">Kode</span>
                  <span className="mc-unit-info-val mono">{unit.unit_code}</span>
                </div>
                <div className="mc-unit-info-row">
                  <span className="mc-unit-info-key">Kondisi</span>
                  <span className="mc-unit-info-val" style={{ textTransform: "capitalize" }}>{unit.condition.replace("_", " ")}</span>
                </div>
                <div className="mc-unit-info-row">
                  <span className="mc-unit-info-key">Status</span>
                  <span className="mc-unit-info-val" style={{ textTransform: "capitalize" }}>{unit.status}</span>
                </div>
              </div>
            </div>
          </div>

          {/* KOLOM KANAN */}
          <div className="mc-col">
            <div className="mc-field">
              <label className="mc-label">
                <Info size={12} />
                Alasan penghapusan <span className="mc-label-req">*</span>
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

            <div className="mc-field">
              <label className="mc-label mc-label-danger">
                <AlertCircle size={12} />
                Konfirmasi
              </label>
              <p className="mc-confirm-hint">
                Ketik <code className="mc-confirm-code">{confirmRequired}</code> untuk konfirmasi
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={confirmRequired}
                disabled={saving}
                className={`mc-confirm-input ${isConfirmed ? "is-valid" : ""}`}
                autoComplete="off"
                spellCheck="false"
              />
              {isConfirmed && (
                <div className="mc-confirm-ok">
                  <CheckCircle2 size={12} /> Konfirmasi cocok
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ============ FOOTER ============ */}
        <div className="mc-modal-footer">
          <div className={`mc-modal-summary ${isConfirmed ? "danger" : ""}`}>
            {isConfirmed ? (
              <><AlertTriangle size={13} /> Unit siap dihapus permanen</>
            ) : (
              <><Info size={13} /> Ketik kode unit untuk konfirmasi</>
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
              disabled={saving || !isConfirmed}
              className="mc-btn-danger"
            >
              {saving ? (
                <><Loader2 size={14} className="mc-spin" /> Menghapus...</>
              ) : (
                <><Trash2 size={14} /> Hapus Unit</>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

/* CSS styles tetap sama seperti sebelumnya */
function DeleteUnitStyles() {
  return (
    <style>{`
      .mc-modal-wide { max-width: 720px; }
      @media (max-width: 720px) { .mc-modal-wide { max-width: 440px; } }

      .mc-head-danger {
        background: linear-gradient(135deg, #DC2626 0%, #7F1D1D 100%) !important;
      }
      .mc-icon-danger {
        background: rgba(255, 255, 255, 0.2) !important;
        border-color: rgba(255, 255, 255, 0.3) !important;
      }

      .mc-sub-dot {
        display: inline-block; width: 3px; height: 3px;
        border-radius: 50%; background: rgba(255, 255, 255, 0.5);
        margin: 0 2px;
      }
      .mc-sub-code {
        font-family: 'JetBrains Mono', 'Courier New', monospace;
        font-size: 0.72rem; opacity: 0.9;
      }

      .mc-body-grid {
        display: grid; grid-template-columns: 1fr 1.15fr;
        gap: 1.1rem; align-items: stretch;
      }
      @media (max-width: 720px) { .mc-body-grid { grid-template-columns: 1fr; gap: 0.9rem; } }
      .mc-span-full { grid-column: 1 / -1; }

      .mc-col { display: flex; flex-direction: column; gap: 0.85rem; min-width: 0; }

      .mc-error {
        display: flex; align-items: flex-start; gap: 0.5rem;
        background: var(--danger-soft, #FEF2F2);
        border: 1px solid var(--danger-border, #FECACA);
        color: var(--danger, #DC2626);
        padding: 0.65rem 0.85rem; border-radius: 10px;
        font-size: 0.8rem; font-weight: 500;
      }
      .mc-error svg { flex-shrink: 0; margin-top: 1px; }
      .dark .mc-error {
        background: rgba(239, 68, 68, 0.1);
        border-color: rgba(239, 68, 68, 0.25);
        color: #F87171;
      }

      .mc-danger-banner {
        display: flex; gap: 0.65rem;
        padding: 0.75rem 0.85rem;
        background: rgba(239, 68, 68, 0.06);
        border: 1px solid rgba(239, 68, 68, 0.2);
        border-radius: 11px;
      }
      .mc-danger-banner-icon {
        width: 30px; height: 30px; border-radius: 8px;
        background: rgba(239, 68, 68, 0.15); color: #DC2626;
        display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      }
      .dark .mc-danger-banner { background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.25); }
      .dark .mc-danger-banner-icon { color: #F87171; }
      .mc-danger-banner-body { flex: 1; min-width: 0; }
      .mc-danger-banner-title { font-size: 0.78rem; font-weight: 800; color: #DC2626; margin-bottom: 2px; }
      .dark .mc-danger-banner-title { color: #F87171; }
      .mc-danger-banner-text { font-size: 0.74rem; color: var(--text-muted); line-height: 1.45; }
      .mc-danger-banner-text strong { color: var(--text-main); font-weight: 800; }

      .mc-unit-info { background: var(--surface); border: 1px solid var(--border); border-radius: 11px; overflow: hidden; }
      .mc-unit-info-head { padding: 0.55rem 0.75rem; background: var(--background); border-bottom: 1px solid var(--border); }
      .mc-unit-info-label {
        display: inline-flex; align-items: center; gap: 0.3rem;
        font-size: 0.68rem; font-weight: 700; color: var(--text-muted);
        text-transform: uppercase; letter-spacing: 0.05em;
      }
      .mc-unit-info-body { padding: 0.65rem 0.75rem; display: flex; flex-direction: column; gap: 0.4rem; }
      .mc-unit-info-row {
        display: flex; justify-content: space-between; align-items: baseline;
        gap: 0.5rem; font-size: 0.78rem; padding-bottom: 0.4rem; border-bottom: 1px dashed var(--border);
      }
      .mc-unit-info-row:last-child { border-bottom: none; padding-bottom: 0; }
      .mc-unit-info-key { color: var(--text-muted); font-weight: 600; }
      .mc-unit-info-val { font-weight: 800; color: var(--text-main); text-align: right; word-break: break-all; }
      .mc-unit-info-val.mono { font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 0.75rem; }

      .mc-field { display: flex; flex-direction: column; }
      .mc-label {
        display: flex; align-items: center; gap: 0.35rem;
        font-size: 0.75rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.45rem;
      }
      .mc-label-opt { font-weight: 500; color: var(--text-muted); font-size: 0.7rem; }
      .mc-label-req { color: #EF4444; font-size: 0.85rem; line-height: 1; }
      .mc-label-danger { color: #DC2626; }
      .dark .mc-label-danger { color: #F87171; }

      .mc-select {
        width: 100%; background: var(--background);
        border: 1.5px solid var(--border); border-radius: 10px;
        color: var(--text-main); padding: 0.55rem 0.8rem;
        font-size: 0.82rem; font-family: inherit; cursor: pointer; transition: all 0.2s;
      }
      .mc-select:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
      .mc-select:disabled { opacity: 0.6; cursor: not-allowed; }

      .mc-textarea {
        width: 100%; background: var(--background);
        border: 1.5px solid var(--border); border-radius: 10px;
        color: var(--text-main); padding: 0.6rem 0.8rem;
        font-size: 0.82rem; font-family: inherit; resize: vertical;
        min-height: 56px; transition: all 0.2s;
      }
      .mc-textarea:focus { outline: none; border-color: var(--accent); background: var(--surface); box-shadow: 0 0 0 3px var(--accent-soft); }
      .mc-textarea::placeholder { color: var(--text-muted); opacity: 0.6; }
      .mc-textarea:disabled { opacity: 0.6; cursor: not-allowed; }

      .mc-confirm-hint { font-size: 0.72rem; color: var(--text-muted); margin-bottom: 0.4rem; }
      .mc-confirm-code {
        font-family: 'JetBrains Mono', 'Courier New', monospace;
        font-size: 0.72rem; font-weight: 800; color: #DC2626;
        background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.2);
        padding: 0.1rem 0.35rem; border-radius: 4px;
      }
      .dark .mc-confirm-code {
        color: #F87171; background: rgba(239, 68, 68, 0.15); border-color: rgba(239, 68, 68, 0.3);
      }
      .mc-confirm-input {
        width: 100%; background: var(--background);
        border: 1.5px solid var(--border); border-radius: 10px;
        color: var(--text-main); padding: 0.6rem 0.8rem;
        font-size: 0.85rem; font-family: 'JetBrains Mono', 'Courier New', monospace;
        font-weight: 700; letter-spacing: 0.04em; transition: all 0.2s;
      }
      .mc-confirm-input:focus { outline: none; border-color: #EF4444; box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15); }
      .mc-confirm-input.is-valid {
        border-color: #10B981; background: rgba(16, 185, 129, 0.05);
        box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
      }
      .mc-confirm-input::placeholder { color: var(--text-muted); opacity: 0.4; font-weight: 500; }
      .mc-confirm-input:disabled { opacity: 0.6; cursor: not-allowed; }

      .mc-confirm-ok {
        display: inline-flex; align-items: center; gap: 0.3rem;
        font-size: 0.72rem; font-weight: 700; color: #10B981; margin-top: 0.35rem;
      }
      .dark .mc-confirm-ok { color: #34D399; }

      .mc-modal-summary.danger { color: #DC2626; }
      .mc-modal-summary.danger svg { color: #DC2626; }
      .dark .mc-modal-summary.danger { color: #F87171; }
      .dark .mc-modal-summary.danger svg { color: #F87171; }

      @media (max-width: 720px) { .mc-unit-info-body { padding: 0.5rem 0.65rem; } }
    `}</style>
  );
}