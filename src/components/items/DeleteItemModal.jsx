import { useState, useEffect } from "react";
import {
  AlertTriangle, Trash2, X, Package, AlertCircle,
  Info, Loader2, ShieldAlert, CheckCircle2, Box
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { logActivity } from "../../utils/logActivity";
import "../../styles/modal.css";

const reasons = [
  { value: "salah_input",  label: "Salah input / duplikat" },
  { value: "tidak_layak",  label: "Sudah tidak layak dipakai" },
  { value: "dihapus_total", label: "Semua unit sudah dihapus" },
  { value: "lainnya",      label: "Lainnya..." },
];

export default function DeleteItemModal({ item, onClose, onSuccess }) {
  const [reason, setReason] = useState("salah_input");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [isConfirmed, setIsConfirmed] = useState(false); // State centang persetujuan

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
    if (!isConfirmed || saving) return;

    setSaving(true);
    setError("");

    try {
      const { error: delErr } = await supabase
        .from("items")
        .delete()
        .eq("id", item.id);
      
      if (delErr) throw delErr;

      await logActivity({
        action: "delete_item",
        entity: "items",
        entityId: item.id,
        detail: { name: item.name, reason, notes: notes || "-" },
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
        className="mc-modal mc-modal-wide mc-modal-delete"
        onClick={(e) => e.stopPropagation()}
      >
        <DeleteModalStyles />

        {/* HEADER DANGER */}
        <div className="mc-del-head">
          <div className="mc-del-head-glow" />
          <div className="mc-del-head-content">
            <div className="mc-del-icon-box">
              <AlertTriangle size={22} />
            </div>
            <div className="mc-del-head-text">
              <h2 className="mc-del-title">Konfirmasi Hapus Barang</h2>
              <p className="mc-del-sub">Tindakan ini tidak dapat dibatalkan</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="mc-del-close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="mc-del-body">
          {error && (
            <div className="mc-del-error">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          <div className="mc-del-grid">
            {/* KOLOM KIRI: Info & Peringatan */}
            <div className="mc-del-col">
              <div className="mc-del-warning-box">
                <div className="mc-del-warning-icon">
                  <ShieldAlert size={20} />
                </div>
                <div className="mc-del-warning-text">
                  <h4>Peringatan Keras!</h4>
                  <p>
                    Menghapus barang ini akan <strong>menghapus seluruh unit fisik</strong> yang terkait secara permanen.
                  </p>
                </div>
              </div>

              <div className="mc-del-info-card">
                <div className="mc-del-info-header">
                  <Package size={14} />
                  <span>Barang yang akan dihapus</span>
                </div>
                <div className="mc-del-info-body">
                  <div className="mc-del-info-row">
                    <span className="mc-del-info-label">Nama Barang</span>
                    <span className="mc-del-info-value highlight">{item.name}</span>
                  </div>
                  <div className="mc-del-info-row">
                    <span className="mc-del-info-label">Kategori</span>
                    <span className="mc-del-info-value">{item.category?.name || "-"}</span>
                  </div>
                  <div className="mc-del-info-row">
                    <span className="mc-del-info-label">Lokasi</span>
                    <span className="mc-del-info-value">{item.location?.name || "-"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* KOLOM KANAN: Form Input */}
            <div className="mc-del-col">
              <div className="mc-del-field">
                <label className="mc-del-label">
                  <Info size={13} />
                  Alasan Penghapusan <span className="required">*</span>
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={saving}
                  className="mc-del-select"
                >
                  {reasons.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div className="mc-del-field">
                <label className="mc-del-label">
                  Catatan Tambahan <span className="optional">(opsional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Detail tambahan..."
                  rows={2}
                  maxLength={200}
                  disabled={saving}
                  className="mc-del-textarea"
                />
              </div>

              {/* ✅ KONFIRMASI CENTANG (Bukan ketik nama) */}
              <div className="mc-del-checkbox-wrap">
                <label className={`mc-del-checkbox-label ${isConfirmed ? "is-checked" : ""}`}>
                  <input
                    type="checkbox"
                    checked={isConfirmed}
                    onChange={(e) => setIsConfirmed(e.target.checked)}
                    disabled={saving}
                    className="mc-del-checkbox-input"
                  />
                  <div className="mc-del-checkbox-box">
                    {isConfirmed && <CheckCircle2 size={16} />}
                  </div>
                  <span className="mc-del-checkbox-text">
                    Saya mengerti dan yakin untuk menghapus <strong>{item.name}</strong> secara permanen.
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="mc-del-footer">
          <div className="mc-del-footer-info">
            {isConfirmed ? (
              <span className="text-danger"><AlertTriangle size={14} /> Barang siap dihapus permanen</span>
            ) : (
              <span><Info size={14} /> Centang persetujuan untuk melanjutkan</span>
            )}
          </div>
          <div className="mc-del-footer-actions">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="mc-del-btn-cancel"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving || !isConfirmed}
              className="mc-del-btn-submit"
            >
              {saving ? (
                <><Loader2 size={16} className="mc-spin" /> Menghapus...</>
              ) : (
                <><Trash2 size={16} /> Hapus Permanen</>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function DeleteModalStyles() {
  return (
    <style>{`
      .mc-modal-delete {
        max-width: 760px;
        background: var(--surface);
        border: 1px solid rgba(239, 68, 68, 0.2);
        box-shadow: 0 24px 64px -12px rgba(239, 68, 68, 0.15);
      }

      /* HEADER */
      .mc-del-head {
        position: relative;
        background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%);
        padding: 1.5rem;
        color: white;
        overflow: hidden;
      }
      .mc-del-head-glow {
        position: absolute; top: -50%; right: -10%;
        width: 200px; height: 200px;
        background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%);
        filter: blur(30px);
      }
      .mc-del-head-content {
        position: relative; z-index: 1;
        display: flex; align-items: center; gap: 1rem;
      }
      .mc-del-icon-box {
        width: 48px; height: 48px; border-radius: 12px;
        background: rgba(255,255,255,0.15);
        border: 1px solid rgba(255,255,255,0.25);
        display: flex; align-items: center; justify-content: center;
        animation: pulse-danger 2s infinite;
      }
      @keyframes pulse-danger {
        0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.2); }
        50% { box-shadow: 0 0 0 10px rgba(255,255,255,0); }
      }
      .mc-del-head-text { flex: 1; }
      .mc-del-title { font-size: 1.15rem; font-weight: 800; margin-bottom: 0.1rem; }
      .mc-del-sub { font-size: 0.8rem; color: rgba(255,255,255,0.8); }
      .mc-del-close {
        width: 32px; height: 32px; border-radius: 8px;
        background: rgba(0,0,0,0.15); border: none;
        color: white; cursor: pointer; transition: all 0.2s;
        display: flex; align-items: center; justify-content: center;
      }
      .mc-del-close:hover { background: rgba(0,0,0,0.3); transform: rotate(90deg); }

      /* BODY */
      .mc-del-body { padding: 1.5rem; }
      .mc-del-error {
        display: flex; gap: 0.5rem; align-items: center;
        background: rgba(239,68,68,0.1); color: #DC2626;
        padding: 0.75rem 1rem; border-radius: 10px;
        font-size: 0.85rem; font-weight: 600;
        margin-bottom: 1.25rem; border: 1px solid rgba(239,68,68,0.2);
      }
      .mc-del-grid {
        display: grid; grid-template-columns: 1fr 1.2fr; gap: 1.5rem;
      }
      @media (max-width: 640px) { .mc-del-grid { grid-template-columns: 1fr; gap: 1rem; } }
      .mc-del-col { display: flex; flex-direction: column; gap: 1rem; }

      /* WARNING BOX */
      .mc-del-warning-box {
        display: flex; gap: 0.85rem;
        background: linear-gradient(135deg, rgba(239,68,68,0.05), rgba(239,68,68,0.02));
        border: 1px solid rgba(239,68,68,0.2);
        border-radius: 12px; padding: 1rem;
      }
      .mc-del-warning-icon {
        width: 36px; height: 36px; border-radius: 50%;
        background: rgba(239,68,68,0.15); color: #DC2626;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
      }
      .mc-del-warning-text h4 { font-size: 0.85rem; font-weight: 800; color: #DC2626; margin-bottom: 0.25rem; }
      .mc-del-warning-text p { font-size: 0.75rem; color: var(--text-muted); line-height: 1.5; }
      .mc-del-warning-text strong { color: var(--text-main); font-weight: 800; }

      /* INFO CARD */
      .mc-del-info-card {
        background: var(--background);
        border: 1px solid var(--border);
        border-radius: 12px; overflow: hidden;
      }
      .mc-del-info-header {
        padding: 0.6rem 1rem; background: var(--surface);
        border-bottom: 1px solid var(--border);
        font-size: 0.7rem; font-weight: 700; color: var(--text-muted);
        display: flex; align-items: center; gap: 0.4rem;
        text-transform: uppercase; letter-spacing: 0.05em;
      }
      .mc-del-info-header svg { color: var(--accent); }
      .mc-del-info-body { padding: 0.85rem 1rem; display: flex; flex-direction: column; gap: 0.6rem; }
      .mc-del-info-row {
        display: flex; justify-content: space-between; align-items: baseline;
        font-size: 0.82rem; border-bottom: 1px dashed var(--border); padding-bottom: 0.5rem;
      }
      .mc-del-info-row:last-child { border-bottom: none; padding-bottom: 0; }
      .mc-del-info-label { color: var(--text-muted); font-weight: 600; }
      .mc-del-info-value { font-weight: 700; color: var(--text-main); text-align: right; }
      .mc-del-info-value.highlight { color: var(--text-main); font-size: 0.9rem; font-weight: 800; }

      /* FORM FIELDS */
      .mc-del-field { display: flex; flex-direction: column; gap: 0.4rem; }
      .mc-del-label {
        display: flex; align-items: center; gap: 0.4rem;
        font-size: 0.8rem; font-weight: 700; color: var(--text-main);
      }
      .mc-del-label svg { color: var(--text-muted); }
      .mc-del-label .required { color: #EF4444; }
      .mc-del-label .optional { font-weight: 500; color: var(--text-muted); font-size: 0.75rem; }

      .mc-del-select, .mc-del-textarea {
        width: 100%; padding: 0.65rem 0.85rem;
        background: var(--background); border: 1.5px solid var(--border);
        border-radius: 10px; color: var(--text-main);
        font-size: 0.85rem; font-family: inherit;
        transition: all 0.2s; outline: none;
      }
      .mc-del-select { appearance: none; cursor: pointer; }
      .mc-del-textarea { resize: vertical; min-height: 70px; }
      .mc-del-select:focus, .mc-del-textarea:focus {
        border-color: var(--accent);
        box-shadow: 0 0 0 3px var(--accent-soft);
      }
      .mc-del-select:disabled, .mc-del-textarea:disabled { opacity: 0.6; cursor: not-allowed; }

      /* ✅ CHECKBOX KONFIRMASI */
      .mc-del-checkbox-wrap {
        background: rgba(239, 68, 68, 0.05);
        border: 1px dashed rgba(239, 68, 68, 0.3);
        border-radius: 10px;
        padding: 0.85rem 1rem;
        margin-top: 0.25rem;
        transition: all 0.2s;
      }
      .mc-del-checkbox-wrap:has(.is-checked) {
        background: rgba(16, 185, 129, 0.05);
        border-color: rgba(16, 185, 129, 0.3);
        border-style: solid;
      }

      .mc-del-checkbox-label {
        display: flex; align-items: flex-start; gap: 0.75rem;
        cursor: pointer;
      }
      .mc-del-checkbox-input {
        position: absolute; opacity: 0; width: 0; height: 0;
      }
      .mc-del-checkbox-box {
        width: 22px; height: 22px;
        border-radius: 6px;
        border: 2px solid var(--text-muted);
        background: var(--surface);
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
        transition: all 0.2s;
        margin-top: 1px;
      }
      .mc-del-checkbox-label:hover .mc-del-checkbox-box {
        border-color: #EF4444;
      }
      .mc-del-checkbox-label.is-checked .mc-del-checkbox-box {
        background: #10B981;
        border-color: #10B981;
        color: white;
      }
      .mc-del-checkbox-text {
        font-size: 0.82rem;
        color: var(--text-muted);
        line-height: 1.5;
        user-select: none;
      }
      .mc-del-checkbox-text strong {
        color: var(--text-main);
        font-weight: 700;
      }

      /* FOOTER */
      .mc-del-footer {
        padding: 1rem 1.5rem;
        background: var(--background);
        border-top: 1px solid var(--border);
        display: flex; align-items: center; justify-content: space-between;
        gap: 1rem;
      }
      .mc-del-footer-info { font-size: 0.78rem; color: var(--text-muted); font-weight: 600; display: flex; align-items: center; gap: 0.4rem; }
      .mc-del-footer-info.text-danger { color: #DC2626; }
      .mc-del-footer-actions { display: flex; gap: 0.5rem; }
      .mc-del-btn-cancel {
        padding: 0.6rem 1.2rem; border-radius: 10px;
        background: var(--surface); border: 1.5px solid var(--border);
        color: var(--text-main); font-weight: 700; font-size: 0.85rem;
        cursor: pointer; transition: all 0.2s; font-family: inherit;
      }
      .mc-del-btn-cancel:hover { background: var(--background); border-color: var(--text-muted); }
      .mc-del-btn-submit {
        display: inline-flex; align-items: center; gap: 0.4rem;
        padding: 0.6rem 1.5rem; border-radius: 10px;
        background: linear-gradient(135deg, #EF4444 0%, #B91C1C 100%);
        color: white; font-weight: 700; font-size: 0.85rem;
        border: none; cursor: pointer; transition: all 0.25s;
        box-shadow: 0 4px 12px -2px rgba(239,68,68,0.4);
        font-family: inherit;
      }
      .mc-del-btn-submit:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px -4px rgba(239,68,68,0.5);
      }
      .mc-del-btn-submit:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }

      @media (max-width: 640px) {
        .mc-del-footer { flex-direction: column; align-items: stretch; }
        .mc-del-footer-info { justify-content: center; margin-bottom: 0.5rem; }
        .mc-del-footer-actions { display: flex; }
        .mc-del-btn-cancel, .mc-del-btn-submit { flex: 1; justify-content: center; }
      }
    `}</style>
  );
}