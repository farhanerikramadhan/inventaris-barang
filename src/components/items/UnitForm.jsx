import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  X, QrCode, Package, CheckCircle2, AlertCircle,
  Loader2, Save, Info, Hash, Box, Sparkles
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { logActivity } from "../../utils/logActivity";
import "../../styles/modal.css";

const conditionOptions = [
  { value: "baik",         label: "Baik",          icon: CheckCircle2, color: "#10B981", bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.3)" },
  { value: "rusak_ringan", label: "Rusak Ringan",  icon: AlertCircle,  color: "#F59E0B", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.3)" },
  { value: "rusak_berat",  label: "Rusak Berat",   icon: X,            color: "#EF4444", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.3)" },
];

const statusOptions = [
  { value: "active",      label: "Aktif",      color: "#3B82F6", bg: "rgba(59,130,246,0.1)",  border: "rgba(59,130,246,0.3)" },
  { value: "dipinjam",    label: "Dipinjam",   color: "#F59E0B", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.3)" },
  { value: "maintenance", label: "Perbaikan",  color: "#EAB308", bg: "rgba(234,179,8,0.1)",   border: "rgba(234,179,8,0.3)" },
  { value: "rusak",       label: "Rusak",      color: "#EF4444", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.3)" },
  { value: "hilang",      label: "Hilang",     color: "#6B7280", bg: "rgba(107,114,128,0.1)", border: "rgba(107,114,128,0.3)" },
];

export default function UnitForm({ unit, onClose, onSaved }) {
  const [form, setForm] = useState({
    condition: unit.condition,
    status: unit.status,
    notes: unit.notes || "",
  });
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

  const hasChanges =
    form.condition !== unit.condition ||
    form.status !== unit.status ||
    (form.notes || "") !== (unit.notes || "");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hasChanges || saving) return;

    setSaving(true);
    setError("");

    const { error: upErr } = await supabase
      .from("item_units")
      .update({
        condition: form.condition,
        status: form.status,
        notes: form.notes || null,
      })
      .eq("id", unit.id);

    if (upErr) {
      setError(upErr.message);
      setSaving(false);
      return;
    }

    await logActivity({
      action: "update_unit",
      entity: "item_units",
      entityId: unit.id,
      detail: {
        code: unit.unit_code,
        changes: {
          from: { condition: unit.condition, status: unit.status },
          to:   { condition: form.condition, status: form.status },
        },
      },
    });

    setSaving(false);
    onSaved?.();
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
        <UnitFormStyles />

        {/* ============ HEADER ============ */}
        <div className="mc-modal-head mc-head-blue">
          <div className="mc-modal-head-glow" />
          <div className="mc-modal-head-content">
            <div className="mc-modal-icon">
              <Box size={20} />
            </div>
            <div className="mc-modal-head-text">
              <h2 className="mc-modal-title">Edit Unit</h2>
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

        {/* ============ BODY — 2 KOLOM ============ */}
        <div className="mc-modal-body mc-body-grid">
          {error && (
            <div className="mc-error mc-span-full">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {/* KOLOM KIRI — QR & Preview */}
          <div className="mc-col">
            <div className="mc-qr-panel">
              <div className="mc-qr-panel-head">
                <span className="mc-qr-panel-label">
                  <QrCode size={11} /> QR Code
                </span>
              </div>

              <div className="mc-qr-panel-body">
                <div className="mc-qr-box">
                  <QRCodeSVG value={unit.unit_code} size={140} level="M" />
                </div>
              </div>

              <div className="mc-qr-panel-foot">
                <p className="mc-qr-code">{unit.unit_code}</p>
                <p className="mc-qr-hint">Scan untuk buka detail</p>
              </div>
            </div>

            <div className="mc-info-card">
              <Info size={14} className="mc-info-icon" />
              <div>
                <p className="mc-info-title">Unit #{unit.unit_number}</p>
                <p className="mc-info-sub">
                  Terakhir diperbarui: {new Date(unit.updated_at || unit.created_at).toLocaleDateString("id-ID", {
                    day: "numeric", month: "short", year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* KOLOM KANAN — Form Edit */}
          <div className="mc-col">
            {/* Kondisi */}
            <div className="mc-field">
              <label className="mc-label">
                <Sparkles size={12} />
                Kondisi Fisik
              </label>
              <div className="mc-options-grid">
                {conditionOptions.map((opt) => {
                  const Icon = opt.icon;
                  const active = form.condition === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm({ ...form, condition: opt.value })}
                      disabled={saving}
                      className={`mc-option-btn ${active ? "is-active" : ""}`}
                      style={active ? {
                        background: opt.bg,
                        borderColor: opt.border,
                        color: opt.color,
                      } : {}}
                    >
                      <Icon size={14} />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Status */}
            <div className="mc-field">
              <label className="mc-label">
                <Package size={12} />
                Status Penggunaan
              </label>
              <div className="mc-status-chips">
                {statusOptions.map((opt) => {
                  const active = form.status === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm({ ...form, status: opt.value })}
                      disabled={saving}
                      className={`mc-status-chip ${active ? "is-active" : ""}`}
                      style={active ? {
                        background: opt.bg,
                        borderColor: opt.border,
                        color: opt.color,
                      } : {}}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Catatan */}
            <div className="mc-field">
              <label className="mc-label">
                Catatan <span className="mc-label-opt">(opsional)</span>
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Contoh: Kaki goyang, cat tergores..."
                rows={3}
                maxLength={200}
                disabled={saving}
                className="mc-textarea"
              />
            </div>
          </div>
        </div>

        {/* ============ FOOTER ============ */}
        <div className="mc-modal-footer">
          <div className="mc-modal-summary">
            {hasChanges ? (
              <><CheckCircle2 size={13} /> Ada perubahan belum disimpan</>
            ) : (
              <><Info size={13} /> Tidak ada perubahan</>
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
              disabled={saving || !hasChanges}
              className="mc-btn-primary"
            >
              {saving ? (
                <><Loader2 size={14} className="mc-spin" /> Menyimpan...</>
              ) : (
                <><Save size={14} /> Simpan</>
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
function UnitFormStyles() {
  return (
    <style>{`
      /* ✅ MODAL SHELL - Memastikan di tengah & tidak melebihi layar */
      .mc-modal-wide { 
        max-width: 720px; 
        max-height: 90vh !important;
        display: flex;
        flex-direction: column;
      }
      @media (max-width: 720px) {
        .mc-modal-wide { 
          max-width: 100%; 
          margin: 0.5rem;
          max-height: 95vh !important;
        }
      }

      /* Header blue variant */
      .mc-head-blue {
        background: linear-gradient(135deg, #2563EB 0%, #1E40AF 100%) !important;
      }

      /* Sub info di header */
      .mc-sub-dot {
        display: inline-block;
        width: 3px;
        height: 3px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.5);
        margin: 0 2px;
      }
      .mc-sub-code {
        font-family: 'JetBrains Mono', 'Courier New', monospace;
        font-size: 0.72rem;
        opacity: 0.9;
      }

      /* ✅ BODY GRID - Bisa di-scroll */
      .mc-body-grid {
        display: grid;
        grid-template-columns: 1fr 1.2fr;
        gap: 1.1rem;
        align-items: start; /* ✅ Mencegah stretching */
        
        /* ✅ Kunci scroll */
        overflow-y: auto !important;
        flex: 1;
        padding: 1.25rem;
        padding-bottom: 1rem;
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

      /* Error */
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

      /* QR Panel */
      .mc-qr-panel {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 14px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        flex: 1;
      }
      .mc-qr-panel-head {
        padding: 0.6rem 0.85rem;
        background: var(--background);
        border-bottom: 1px solid var(--border);
      }
      .mc-qr-panel-label {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        font-size: 0.68rem;
        font-weight: 700;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }
      .mc-qr-panel-body {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        background:
          linear-gradient(45deg, var(--background) 25%, transparent 25%),
          linear-gradient(-45deg, var(--background) 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, var(--background) 75%),
          linear-gradient(-45deg, transparent 75%, var(--background) 75%);
        background-size: 16px 16px;
        background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
      }
      .mc-qr-box {
        background: white;
        padding: 8px;
        border-radius: 10px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
      }
      .mc-qr-panel-foot {
        padding: 0.6rem 0.85rem;
        border-top: 1px solid var(--border);
        background: var(--background);
        text-align: center;
      }
      .mc-qr-code {
        font-family: 'JetBrains Mono', 'Courier New', monospace;
        font-size: 0.78rem;
        font-weight: 800;
        color: var(--text-main);
        letter-spacing: 0.04em;
        word-break: break-all;
      }
      .mc-qr-hint {
        font-size: 0.65rem;
        color: var(--text-muted);
        margin-top: 2px;
      }

      /* Info card */
      .mc-info-card {
        display: flex;
        align-items: flex-start;
        gap: 0.6rem;
        background: var(--background);
        border: 1px solid var(--border);
        border-radius: 11px;
        padding: 0.7rem 0.85rem;
      }
      .mc-info-icon {
        color: var(--accent);
        flex-shrink: 0;
        margin-top: 1px;
      }
      .mc-info-title {
        font-size: 0.78rem;
        font-weight: 700;
        color: var(--text-main);
        margin-bottom: 2px;
      }
      .mc-info-sub {
        font-size: 0.7rem;
        color: var(--text-muted);
      }

      /* Fields */
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

      /* Options grid (kondisi) */
      .mc-options-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.35rem;
      }
      .mc-option-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.3rem;
        padding: 0.65rem 0.5rem;
        border-radius: 10px;
        border: 1.5px solid var(--border);
        background: var(--background);
        color: var(--text-muted);
        font-size: 0.72rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        font-family: inherit;
      }
      .mc-option-btn:hover:not(:disabled):not(.is-active) {
        border-color: var(--text-muted);
        transform: translateY(-1px);
      }
      .mc-option-btn.is-active {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px -4px rgba(0, 0, 0, 0.15);
      }
      .mc-option-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      /* Status chips */
      .mc-status-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;
      }
      .mc-status-chip {
        padding: 0.4rem 0.75rem;
        border-radius: 999px;
        border: 1.5px solid var(--border);
        background: var(--background);
        color: var(--text-muted);
        font-size: 0.72rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
        font-family: inherit;
      }
      .mc-status-chip:hover:not(:disabled):not(.is-active) {
        border-color: var(--text-muted);
        color: var(--text-main);
      }
      .mc-status-chip.is-active {
        transform: translateY(-1px);
        box-shadow: 0 2px 8px -2px rgba(0, 0, 0, 0.1);
      }
      .mc-status-chip:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      /* Textarea */
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

      /* Mobile */
      @media (max-width: 720px) {
        .mc-qr-box svg { width: 110px !important; height: 110px !important; }
      }
    `}</style>
  );
}