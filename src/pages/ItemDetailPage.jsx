import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, Printer, Box, Info, Layers, Pencil,
  ChevronRight, Activity, PackageSearch, Trash2, Plus,
  Home, MapPin, Tag, TrendingUp, CheckCircle2,
  AlertTriangle, Sparkles, QrCode, FileText, BarChart3,
  ArrowUpRight, Hash, Boxes
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../stores/authStore";
import UnitTable from "../components/items/UnitTable";
import StockOutForm from "../components/items/StockOutForm";
import StockInForm from "../components/items/StockInForm";
import ItemForm from "../components/items/ItemForm"; // Pastikan path ini benar

const CONDITION_META = {
  baik:         { label: "Baik",          color: "#10B981", bg: "rgba(16,185,129,0.12)" },
  rusak_ringan: { label: "Rusak Ringan",  color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
  rusak_berat:  { label: "Rusak Berat",   color: "#EF4444", bg: "rgba(239,68,68,0.12)" },
};

export default function ItemDetailPage() {
  const { id } = useParams();
  const { hasRole } = useAuthStore();
  const canWrite = hasRole("super_admin", "admin");

  const [item, setItem] = useState(null);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("units");
  const [showStockOut, setShowStockOut] = useState(false);
  const [showStockIn, setShowStockIn] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 30);
    return () => clearTimeout(t);
  }, []);

  const fetchItemData = async () => {
    setLoading(true);
    try {
      const { data: itemData, error: itemErr } = await supabase
        .from("items")
        .select(`*, category:categories(name), location:locations(name)`)
        .eq("id", id)
        .single();

      if (itemErr) throw itemErr;
      setItem(itemData);

      const { data: unitData } = await supabase
        .from("item_units")
        .select("*")
        .eq("item_id", id)
        .order("unit_number", { ascending: true });

      setUnits(unitData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItemData();
  }, [id]);

  // ── Statistik ──
  const stats = useMemo(() => {
    const totalUnit = units.length;
    const baik = units.filter(u => u.condition === "baik").length;
    const rusakRingan = units.filter(u => u.condition === "rusak_ringan").length;
    const rusakBerat = units.filter(u => u.condition === "rusak_berat").length;
    const persenBaik = totalUnit === 0 ? 0 : Math.round((baik / totalUnit) * 100);
    return { totalUnit, baik, rusakRingan, rusakBerat, persenBaik };
  }, [units]);

  // ── Skeleton ──
  if (loading) {
    return (
      <div className="mc-item">
        <ItemStyles />
        <div className="mc-skel-breadcrumb" />
        <div className="mc-skel-hero" />
        <div className="mc-skel-tabs" />
        <div className="mc-skel-table" />
      </div>
    );
  }

  // ── Empty state ──
  if (!item) {
    return (
      <div className="mc-item">
        <ItemStyles />
        <div className="mc-item-empty">
          <div className="mc-item-empty-icon">
            <PackageSearch size={40} />
          </div>
          <h2 className="mc-item-empty-title">Barang Tidak Ditemukan</h2>
          <p className="mc-item-empty-sub">
            Data barang mungkin sudah dihapus atau ID tidak valid.
          </p>
          <Link to="/items" className="mc-btn-primary">
            <ArrowLeft size={16} /> Kembali ke Daftar
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`mc-item ${mounted ? "is-mounted" : ""}`}>
      <ItemStyles />

      {/* ================= 1. TOP NAV ================= */}
      <div className="mc-top-nav">
        <nav className="mc-breadcrumb">
          <Link to="/items" className="mc-breadcrumb-link">
            <Home size={14} /> Inventaris
          </Link>
          <ChevronRight size={14} className="mc-breadcrumb-sep" />
          <span className="mc-breadcrumb-current">{item.name}</span>
        </nav>

        <div className="mc-action-bar">
          {/* ✅ TOMBOL EDIT BARANG BARU */}
          {canWrite && (
            <button onClick={() => setShowEdit(true)} className="mc-btn-secondary">
              <Pencil size={16} /> Edit Barang
            </button>
          )}

          {canWrite && (
            <button onClick={() => setShowStockIn(true)} className="mc-btn-primary">
              <Plus size={16} /> Tambah Stok
            </button>
          )}
          {canWrite && units.length > 0 && (
            <button onClick={() => setShowStockOut(true)} className="mc-btn-danger">
              <Trash2 size={16} /> Kurangi
            </button>
          )}
          <Link
            to={`/print?item_id=${item.id}`}
            target="_blank"
            className="mc-btn-secondary"
          >
            <QrCode size={16} /> Cetak QR
          </Link>
          <Link to="/items" className="mc-btn-ghost">
            <ArrowLeft size={16} /> Kembali
          </Link>
        </div>
      </div>

      {/* ================= 2. HERO ================= */}
      <div className="mc-hero">
        <div className="mc-hero-bg">
          <div className="mc-hero-glow-1" />
          <div className="mc-hero-glow-2" />
          <div className="mc-hero-grid" />
        </div>

        <div className="mc-hero-inner">
          {/* Kiri: info utama */}
          <div className="mc-hero-main">
            <div className="mc-hero-eyebrow">
              <Sparkles size={12} /> Detail Barang
            </div>

            <div className="mc-hero-chips">
              <span className="mc-hero-chip">
                <Tag size={12} /> {item.category?.name || "Tanpa Kategori"}
              </span>
              <span className="mc-hero-chip">
                <MapPin size={12} /> {item.location?.name || "Tanpa Lokasi"}
              </span>
            </div>

            <h1 className="mc-hero-title">{item.name}</h1>

            {item.notes && (
              <div className="mc-hero-notes">
                <Info size={16} className="mc-hero-notes-icon" />
                <div>
                  <span className="mc-hero-notes-label">Catatan:</span>{" "}
                  <span className="mc-hero-notes-text">{item.notes}</span>
                </div>
              </div>
            )}
          </div>

          {/* Kanan: stat cards */}
          <div className="mc-hero-stats">
            {/* Total Unit */}
            <div className="mc-stat-box">
              <div className="mc-stat-box-head">
                <span className="mc-stat-box-icon neutral">
                  <Box size={16} />
                </span>
                <p className="mc-stat-box-lbl">Total Unit</p>
              </div>
              <p className="mc-stat-box-val">{stats.totalUnit}</p>
              <p className="mc-stat-box-hint">unit fisik terdaftar</p>
            </div>

            {/* Kondisi Baik */}
            <div className="mc-stat-box">
              <div className="mc-stat-box-head">
                <span className="mc-stat-box-icon good">
                  <CheckCircle2 size={16} />
                </span>
                <p className="mc-stat-box-lbl">Kondisi Baik</p>
                <span className="mc-stat-box-pct">{stats.persenBaik}%</span>
              </div>
              <p className="mc-stat-box-val">{stats.baik}</p>
              <div className="mc-progress">
                <div
                  className="mc-progress-fill"
                  style={{
                    width: `${stats.persenBaik}%`,
                    background: stats.persenBaik >= 70
                      ? "linear-gradient(90deg, #10B981, #34D399)"
                      : stats.persenBaik >= 40
                      ? "linear-gradient(90deg, #F59E0B, #FBBF24)"
                      : "linear-gradient(90deg, #EF4444, #F87171)",
                  }}
                />
              </div>
              <div className="mc-stat-box-breakdown">
                <span className="mc-bd-item">
                  <span className="mc-bd-dot warning" /> {stats.rusakRingan} ringan
                </span>
                <span className="mc-bd-item">
                  <span className="mc-bd-dot danger" /> {stats.rusakBerat} berat
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= 3. TABS ================= */}
      <div className="mc-tabs">
        <button
          onClick={() => setActiveTab("units")}
          className={`mc-tab ${activeTab === "units" ? "is-active" : ""}`}
        >
          <Boxes size={16} /> Daftar Fisik Unit
          <span className="mc-tab-badge">{units.length}</span>
        </button>
        <button
          onClick={() => setActiveTab("info")}
          className={`mc-tab ${activeTab === "info" ? "is-active" : ""}`}
        >
          <Activity size={16} /> Riwayat Induk
        </button>
      </div>

      {/* ================= 4. KONTEN TAB ================= */}
      <div className="mc-tab-content">
        {activeTab === "units" && (
          <div className="mc-tab-inner">
            <UnitTable units={units} onRefresh={fetchItemData} canWrite={canWrite} />
          </div>
        )}

        {activeTab === "info" && (
          <div className="mc-empty-tab">
            <div className="mc-empty-tab-icon">
              <Activity size={36} />
            </div>
            <h3 className="mc-empty-tab-title">Riwayat Induk Barang</h3>
            <p className="mc-empty-tab-sub">
              Perubahan data induk (Nama, Kategori, Lokasi) tercatat secara otomatis di sistem audit global.
            </p>
            <Link to="/activity" className="mc-btn-primary">
              <BarChart3 size={16} /> Lihat Halaman Aktivitas
            </Link>
          </div>
        )}
      </div>

      {/* ================= MODALS ================= */}
      {showStockOut && (
        <StockOutForm
          item={item}
          onClose={() => setShowStockOut(false)}
          onSuccess={fetchItemData}
        />
      )}
      {showStockIn && (
        <StockInForm
          item={item}
          locationName={item.location?.name}
          onClose={() => setShowStockIn(false)}
          onSuccess={fetchItemData}
        />
      )}

      {/* ✅ MODAL EDIT BARANG */}
      {showEdit && (
        <ItemForm
          item={item}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false);
            fetchItemData(); // Refresh data setelah disimpan
          }}
        />
      )}
    </div>
  );
}

/* ============================================================
   Styles
============================================================ */
function ItemStyles() {
  return (
    <style>{`
      /* ============ CONTAINER ============ */
      .mc-item {
        width: 100%;
        max-width: 100%;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        padding-bottom: 3rem;
        position: relative;
      }
      .mc-item > * {
        opacity: 0;
        transform: translateY(14px);
        transition: opacity 0.5s var(--ease-out, cubic-bezier(0.16,1,0.3,1)),
                    transform 0.5s var(--ease-out, cubic-bezier(0.16,1,0.3,1));
      }
      .mc-item.is-mounted > * { opacity: 1; transform: translateY(0); }
      .mc-item.is-mounted > *:nth-child(1) { transition-delay: 0s; }
      .mc-item.is-mounted > *:nth-child(2) { transition-delay: 0.08s; }
      .mc-item.is-mounted > *:nth-child(3) { transition-delay: 0.16s; }
      .mc-item.is-mounted > *:nth-child(4) { transition-delay: 0.24s; }

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
        font-size: 0.85rem;
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
        color: var(--gold);
        background: var(--gold-soft);
      }
      .mc-breadcrumb-sep { color: var(--text-muted); opacity: 0.5; }
      .mc-breadcrumb-current {
        font-weight: 700;
        color: var(--text-main);
        padding: 0.35rem 0.55rem;
        max-width: 280px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .mc-action-bar {
        display: flex; flex-wrap: wrap; gap: 0.5rem;
      }

      /* ============ BUTTONS ============ */
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
        transition: all 0.25s var(--ease-spring, cubic-bezier(0.34,1.56,0.64,1));
        white-space: nowrap;
        font-family: inherit;
        position: relative;
        overflow: hidden;
      }
      .mc-btn-primary::before,
      .mc-btn-secondary::before {
        content: '';
        position: absolute; inset: 0;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
        transform: translateX(-100%);
        transition: transform 0.6s ease;
        pointer-events: none;
      }
      .mc-btn-primary:hover::before,
      .mc-btn-secondary:hover::before { transform: translateX(100%); }

      .mc-btn-primary {
        background: linear-gradient(135deg, var(--gold) 0%, var(--maroon-light) 100%);
        color: white;
        box-shadow: 0 4px 16px -4px color-mix(in srgb, var(--gold) 50%, transparent);
      }
      .mc-btn-primary svg { color: white !important; stroke: white !important; }
      .mc-btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 12px 28px -6px color-mix(in srgb, var(--gold) 60%, transparent);
        filter: brightness(1.1);
      }

      .mc-btn-danger {
        background: var(--surface);
        color: #EF4444;
        border-color: rgba(239,68,68,0.3);
      }
      .mc-btn-danger:hover {
        background: rgba(239,68,68,0.08);
        border-color: #EF4444;
        transform: translateY(-1px);
      }

      .mc-btn-secondary {
        background: var(--surface);
        color: var(--text-main);
        border-color: var(--border);
      }
      .mc-btn-secondary:hover {
        background: var(--gold-soft);
        border-color: color-mix(in srgb, var(--gold) 50%, var(--border));
        color: var(--gold);
        transform: translateY(-1px);
      }
      .mc-btn-secondary:hover svg { color: var(--gold); }

      .mc-btn-ghost {
        background: transparent;
        color: var(--text-muted);
        border-color: transparent;
      }
      .mc-btn-ghost:hover {
        background: var(--background);
        color: var(--text-main);
      }

      /* ============ HERO ============ */
      .mc-hero {
        position: relative;
        background: linear-gradient(135deg, #16213E 0%, #0F172A 55%, #7F1D1D 100%);
        border: 1px solid var(--border);
        border-radius: 24px;
        overflow: hidden;
        box-shadow: 0 20px 40px -12px rgba(22, 33, 62, 0.4);
        isolation: isolate;
      }

      .mc-hero-bg { position: absolute; inset: 0; pointer-events: none; }
      .mc-hero-glow-1 {
        position: absolute;
        top: -50%; right: -10%;
        width: 420px; height: 420px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(212,175,55,0.28) 0%, transparent 70%);
        filter: blur(40px);
        animation: hero-float 8s ease-in-out infinite;
      }
      .mc-hero-glow-2 {
        position: absolute;
        bottom: -60%; left: -10%;
        width: 380px; height: 380px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(185,28,28,0.25) 0%, transparent 70%);
        filter: blur(50px);
        animation: hero-float 10s ease-in-out infinite reverse;
      }
      @keyframes hero-float {
        0%, 100% { transform: translate(0, 0) scale(1); }
        50% { transform: translate(-20px, 20px) scale(1.1); }
      }
      .mc-hero-grid {
        position: absolute; inset: 0;
        background-image:
          linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
        background-size: 40px 40px;
        mask-image: radial-gradient(ellipse at 70% 30%, black 20%, transparent 60%);
        -webkit-mask-image: radial-gradient(ellipse at 70% 30%, black 20%, transparent 60%);
      }

      .mc-hero-inner {
        position: relative; z-index: 2;
        padding: 2rem 2.5rem;
        display: flex; flex-direction: column;
        gap: 1.75rem;
        color: white;
      }
      @media (min-width: 1024px) {
        .mc-hero-inner { flex-direction: row; align-items: center; justify-content: space-between; }
      }
      @media (max-width: 640px) {
        .mc-hero-inner { padding: 1.5rem; }
      }

      .mc-hero-main { flex: 1; min-width: 0; }
      .mc-hero-eyebrow {
        display: inline-flex; align-items: center; gap: 0.35rem;
        font-size: 0.68rem; font-weight: 700;
        color: #FDE68A;
        background: rgba(212, 175, 55, 0.15);
        border: 1px solid rgba(212, 175, 55, 0.3);
        padding: 0.3rem 0.7rem;
        border-radius: 999px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin-bottom: 0.9rem;
      }

      .mc-hero-chips {
        display: flex; flex-wrap: wrap; gap: 0.5rem;
        margin-bottom: 0.9rem;
      }
      .mc-hero-chip {
        display: inline-flex; align-items: center; gap: 0.35rem;
        font-size: 0.74rem; font-weight: 600;
        color: white;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        padding: 0.3rem 0.7rem;
        border-radius: 999px;
        backdrop-filter: blur(6px);
      }
      .mc-hero-chip svg { color: #D4AF37; }

      .mc-hero-title {
        font-family: 'Playfair Display', Georgia, serif;
        font-size: 2.1rem;
        font-weight: 800;
        color: white;
        letter-spacing: -0.025em;
        line-height: 1.15;
        margin-bottom: 1rem;
      }
      @media (min-width: 768px) { .mc-hero-title { font-size: 2.6rem; } }
      @media (max-width: 640px) { .mc-hero-title { font-size: 1.65rem; } }

      .mc-hero-notes {
        display: flex; align-items: flex-start; gap: 0.6rem;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.12);
        padding: 0.75rem 1rem;
        border-radius: 12px;
        max-width: 640px;
        font-size: 0.85rem;
        line-height: 1.5;
        color: rgba(255,255,255,0.85);
        backdrop-filter: blur(6px);
      }
      .mc-hero-notes-icon { flex-shrink: 0; margin-top: 2px; color: #D4AF37; }
      .mc-hero-notes-label { font-weight: 700; color: white; }
      .mc-hero-notes-text { color: rgba(255,255,255,0.75); }

      /* Stat boxes */
      .mc-hero-stats {
        display: grid;
        grid-template-columns: 1fr;
        gap: 0.75rem;
        width: 100%;
      }
      @media (min-width: 480px) { .mc-hero-stats { grid-template-columns: 1fr 1.5fr; } }
      @media (min-width: 1024px) { .mc-hero-stats { width: auto; min-width: 380px; } }

      .mc-stat-box {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 16px;
        padding: 1.1rem 1.2rem;
        transition: all 0.3s var(--ease-spring, cubic-bezier(0.34,1.56,0.64,1));
        backdrop-filter: blur(10px);
      }
      .mc-stat-box:hover {
        border-color: rgba(212, 175, 55, 0.5);
        transform: translateY(-3px);
        box-shadow: 0 12px 28px -8px rgba(0,0,0,0.25);
        background: rgba(255, 255, 255, 0.12);
      }
      .mc-stat-box-head {
        display: flex; align-items: center; gap: 0.45rem;
        margin-bottom: 0.5rem;
      }
      .mc-stat-box-icon {
        width: 28px; height: 28px;
        border-radius: 8px;
        display: flex; align-items: center; justify-content: center;
        transition: transform 0.3s;
      }
      .mc-stat-box:hover .mc-stat-box-icon { transform: scale(1.1) rotate(-4deg); }
      .mc-stat-box-icon.neutral {
        background: rgba(255,255,255,0.12);
        color: #FDE68A;
        border: 1px solid rgba(255,255,255,0.2);
      }
      .mc-stat-box-icon.good {
        background: rgba(16,185,129,0.2);
        color: #6EE7B7;
        border: 1px solid rgba(16,185,129,0.3);
      }
      .mc-stat-box-lbl {
        font-size: 0.7rem; font-weight: 700;
        color: rgba(255,255,255,0.7);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .mc-stat-box-pct {
        margin-left: auto;
        font-size: 0.78rem; font-weight: 800;
        color: #6EE7B7;
      }
      .mc-stat-box-val {
        font-family: 'Playfair Display', Georgia, serif;
        font-size: 2rem; font-weight: 800;
        color: white;
        letter-spacing: -0.03em;
        line-height: 1.1;
        font-variant-numeric: tabular-nums;
        margin-bottom: 0.5rem;
      }
      .mc-stat-box-hint { font-size: 0.72rem; color: rgba(255,255,255,0.6); }
      .mc-progress {
        width: 100%;
        height: 6px;
        background: rgba(255,255,255,0.15);
        border-radius: 3px;
        overflow: hidden;
        margin-bottom: 0.6rem;
      }
      .mc-progress-fill {
        height: 100%;
        border-radius: 3px;
        transition: width 1s var(--ease-out, cubic-bezier(0.16,1,0.3,1));
      }
      .mc-stat-box-breakdown {
        display: flex; gap: 0.6rem;
        font-size: 0.7rem;
        color: rgba(255,255,255,0.7);
        font-weight: 600;
      }
      .mc-bd-item { display: inline-flex; align-items: center; gap: 0.3rem; }
      .mc-bd-dot { width: 7px; height: 7px; border-radius: 50%; }
      .mc-bd-dot.warning { background: #FBBF24; }
      .mc-bd-dot.danger { background: #F87171; }

      /* ============ TABS ============ */
      .mc-tabs {
        display: flex; gap: 0.25rem;
        border-bottom: 1.5px solid var(--border);
        overflow-x: auto;
        scrollbar-width: none;
      }
      .mc-tabs::-webkit-scrollbar { display: none; }
      .mc-tab {
        display: inline-flex; align-items: center; gap: 0.4rem;
        padding: 0.75rem 1.1rem;
        background: transparent;
        border: none;
        border-bottom: 2px solid transparent;
        font-size: 0.85rem; font-weight: 700;
        color: var(--text-muted);
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
        margin-bottom: -1.5px;
        font-family: inherit;
      }
      .mc-tab:hover { color: var(--text-main); }
      .mc-tab.is-active {
        color: var(--gold);
        border-bottom-color: var(--gold);
      }
      .mc-tab-badge {
        display: inline-flex; align-items: center; justify-content: center;
        min-width: 20px; height: 20px;
        padding: 0 0.35rem;
        border-radius: 999px;
        background: var(--background);
        border: 1px solid var(--border);
        font-size: 0.68rem; font-weight: 800;
        color: var(--text-main);
        transition: all 0.2s;
      }
      .mc-tab.is-active .mc-tab-badge {
        background: linear-gradient(135deg, var(--gold) 0%, var(--maroon-light) 100%);
        color: white;
        border-color: var(--gold);
        box-shadow: 0 2px 8px -2px color-mix(in srgb, var(--gold) 50%, transparent);
      }

      /* ============ TAB CONTENT ============ */
      .mc-tab-content { animation: content-in 0.35s ease; }
      @keyframes content-in {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .mc-tab-inner { animation: content-in 0.5s var(--ease-out, cubic-bezier(0.16,1,0.3,1)); }

      /* ============ EMPTY TAB ============ */
      .mc-empty-tab {
        background: var(--surface);
        border: 1.5px dashed var(--border);
        border-radius: 18px;
        padding: 3rem 1.5rem;
        text-align: center;
        display: flex; flex-direction: column; align-items: center;
        gap: 0.75rem;
        position: relative;
        overflow: hidden;
      }
      .mc-empty-tab::before {
        content: '';
        position: absolute;
        top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        width: 300px; height: 300px;
        background: radial-gradient(circle, color-mix(in srgb, var(--gold) 15%, transparent) 0%, transparent 70%);
        filter: blur(40px);
        pointer-events: none;
      }
      .mc-empty-tab-icon {
        position: relative; z-index: 1;
        width: 72px; height: 72px;
        border-radius: 50%;
        background: var(--background);
        border: 1px solid var(--border);
        color: var(--text-muted);
        display: flex; align-items: center; justify-content: center;
        margin-bottom: 0.5rem;
        animation: icon-float 3s ease-in-out infinite;
      }
      @keyframes icon-float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-6px); }
      }
      .mc-empty-tab-title {
        position: relative; z-index: 1;
        font-family: 'Playfair Display', Georgia, serif;
        font-size: 1.15rem; font-weight: 700;
        color: var(--text-main);
      }
      .mc-empty-tab-sub {
        position: relative; z-index: 1;
        font-size: 0.88rem;
        color: var(--text-muted);
        max-width: 400px;
        line-height: 1.6;
        margin-bottom: 0.5rem;
      }

      /* ============ FULL EMPTY ============ */
      .mc-item-empty {
        padding: 4rem 1.5rem;
        text-align: center;
        display: flex; flex-direction: column; align-items: center;
        gap: 0.75rem;
        min-height: 60vh;
        justify-content: center;
      }
      .mc-item-empty-icon {
        width: 96px; height: 96px;
        border-radius: 50%;
        background: var(--gold-soft);
        border: 1px solid color-mix(in srgb, var(--gold) 40%, transparent);
        color: var(--gold);
        display: flex; align-items: center; justify-content: center;
        margin-bottom: 0.75rem;
        animation: icon-float 3s ease-in-out infinite;
      }
      .mc-item-empty-title {
        font-family: 'Playfair Display', Georgia, serif;
        font-size: 1.5rem; font-weight: 800;
        color: var(--text-main);
        letter-spacing: -0.02em;
      }
      .mc-item-empty-sub {
        font-size: 0.9rem;
        color: var(--text-muted);
        max-width: 340px;
        margin-bottom: 0.5rem;
      }

      /* ============ SKELETON ============ */
      .mc-skel-breadcrumb {
        height: 32px; width: 240px;
        background: var(--border);
        border-radius: 8px;
        animation: pulse 1.6s ease-in-out infinite;
      }
      .mc-skel-hero {
        height: 260px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 24px;
        animation: pulse 1.6s ease-in-out infinite;
      }
      .mc-skel-tabs {
        height: 48px; width: 320px;
        background: var(--border);
        border-radius: 8px;
        animation: pulse 1.6s ease-in-out infinite;
      }
      .mc-skel-table {
        height: 300px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 18px;
        animation: pulse 1.6s ease-in-out infinite;
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      @media (max-width: 640px) {
        .mc-hero-title { font-size: 1.65rem; }
        .mc-stat-box-val { font-size: 1.65rem; }
        .mc-breadcrumb-current { max-width: 160px; }
      }
    `}</style>
  );
}