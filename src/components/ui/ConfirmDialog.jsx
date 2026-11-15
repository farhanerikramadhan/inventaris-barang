import { useEffect, useState } from "react";
import { 
  AlertTriangle, Trash2, X, Loader2, 
  ShieldAlert, Info, CheckCircle2 
} from "lucide-react";

/**
 * ConfirmDialog — modal konfirmasi di tengah layar
 * 
 * Props:
 * - open: boolean
 * - onClose: () => void
 * - onConfirm: () => void | Promise<void>
 * - title: string
 * - description: string | ReactNode
 * - confirmText: string (default: "Hapus")
 * - cancelText: string (default: "Batal")
 * - variant: "danger" | "warning" | "info"
 * - loading: boolean (opsional, kalau parent handle loading)
 */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Konfirmasi",
  description = "Apakah Anda yakin?",
  confirmText = "Hapus",
  cancelText = "Batal",
  variant = "danger",
  icon: CustomIcon,
}) {
  const [processing, setProcessing] = useState(false);

  // ESC close
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape" && !processing) onClose?.();
    };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, processing, onClose]);

  if (!open) return null;

  const handleConfirm = async () => {
    try {
      setProcessing(true);
      await onConfirm?.();
      onClose?.();
    } catch (err) {
      // error ditangani parent
    } finally {
      setProcessing(false);
    }
  };

  const variantMeta = {
    danger: {
      color: "#EF4444",
      bg: "rgba(239,68,68,0.12)",
      border: "rgba(239,68,68,0.3)",
      icon: Trash2,
      confirmClass: "cd-btn-danger",
    },
    warning: {
      color: "#F59E0B",
      bg: "rgba(245,158,11,0.12)",
      border: "rgba(245,158,11,0.3)",
      icon: AlertTriangle,
      confirmClass: "cd-btn-warning",
    },
    info: {
      color: "#3B82F6",
      bg: "rgba(59,130,246,0.12)",
      border: "rgba(59,130,246,0.3)",
      icon: Info,
      confirmClass: "cd-btn-info",
    },
  };

  const meta = variantMeta[variant] || variantMeta.danger;
  const Icon = CustomIcon || meta.icon;

  return (
    <div
      className="cd-backdrop"
      onClick={(e) => e.target === e.currentTarget && !processing && onClose?.()}
    >
      <div className="cd-modal" onClick={(e) => e.stopPropagation()}>
        <ConfirmStyles />

        {/* Header */}
        <div className="cd-header">
          <div
            className="cd-icon"
            style={{ background: meta.bg, color: meta.color, borderColor: meta.border }}
          >
            <Icon size={24} />
          </div>
          <button
            className="cd-close"
            onClick={onClose}
            disabled={processing}
            aria-label="Tutup"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="cd-body">
          <h3 className="cd-title">{title}</h3>
          <div className="cd-desc">{description}</div>
        </div>

        {/* Footer */}
        <div className="cd-footer">
          <button
            className="cd-btn cd-btn-cancel"
            onClick={onClose}
            disabled={processing}
          >
            {cancelText}
          </button>
          <button
            className={`cd-btn ${meta.confirmClass}`}
            onClick={handleConfirm}
            disabled={processing}
          >
            {processing ? (
              <>
                <Loader2 size={14} className="cd-spin" /> Memproses...
              </>
            ) : (
              <>
                <Icon size={14} /> {confirmText}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Styles
============================================================ */
function ConfirmStyles() {
  return (
    <style>{`
      .cd-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.55);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        padding: 1rem;
        animation: cd-backdrop-in 0.2s ease;
      }
      @keyframes cd-backdrop-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      .cd-modal {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 20px;
        box-shadow: 0 24px 64px -16px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.05);
        width: 100%;
        max-width: 420px;
        padding: 1.5rem;
        position: relative;
        overflow: hidden;
        animation: cd-modal-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes cd-modal-in {
        from { 
          opacity: 0; 
          transform: scale(0.9) translateY(20px); 
        }
        to { 
          opacity: 1; 
          transform: scale(1) translateY(0); 
        }
      }

      /* Accent line di atas */
      .cd-modal::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 3px;
        background: linear-gradient(90deg, transparent, var(--gold, #D4AF37), transparent);
        opacity: 0.8;
      }

      /* Header */
      .cd-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        margin-bottom: 1rem;
        position: relative;
        z-index: 1;
      }
      .cd-icon {
        width: 52px;
        height: 52px;
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid;
        position: relative;
        animation: cd-icon-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both;
      }
      @keyframes cd-icon-pop {
        from { transform: scale(0); }
        to { transform: scale(1); }
      }
      .cd-icon::after {
        content: '';
        position: absolute;
        inset: -4px;
        border-radius: 18px;
        border: 1px dashed currentColor;
        opacity: 0.3;
        animation: cd-spin 20s linear infinite;
      }
      .cd-close {
        width: 30px;
        height: 30px;
        border-radius: 8px;
        background: var(--background);
        border: 1px solid var(--border);
        color: var(--text-muted);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s;
        padding: 0;
      }
      .cd-close:hover:not(:disabled) {
        background: var(--gold-soft, #FDFBF7);
        color: var(--gold, #D4AF37);
        border-color: var(--gold, #D4AF37);
        transform: rotate(90deg);
      }
      .cd-close:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      /* Body */
      .cd-body {
        margin-bottom: 1.5rem;
        position: relative;
        z-index: 1;
      }
      .cd-title {
        font-family: 'Playfair Display', Georgia, serif;
        font-size: 1.25rem;
        font-weight: 800;
        color: var(--text-main);
        line-height: 1.3;
        margin-bottom: 0.5rem;
        letter-spacing: -0.01em;
      }
      .cd-desc {
        font-size: 0.88rem;
        color: var(--text-muted);
        line-height: 1.6;
      }
      .cd-desc strong {
        color: var(--text-main);
        font-weight: 700;
      }

      /* Footer */
      .cd-footer {
        display: flex;
        gap: 0.6rem;
        justify-content: flex-end;
        position: relative;
        z-index: 1;
      }
      .cd-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.4rem;
        padding: 0.65rem 1.2rem;
        border-radius: 10px;
        font-size: 0.85rem;
        font-weight: 700;
        font-family: inherit;
        border: 1.5px solid;
        cursor: pointer;
        transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        white-space: nowrap;
        position: relative;
        overflow: hidden;
      }
      .cd-btn::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,.3), transparent);
        transform: translateX(-100%);
        transition: transform 0.6s ease;
        pointer-events: none;
      }
      .cd-btn:hover::before {
        transform: translateX(100%);
      }
      .cd-btn > * {
        position: relative;
        z-index: 1;
      }

      .cd-btn-cancel {
        background: var(--background);
        color: var(--text-main);
        border-color: var(--border);
      }
      .cd-btn-cancel:hover:not(:disabled) {
        background: var(--surface);
        border-color: var(--text-muted);
        transform: translateY(-1px);
      }

      .cd-btn-danger {
        background: linear-gradient(135deg, #EF4444 0%, #B91C1C 100%);
        color: white;
        border-color: transparent;
        box-shadow: 0 4px 14px -4px rgba(239, 68, 68, 0.5);
      }
      .cd-btn-danger:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px -6px rgba(239, 68, 68, 0.6);
        filter: brightness(1.1);
      }

      .cd-btn-warning {
        background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
        color: white;
        border-color: transparent;
        box-shadow: 0 4px 14px -4px rgba(245, 158, 11, 0.5);
      }
      .cd-btn-warning:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px -6px rgba(245, 158, 11, 0.6);
        filter: brightness(1.1);
      }

      .cd-btn-info {
        background: linear-gradient(135deg, var(--gold, #D4AF37) 0%, var(--maroon-light, #B91C1C) 100%);
        color: white;
        border-color: transparent;
        box-shadow: 0 4px 14px -4px rgba(212, 175, 55, 0.5);
      }
      .cd-btn-info:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px -6px rgba(212, 175, 55, 0.6);
        filter: brightness(1.1);
      }

      .cd-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }

      .cd-spin {
        animation: cd-spin 0.8s linear infinite;
      }
      @keyframes cd-spin {
        to { transform: rotate(360deg); }
      }

      /* Mobile */
      @media (max-width: 480px) {
        .cd-modal {
          padding: 1.25rem;
          border-radius: 16px;
        }
        .cd-footer {
          flex-direction: column-reverse;
        }
        .cd-footer .cd-btn {
          width: 100%;
        }
      }
    `}</style>
  );
}