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

  // User harus ketik nama barang untuk konfirmasi
  const confirmRequired = item.name;
  const isConfirmed = confirmText.trim().toLowerCase() === confirmRequired.toLowerCase();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isConfirmed || saving) return;

    setSaving(true);
    setError("");

    try {
      // 1. Hapus barang (Supabase akan otomatis menghapus unit jika ada ON DELETE CASCADE)
      const { error: delErr } = await supabase
        .from("items")
        .delete()
        .eq("id", item.id);
      
      if (delErr) throw delErr;

      // 2. Catat ke log
      await logActivity({
        action: "delete_item",
        entity: "items",
        entityId: item.id,
        detail: { 
          name: item.name, 
          reason, 
          notes: notes || "-" 
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
        {/* ============ HEADER DANGER ============ */}
        <div className="mc-modal-head mc-head-danger">
          <div className="mc-modal-head-glow" />
          <div className="mc-modal-head-content">
            <div className="mc-modal-icon mc-icon-danger">
              <AlertTriangle size={20} />
            </div>
            <div className="mc-modal-head-text">
              <h2 className="mc-modal-title">Hapus Barang Induk?</h2>
              <p className="mc-modal-sub">
                <Package size={10} /> {item.name}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="mc-modal-close"
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
                <p className="mc-danger-banner-title">Peringatan Keras</p>
                <p className="mc-danger-banner-text">
                  Menghapus barang ini akan <strong>menghapus seluruh unit fisik</strong> yang terkait secara permanen. Data tidak bisa dikembalikan.
                </p>
              </div>
            </div>

            <div className="mc-unit-info">
              <div className="mc-unit-info-head">
                <span className="mc-unit-info-label">
                  <Box size={11} /> Info Barang
                </span>
              </div>
              <div className="mc-unit-info-body">
                <div className="mc-unit-info-row">
                  <span className="mc-unit-info-key">Nama</span>
                  <span className="mc-unit-info-val">{item.name}</span>
                </div>
                <div className="mc-unit-info-row">
                  <span className="mc-unit-info-key">Kategori</span>
                  <span className="mc-unit-info-val">{item.category?.name || "-"}</span>
                </div>
                <div className="mc-unit-info-row">
                  <span className="mc-unit-info-key">Lokasi</span>
                  <span className="mc-unit-info-val">{item.location?.name || "-"}</span>
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
                placeholder="Detail tambahan..."
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
              <><AlertTriangle size={13} /> Barang siap dihapus permanen</>
            ) : (
              <><Info size={13} /> Ketik nama barang untuk konfirmasi</>
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
                <><Trash2 size={14} /> Hapus Barang</>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}