import { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, MapPin, Tag, History, ShieldAlert, 
  CheckCircle2, Trash2, Plus, Sparkles, QrCode,
  Box, Home, ChevronRight, AlertTriangle, 
  Clock, XCircle, Wrench, PackageX, Info
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../stores/authStore";
import UnitHistory from "../components/items/UnitHistory";
import DeleteUnitModal from "../components/items/DeleteUnitModal";
import AddUnitModal from "../components/items/AddUnitModal";

const conditionMeta = {
  baik: { label: "Baik", color: "#10B981", bg: "rgba(16,185,129,0.1)", icon: CheckCircle2 },
  rusak_ringan: { label: "Rusak Ringan", color: "#F59E0B", bg: "rgba(245,158,11,0.1)", icon: AlertTriangle },
  rusak_berat: { label: "Rusak Berat", color: "#EF4444", bg: "rgba(239,68,68,0.1)", icon: XCircle },
};

const statusMeta = {
  active: { label: "Aktif", color: "#3B82F6", bg: "rgba(59,130,246,0.1)", icon: CheckCircle2 },
  rusak: { label: "Rusak", color: "#EF4444", bg: "rgba(239,68,68,0.1)", icon: XCircle },
  hilang: { label: "Hilang", color: "#6B7280", bg: "rgba(107,114,128,0.1)", icon: PackageX },
  dipinjam: { label: "Dipinjam", color: "#F59E0B", bg: "rgba(245,158,11,0.1)", icon: Clock },
  maintenance: { label: "Perbaikan", color: "#EAB308", bg: "rgba(234,179,8,0.1)", icon: Wrench },
};

export default function UnitDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuthStore();
  const canWrite = hasRole("super_admin", "admin");

  const [unit, setUnit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [lastUnitNumber, setLastUnitNumber] = useState(0);

  const fetchUnit = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("item_units")
      .select(`
        *,
        item:items(
          id, name, notes,
          category:categories(name),
          location:locations(name)
        )
      `)
      .eq("id", id)
      .single();

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }
    setUnit(data);

    const { data: lastUnit } = await supabase
      .from("item_units")
      .select("unit_number")
      .eq("item_id", data.item_id)
      .order("unit_number", { ascending: false })
      .limit(1);

    if (lastUnit && lastUnit.length > 0) setLastUnitNumber(lastUnit[0].unit_number);
    setLoading(false);
  };

  useEffect(() => {
    fetchUnit();
  }, [id]);

  const condition = unit ? conditionMeta[unit.condition] || conditionMeta.baik : null;
  const status = unit ? statusMeta[unit.status] || statusMeta.active : null;

  // ── Skeleton ──
  if (loading) {
    return (
      <div className="mc-unit max-w-5xl mx-auto space-y-6 pb-10 animate-fade-in">
        <UnitStyles />
        <div className="mc-skel-nav" />
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-4">
            <div className="mc-skel-qr" />
          </div>
          <div className="md:col-span-8 space-y-4">
            <div className="mc-skel-info" />
            <div className="grid grid-cols-2 gap-4">
              <div className="mc-skel-status" />
              <div className="mc-skel-status" />
            </div>
          </div>
        </div>
        <div className="mc-skel-timeline" />
      </div>
    );
  }

  // ── Not found ──
  if (!unit) {
    return (
      <div className="mc-unit max-w-5xl mx-auto pb-12 animate-fade-in">
        <UnitStyles />
        <div className="mc-empty">
          <div className="mc-empty-icon">
            <PackageX size={40} />
          </div>
          <h2 className="mc-empty-title">Unit Tidak Ditemukan</h2>
          <p className="mc-empty-sub">
            Data unit mungkin sudah dihapus atau ID tidak valid.
          </p>
          <Link to="/items" className="mc-btn-primary">
            <ArrowLeft size={16} /> Kembali ke Daftar
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mc-unit max-w-5xl mx-auto space-y-6 pb-10 font-sans animate-fade-in">
      <UnitStyles />

      {/* ================= BREADCRUMB + ACTIONS ================= */}
      <div className="mc-top-nav">
        <nav className="mc-breadcrumb">
          <Link to="/items" className="mc-breadcrumb-link">
            <Home size={13} /> Inventaris
          </Link>
          <ChevronRight size={13} className="mc-breadcrumb-sep" />
          <Link to={`/items/${unit.item.id}`} className="mc-breadcrumb-link">
            {unit.item.name}
          </Link>
          <ChevronRight size={13} className="mc-breadcrumb-sep" />
          <span className="mc-breadcrumb-current">
            Unit #{unit.unit_number}
          </span>
        </nav>

        <div className="mc-action-bar">
          <Link to={`/items/${unit.item.id}`} className="mc-btn-ghost">
            <ArrowLeft size={15} /> Kembali
          </Link>
          {canWrite && (
            <>
              <button onClick={() => setShowAdd(true)} className="mc-btn-secondary">
                <Plus size={15} /> Tambah Unit
              </button>
              <button onClick={() => setShowDelete(true)} className="mc-btn-danger">
                <Trash2 size={15} /> Hapus
              </button>
            </>
          )}
        </div>
      </div>

      {/* ================= GRID: QR + INFO ================= */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* ── KIRI: KARTU QR ── */}
        <div className="md:col-span-4">
          <div className="mc-qr-card">
            <div className="mc-qr-header">
              <div className="mc-qr-header-glow" />
              <span className="mc-qr-badge">
                <QrCode size={11} /> Kode Unit
              </span>
              <div className="mc-qr-code-box">
                <QRCodeSVG value={unit.unit_code} size={150} level="M" />
              </div>
              <p className="mc-qr-code">{unit.unit_code}</p>
            </div>

            <div className="mc-qr-footer">
              <div>
                <p className="mc-qr-footer-lbl">Nomor Urut</p>
                <p className="mc-qr-footer-val">#{unit.unit_number}</p>
              </div>
              <div className="mc-qr-footer-icon">
                <Box size={18} />
              </div>
            </div>
          </div>
        </div>

        {/* ── KANAN: INFO + STATUS ── */}
        <div className="md:col-span-8 flex flex-col gap-4">
          {/* Info barang */}
          <div className="mc-info-card">
            <div className="mc-info-eyebrow">
              <Sparkles size={12} /> Informasi Barang
            </div>
            <h1 className="mc-info-title">{unit.item.name}</h1>

            <div className="mc-info-chips">
              <span className="mc-info-chip">
                <MapPin size={12} /> {unit.item.location?.name || "Tanpa Lokasi"}
              </span>
              <span className="mc-info-chip">
                <Tag size={12} /> {unit.item.category?.name || "Tanpa Kategori"}
              </span>
            </div>
          </div>

          {/* Status row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Kondisi */}
            <div className="mc-status-card">
              <div className="mc-status-head">
                <span
                  className="mc-status-icon"
                  style={{ background: condition.bg, color: condition.color }}
                >
                  <condition.icon size={14} />
                </span>
                <p className="mc-status-lbl">Kondisi Fisik</p>
              </div>
              <p
                className="mc-status-val"
                style={{ color: condition.color }}
              >
                {condition.label}
              </p>
            </div>

            {/* Status */}
            <div className="mc-status-card">
              <div className="mc-status-head">
                <span
                  className="mc-status-icon"
                  style={{ background: status.bg, color: status.color }}
                >
                  <status.icon size={14} />
                </span>
                <p className="mc-status-lbl">Status Unit</p>
              </div>
              <p
                className="mc-status-val"
                style={{ color: status.color }}
              >
                {status.label}
              </p>
            </div>
          </div>

          {/* Catatan */}
          {(unit.notes || unit.item.notes) && (
            <div className="mc-notes">
              <div className="mc-notes-icon">
                <Info size={16} />
              </div>
              <div className="mc-notes-body">
                {unit.notes && (
                  <p>
                    <strong>Catatan Unit:</strong> {unit.notes}
                  </p>
                )}
                {unit.item.notes && (
                  <p className="mc-notes-muted">
                    <strong>Catatan Induk:</strong> {unit.item.notes}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================= TIMELINE ================= */}
      <div className="mc-timeline-card">
        <div className="mc-timeline-head">
          <div>
            <h2 className="mc-timeline-title">
              <History size={18} /> Timeline Unit
            </h2>
            <p className="mc-timeline-sub">
              Riwayat lengkap perubahan pada unit <strong>#{unit.unit_number}</strong>
            </p>
          </div>
        </div>
        <UnitHistory unitId={unit.id} />
      </div>

      {/* ================= MODALS ================= */}
      {showDelete && (
        <DeleteUnitModal
          unit={unit}
          onClose={() => setShowDelete(false)}
          onSuccess={() => navigate(`/items/${unit.item.id}`)}
        />
      )}
      {showAdd && (
        <AddUnitModal
          item={unit.item}
          itemName={unit.item.name}
          locationName={unit.item.location?.name}
          lastUnitNumber={lastUnitNumber}
          onClose={() => setShowAdd(false)}
          onSuccess={fetchUnit}
        />
      )}
    </div>
  );
}

/* ============================================================
   Styles
============================================================ */
function UnitStyles() {
  return (
    <style>{`
      /* ============ TOP NAV ============ */
      .mc-top-nav {
        display: flex; flex-direction: column;
        justify-content: space-between; gap: 0.75rem;
      }
      @media (min-width: 768px) {
        .mc-top-nav { flex-direction: row; align-items: center; }
      }

      .mc-breadcrumb {
        display: flex; align-items: center;
        gap: 0.35rem;
        font-size: 0.82rem;
        font-weight: 500;
        flex-wrap: wrap;
      }
      .mc-breadcrumb-link {
        display: inline-flex; align-items: center; gap: 0.3rem;
        color: var(--text-muted);
        text-decoration: none;
        padding: 0.35rem 0.55rem;
        border-radius: 8px;
        transition: all 0.2s;
      }
      .mc-breadcrumb-link:hover {
        color: var(--accent);
        background: var(--accent-soft);
      }
      .mc-breadcrumb-sep { color: var(--text-muted); opacity: 0.4; }
      .mc-breadcrumb-current {
        font-weight: 700;
        color: var(--text-main);
        padding: 0.35rem 0.55rem;
      }

      .mc-action-bar { display: flex; flex-wrap: wrap; gap: 0.5rem; }

      .mc-btn-primary, .mc-btn-secondary, .mc-btn-ghost, .mc-btn-danger {
        display: inline-flex; align-items: center; justify-content: center;
        gap: 0.4rem;
        padding: 0.6rem 1rem;
        border-radius: 10px;
        font-size: 0.82rem;
        font-weight: 700;
        text-decoration: none;
        border: 1.5px solid transparent;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        white-space: nowrap;
      }
      .mc-btn-primary {
        background: var(--accent); color: white;
        box-shadow: 0 4px 12px -2px rgba(185,28,28,0.3);
      }
      .mc-btn-primary:hover {
        background: var(--accent-hover);
        transform: translateY(-1px);
        box-shadow: 0 8px 20px -4px rgba(185,28,28,0.4);
      }
      .mc-btn-secondary {
        background: var(--surface);
        color: var(--text-main);
        border-color: var(--border);
      }
      .mc-btn-secondary:hover {
        background: var(--background);
        border-color: var(--accent-border);
        color: var(--accent);
      }
      .mc-btn-danger {
        background: var(--surface);
        color: #EF4444;
        border-color: rgba(239,68,68,0.3);
      }
      .mc-btn-danger:hover {
        background: rgba(239,68,68,0.08);
        border-color: #EF4444;
      }
      .mc-btn-ghost {
        background: transparent;
        color: var(--text-muted);
        border-color: transparent;
      }
      .mc-btn-ghost:hover {
        background: var(--background);
        color: var(--text-main);
      }

      /* ============ QR CARD ============ */
      .mc-qr-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 20px;
        overflow: hidden;
        box-shadow: 0 4px 20px -8px rgba(0,0,0,0.1);
      }

      .mc-qr-header {
        background: linear-gradient(135deg, var(--accent) 0%, #7F1D1D 100%);
        padding: 1.5rem;
        display: flex; flex-direction: column; align-items: center;
        position: relative;
        overflow: hidden;
      }
      .mc-qr-header-glow {
        position: absolute;
        top: -40%; right: -20%;
        width: 200px; height: 200px;
        background: radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%);
        filter: blur(30px);
        animation: hero-float 8s ease-in-out infinite;
        pointer-events: none;
      }
      @keyframes hero-float {
        0%, 100% { transform: translate(0, 0) scale(1); }
        50% { transform: translate(-15px, 15px) scale(1.1); }
      }

      .mc-qr-badge {
        display: inline-flex; align-items: center; gap: 0.35rem;
        background: rgba(255,255,255,0.15);
        border: 1px solid rgba(255,255,255,0.2);
        backdrop-filter: blur(6px);
        color: white;
        font-size: 0.66rem; font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        padding: 0.3rem 0.65rem;
        border-radius: 999px;
        margin-bottom: 0.9rem;
        position: relative; z-index: 1;
      }

      .mc-qr-code-box {
        background: white;
        border-radius: 14px;
        padding: 10px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        margin-bottom: 0.75rem;
        position: relative; z-index: 1;
        transition: transform 0.3s;
      }
      .mc-qr-card:hover .mc-qr-code-box {
        transform: scale(1.03) rotate(-1deg);
      }

      .mc-qr-code {
        font-family: 'JetBrains Mono', 'Courier New', monospace;
        font-size: 1.05rem; font-weight: 800;
        color: white;
        letter-spacing: 0.05em;
        text-shadow: 0 1px 3px rgba(0,0,0,0.3);
        position: relative; z-index: 1;
        word-break: break-all;
        text-align: center;
        max-width: 100%;
      }

      .mc-qr-footer {
        padding: 1.1rem 1.5rem;
        display: flex; align-items: center; justify-content: space-between;
        background: var(--surface);
        border-top: 1px solid var(--border);
      }
      .mc-qr-footer-lbl {
        font-size: 0.66rem; font-weight: 700;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .mc-qr-footer-val {
        font-size: 1.85rem; font-weight: 800;
        color: var(--text-main);
        line-height: 1;
        letter-spacing: -0.03em;
        margin-top: 0.3rem;
        font-variant-numeric: tabular-nums;
      }
      .mc-qr-footer-icon {
        width: 40px; height: 40px;
        border-radius: 12px;
        background: var(--accent-soft);
        color: var(--accent);
        display: flex; align-items: center; justify-content: center;
        border: 1px solid var(--accent-border);
      }

      /* ============ INFO CARD ============ */
      .mc-info-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 18px;
        padding: 1.5rem;
        box-shadow: 0 1px 3px rgba(0,0,0,0.03);
      }
      .mc-info-eyebrow {
        display: inline-flex; align-items: center; gap: 0.35rem;
        font-size: 0.68rem; font-weight: 700;
        color: var(--accent);
        background: var(--accent-soft);
        border: 1px solid var(--accent-border);
        padding: 0.3rem 0.7rem;
        border-radius: 999px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin-bottom: 0.75rem;
      }
      .mc-info-title {
        font-size: 1.75rem; font-weight: 800;
        color: var(--text-main);
        letter-spacing: -0.02em;
        line-height: 1.15;
        margin-bottom: 1rem;
      }
      @media (min-width: 768px) {
        .mc-info-title { font-size: 2.1rem; }
      }
      .mc-info-chips {
        display: flex; flex-wrap: wrap; gap: 0.5rem;
      }
      .mc-info-chip {
        display: inline-flex; align-items: center; gap: 0.35rem;
        font-size: 0.78rem; font-weight: 600;
        color: var(--text-main);
        background: var(--background);
        border: 1px solid var(--border);
        padding: 0.4rem 0.75rem;
        border-radius: 8px;
      }
      .mc-info-chip svg { color: var(--accent); }

      /* ============ STATUS CARDS ============ */
      .mc-status-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 14px;
        padding: 1rem 1.15rem;
        transition: all 0.2s;
      }
      .mc-status-card:hover {
        border-color: var(--accent-border);
        transform: translateY(-1px);
        box-shadow: 0 6px 16px -6px rgba(0,0,0,0.08);
      }
      .mc-status-head {
        display: flex; align-items: center; gap: 0.5rem;
        margin-bottom: 0.6rem;
      }
      .mc-status-icon {
        width: 28px; height: 28px;
        border-radius: 8px;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
      }
      .mc-status-lbl {
        font-size: 0.68rem; font-weight: 700;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }
      .mc-status-val {
        font-size: 1.05rem; font-weight: 800;
        letter-spacing: -0.01em;
        line-height: 1.2;
      }

      /* ============ NOTES ============ */
      .mc-notes {
        display: flex; gap: 0.75rem;
        background: rgba(245,158,11,0.06);
        border: 1px solid rgba(245,158,11,0.25);
        border-radius: 14px;
        padding: 1rem 1.15rem;
      }
      .mc-notes-icon {
        flex-shrink: 0;
        width: 30px; height: 30px;
        border-radius: 8px;
        background: rgba(245,158,11,0.15);
        color: #D97706;
        display: flex; align-items: center; justify-content: center;
      }
      .mc-notes-body {
        flex: 1; min-width: 0;
        font-size: 0.85rem;
        line-height: 1.55;
        color: var(--text-main);
      }
      .mc-notes-body p { margin: 0 0 0.35rem 0; }
      .mc-notes-body p:last-child { margin-bottom: 0; }
      .mc-notes-body strong {
        color: var(--text-main);
        font-weight: 700;
      }
      .mc-notes-muted {
        color: var(--text-muted) !important;
        font-size: 0.8rem;
      }

      /* ============ TIMELINE ============ */
      .mc-timeline-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 18px;
        padding: 1.5rem;
        box-shadow: 0 1px 3px rgba(0,0,0,0.03);
      }
      .mc-timeline-head {
        display: flex; justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 1.25rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid var(--border);
      }
      .mc-timeline-title {
        display: flex; align-items: center; gap: 0.5rem;
        font-size: 1.05rem; font-weight: 800;
        color: var(--text-main);
        margin-bottom: 0.25rem;
      }
      .mc-timeline-title svg { color: var(--accent); }
      .mc-timeline-sub {
        font-size: 0.8rem;
        color: var(--text-muted);
      }
      .mc-timeline-sub strong {
        color: var(--text-main);
        font-weight: 700;
      }

      /* ============ EMPTY ============ */
      .mc-empty {
        padding: 4rem 1.5rem;
        text-align: center;
        display: flex; flex-direction: column; align-items: center;
        gap: 0.75rem;
        min-height: 60vh;
        justify-content: center;
      }
      .mc-empty-icon {
        width: 96px; height: 96px;
        border-radius: 50%;
        background: var(--accent-soft);
        border: 1px solid var(--accent-border);
        color: var(--accent);
        display: flex; align-items: center; justify-content: center;
        margin-bottom: 0.75rem;
      }
      .mc-empty-title {
        font-size: 1.5rem; font-weight: 800;
        color: var(--text-main);
        letter-spacing: -0.02em;
      }
      .mc-empty-sub {
        font-size: 0.9rem;
        color: var(--text-muted);
        max-width: 340px;
        margin-bottom: 0.5rem;
      }

      /* ============ SKELETON ============ */
      .mc-skel-nav {
        height: 32px; width: 300px;
        background: var(--border);
        border-radius: 8px;
        animation: pulse 1.6s ease-in-out infinite;
      }
      .mc-skel-qr {
        height: 320px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 20px;
        animation: pulse 1.6s ease-in-out infinite;
      }
      .mc-skel-info {
        height: 140px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 18px;
        animation: pulse 1.6s ease-in-out infinite;
      }
      .mc-skel-status {
        height: 90px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 14px;
        animation: pulse 1.6s ease-in-out infinite;
      }
      .mc-skel-timeline {
        height: 200px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 18px;
        animation: pulse 1.6s ease-in-out infinite;
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    `}</style>
  );
}