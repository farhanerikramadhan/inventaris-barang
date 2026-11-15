import { useEffect, useState, useMemo } from "react";
import {
  Plus, Trash2, Search, Tag, Layers,
  Sparkles, CheckCircle2, Package, X,
  Grid3x3, AlertCircle, PlusCircle, ArrowUpRight
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { logActivity } from "../utils/logActivity";
import ConfirmDialog from "../components/ui/ConfirmDialog";

const COLORS = [
  { bg: "rgba(212,175,55,0.12)", color: "#D4AF37", border: "rgba(212,175,55,0.3)" },
  { bg: "rgba(16,185,129,0.12)", color: "#10B981", border: "rgba(16,185,129,0.3)" },
  { bg: "rgba(139,92,246,0.12)", color: "#8B5CF6", border: "rgba(139,92,246,0.3)" },
  { bg: "rgba(245,158,11,0.12)", color: "#F59E0B", border: "rgba(245,158,11,0.3)" },
  { bg: "rgba(236,72,153,0.12)", color: "#EC4899", border: "rgba(236,72,153,0.3)" },
  { bg: "rgba(6,182,212,0.12)",  color: "#06B6D4", border: "rgba(6,182,212,0.3)" },
];

export default function Categories() {
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({});
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [mounted, setMounted] = useState(false);

  // ── State untuk modal konfirmasi ──
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 30);
    return () => clearTimeout(t);
  }, []);

  const load = async () => {
    setLoading(true);
    const [{ data: cats }, { data: items }] = await Promise.all([
      supabase.from("categories").select("*").order("name"),
      supabase.from("items").select("category_id"),
    ]);

    const map = {};
    (items || []).forEach(it => {
      if (it.category_id) map[it.category_id] = (map[it.category_id] || 0) + 1;
    });

    setRows(cats || []);
    setCounts(map);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const { error } = await supabase.from("categories").insert({ name: name.trim() });

    if (error) {
      alert(error.message);
    } else {
      await logActivity({ action: "create_category", entity: "categories", detail: { name } });
      setName("");
      setShowForm(false);
      load();
    }
    setIsSubmitting(false);
  };

  // ── Klik hapus → buka modal ──
  const handleDeleteClick = (row) => {
    setConfirmDelete(row);
  };

  // ── Konfirmasi hapus → jalankan ──
  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;
    const row = confirmDelete;

    setDeletingId(row.id);
    const { error } = await supabase.from("categories").delete().eq("id", row.id);

    if (error) {
      setDeletingId(null);
      throw new Error(error.message);
    }

    await logActivity({ action: "delete_category", entity: "categories", entityId: row.id });
    setDeletingId(null);
    load();
  };

  const filteredRows = useMemo(() => {
    return rows.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));
  }, [rows, search]);

  const totalBarangTerklasifikasi = useMemo(
    () => Object.values(counts).reduce((a, b) => a + b, 0),
    [counts]
  );

  const getInitials = (text) => text.trim().substring(0, 2).toUpperCase();

  return (
    <div className={`mc-cat ${mounted ? "is-mounted" : ""}`}>
      <CategoriesStyles />

      {/* ========== HEADER ========== */}
      <div className="mc-cat-head">
        <div className="mc-head-text">
          <div className="mc-cat-eyebrow">
            <Sparkles size={12} /> Manajemen Data
          </div>
          <h1 className="mc-cat-title">
            <span className="mc-cat-title-icon"><Tag size={22} /></span>
            Kategori Barang
          </h1>
          <p className="mc-cat-sub">Kelompokkan barang inventaris Anda agar lebih terstruktur.</p>
        </div>

        <div className="mc-cat-head-right">
          <div className="mc-cat-quick-stats">
            <div className="mc-qs-item" style={{ "--qs-accent": "#D4AF37" }}>
              <span className="mc-qs-icon"><Grid3x3 size={14} /></span>
              <div>
                <p className="mc-qs-val">{rows.length}</p>
                <p className="mc-qs-lbl">Kategori</p>
              </div>
            </div>
            <div className="mc-qs-item" style={{ "--qs-accent": "#10B981" }}>
              <span className="mc-qs-icon"><Package size={14} /></span>
              <div>
                <p className="mc-qs-val">{totalBarangTerklasifikasi}</p>
                <p className="mc-qs-lbl">Barang</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========== TOOLBAR ========== */}
      <div className="mc-toolbar">
        <div className="mc-search-wrap">
          <Search size={18} className="mc-search-icon" />
          <input
            type="text"
            placeholder="Cari kategori..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mc-search-input"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="mc-search-clear"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowForm(v => !v)}
          className={`mc-btn-add ${showForm ? "is-open" : ""}`}
          aria-expanded={showForm}
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? "Batal" : "Tambah Kategori"}
        </button>
      </div>

      {/* ========== FORM PANEL ========== */}
      {showForm && (
        <div className="mc-form-panel">
          <div className="mc-form-card-head">
            <div className="mc-form-card-icon">
              <Plus size={18} />
            </div>
            <div>
              <h2 className="mc-form-card-title">Tambah Kategori Baru</h2>
              <p className="mc-form-card-sub">Kategori membantu pencarian &amp; pelaporan barang</p>
            </div>
          </div>

          <form onSubmit={add} className="mc-form-inline">
            <div className="mc-input-wrap">
              <Tag size={16} className="mc-input-icon" />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Elektronik, Furniture..."
                className="mc-input"
                autoFocus
                maxLength={40}
              />
              {name && (
                <button
                  type="button"
                  onClick={() => setName("")}
                  className="mc-input-clear"
                  aria-label="Hapus"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="mc-btn-primary"
            >
              {isSubmitting ? (
                <>
                  <span className="mc-btn-spinner" /> Menyimpan...
                </>
              ) : (
                <>
                  <Plus size={16} /> Simpan
                </>
              )}
            </button>
          </form>

          <p className="mc-hint" style={{ textAlign: "left", marginTop: "0.5rem" }}>
            {name.length}/40 karakter
          </p>
        </div>
      )}

      {/* ========== DAFTAR ========== */}
      {loading ? (
        <div className="mc-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="mc-skel-card" style={{ animationDelay: `${i * 0.08}s` }} />
          ))}
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="mc-empty">
          <div className="mc-empty-glow" />
          <div className="mc-empty-icon">
            {search ? <Search size={32} /> : <Layers size={32} />}
          </div>
          <h3 className="mc-empty-title">
            {search ? "Tidak ada hasil" : "Belum ada kategori"}
          </h3>
          <p className="mc-empty-sub">
            {search
              ? `Tidak ditemukan kategori dengan nama "${search}".`
              : "Mulai dengan menambahkan kategori pertama Anda."}
          </p>
          {search ? (
            <button onClick={() => setSearch("")} className="mc-empty-btn">
              Reset pencarian
            </button>
          ) : (
            <button onClick={() => setShowForm(true)} className="mc-empty-btn">
              <PlusCircle size={14} /> Tambah kategori pertama
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="mc-grid">
            {filteredRows.map((row, index) => {
              const color = COLORS[index % COLORS.length];
              const itemCount = counts[row.id] || 0;
              const isDeleting = deletingId === row.id;

              return (
                <div
                  key={row.id}
                  className={`mc-cat-card ${isDeleting ? "is-deleting" : ""}`}
                  style={{ animationDelay: `${index * 0.04}s` }}
                >
                  <div
                    className="mc-cat-initial"
                    style={{
                      background: color.bg,
                      color: color.color,
                      borderColor: color.border,
                    }}
                  >
                    {getInitials(row.name)}
                  </div>
                  <div className="mc-cat-body">
                    <p className="mc-cat-name">{row.name}</p>
                    <p className="mc-cat-count">
                      <Package size={11} /> {itemCount} barang
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteClick(row)}
                    disabled={isDeleting}
                    className="mc-cat-del"
                    title="Hapus Kategori"
                  >
                    {isDeleting ? (
                      <span className="mc-btn-spinner" style={{ borderTopColor: "#EF4444" }} />
                    ) : (
                      <Trash2 size={15} />
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          <p className="mc-list-footer">
            <CheckCircle2 size={13} />
            Menampilkan <strong>{filteredRows.length}</strong> dari <strong>{rows.length}</strong> kategori
          </p>
        </>
      )}

      {/* ========== MODAL KONFIRMASI HAPUS ========== */}
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Hapus Kategori?"
        description={
          <>
            Kategori <strong>"{confirmDelete?.name}"</strong> akan dihapus permanen.
            Barang dengan kategori ini tidak akan terhapus, namun kategorinya menjadi kosong.
          </>
        }
        confirmText="Hapus Kategori"
        variant="danger"
      />
    </div>
  );
}

/* ============================================================
   Styles
============================================================ */
function CategoriesStyles() {
  return (
    <style>{`
      /* ============ CONTAINER ============ */
      .mc-cat {
        width: 100%;
        max-width: 100%;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        padding-bottom: 2.5rem;
        position: relative;
      }
      .mc-cat > * {
        opacity: 0;
        transform: translateY(14px);
        transition: opacity 0.5s var(--ease-out, cubic-bezier(0.16,1,0.3,1)),
                    transform 0.5s var(--ease-out, cubic-bezier(0.16,1,0.3,1));
      }
      .mc-cat.is-mounted > * { opacity: 1; transform: translateY(0); }
      .mc-cat.is-mounted > *:nth-child(1) { transition-delay: 0s; }
      .mc-cat.is-mounted > *:nth-child(2) { transition-delay: 0.08s; }
      .mc-cat.is-mounted > *:nth-child(3) { transition-delay: 0.16s; }
      .mc-cat.is-mounted > *:nth-child(4) { transition-delay: 0.24s; }

      /* ============ HEADER ============ */
      .mc-cat-head {
        display: flex; flex-direction: column; gap: 1.25rem;
      }
      @media (min-width: 768px) {
        .mc-cat-head {
          flex-direction: row; align-items: flex-end; justify-content: space-between;
        }
      }
      .mc-head-text { flex: 1; min-width: 0; }
      .mc-cat-head-right { display: flex; align-items: center; }

      .mc-cat-eyebrow {
        display: inline-flex; align-items: center; gap: 0.35rem;
        font-size: 0.7rem; font-weight: 700;
        color: var(--gold);
        background: var(--gold-soft);
        border: 1px solid color-mix(in srgb, var(--gold) 40%, transparent);
        padding: 0.3rem 0.7rem;
        border-radius: 999px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin-bottom: 0.6rem;
      }
      .mc-cat-eyebrow svg {
        animation: eyebrow-spin 4s linear infinite;
      }
      @keyframes eyebrow-spin { to { transform: rotate(360deg); } }

      .mc-cat-title {
        display: flex; align-items: center; gap: 0.75rem;
        font-family: 'Playfair Display', Georgia, serif;
        font-size: 1.85rem; font-weight: 800;
        color: var(--text-main);
        letter-spacing: -0.02em;
        margin-bottom: 0.35rem;
      }
      .mc-cat-title-icon {
        width: 44px; height: 44px;
        border-radius: 12px;
        background: linear-gradient(135deg, var(--gold) 0%, var(--maroon-light) 100%);
        border: 1px solid color-mix(in srgb, var(--gold) 40%, transparent);
        color: #fff;
        display: inline-flex; align-items: center; justify-content: center;
        box-shadow: 0 4px 16px -4px color-mix(in srgb, var(--gold) 40%, transparent);
        position: relative;
        overflow: hidden;
        transition: transform 0.3s var(--ease-spring, cubic-bezier(0.34,1.56,0.64,1));
      }
      .mc-cat-title-icon::before {
        content: ''; position: absolute; inset: 0;
        background: linear-gradient(135deg, transparent, rgba(255,255,255,.4), transparent);
        transform: translateX(-100%);
        animation: icon-shimmer 3s ease-in-out infinite;
      }
      @keyframes icon-shimmer {
        0%, 100% { transform: translateX(-100%); }
        50% { transform: translateX(100%); }
      }
      .mc-cat:hover .mc-cat-title-icon {
        transform: scale(1.06) rotate(-4deg);
      }

      .mc-cat-sub {
        font-size: 0.88rem; color: var(--text-muted);
        margin-left: 3.4rem;
      }
      @media (max-width: 640px) {
        .mc-cat-title { font-size: 1.5rem; }
        .mc-cat-title-icon { width: 36px; height: 36px; }
        .mc-cat-sub { margin-left: 0; }
      }

      /* Quick stats */
      .mc-cat-quick-stats { display: flex; gap: 0.75rem; }
      .mc-qs-item {
        display: flex; align-items: center; gap: 0.6rem;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 0.7rem 0.95rem;
        transition: all 0.25s var(--ease-spring, cubic-bezier(0.34,1.56,0.64,1));
        position: relative;
        overflow: hidden;
      }
      .mc-qs-item::before {
        content: '';
        position: absolute; top: 0; left: 0; right: 0; height: 2px;
        background: linear-gradient(90deg, transparent, var(--qs-accent, var(--gold)), transparent);
        opacity: 0;
        transition: opacity 0.3s;
      }
      .mc-qs-item:hover {
        border-color: color-mix(in srgb, var(--qs-accent, var(--gold)) 40%, var(--border));
        transform: translateY(-2px);
        box-shadow: 0 8px 20px -8px rgba(0,0,0,0.12);
      }
      .mc-qs-item:hover::before { opacity: 1; }
      .mc-qs-icon {
        width: 32px; height: 32px; border-radius: 8px;
        display: flex; align-items: center; justify-content: center;
        background: color-mix(in srgb, var(--qs-accent, var(--gold)) 15%, transparent);
        color: var(--qs-accent, var(--gold));
        border: 1px solid color-mix(in srgb, var(--qs-accent, var(--gold)) 30%, transparent);
        transition: transform 0.3s var(--ease-spring, cubic-bezier(0.34,1.56,0.64,1));
      }
      .mc-qs-item:hover .mc-qs-icon {
        transform: scale(1.1) rotate(-4deg);
      }
      .mc-qs-val {
        font-family: 'Playfair Display', Georgia, serif;
        font-size: 1.1rem; font-weight: 800;
        color: var(--text-main); line-height: 1;
        font-variant-numeric: tabular-nums;
      }
      .mc-qs-lbl {
        font-size: 0.68rem; font-weight: 600;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.04em;
        margin-top: 2px;
      }

      /* ============ TOOLBAR ============ */
      .mc-toolbar {
        display: flex; flex-direction: column; gap: 0.75rem;
      }
      @media (min-width: 640px) {
        .mc-toolbar { flex-direction: row; }
      }

      .mc-search-wrap { position: relative; flex: 1; }
      .mc-search-icon {
        position: absolute; left: 1rem; top: 50%;
        transform: translateY(-50%);
        color: var(--text-muted);
        pointer-events: none;
        transition: color 0.2s;
      }
      .mc-search-input {
        width: 100%;
        padding: 0.85rem 2.9rem 0.85rem 2.9rem;
        border-radius: 12px;
        border: 1.5px solid var(--border);
        background: var(--surface);
        color: var(--text-main);
        font-size: 0.9rem;
        font-family: inherit;
        transition: all 0.2s;
      }
      .mc-search-input:focus {
        outline: none;
        border-color: var(--gold);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--gold) 15%, transparent);
      }
      .mc-search-input:focus + .mc-search-icon {
        color: var(--gold);
      }
      .mc-search-input::placeholder { color: var(--text-muted); opacity: 0.6; }
      .mc-search-clear {
        position: absolute; right: 0.75rem; top: 50%;
        transform: translateY(-50%);
        background: var(--background);
        border: 1px solid var(--border);
        color: var(--text-muted);
        width: 24px; height: 24px;
        border-radius: 50%;
        cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: all 0.2s;
      }
      .mc-search-clear:hover {
        background: var(--gold);
        color: white;
        border-color: var(--gold);
        transform: translateY(-50%) rotate(90deg);
      }

      .mc-btn-add {
        display: inline-flex; align-items: center; justify-content: center;
        gap: 0.5rem;
        padding: 0.85rem 1.4rem;
        border-radius: 12px;
        background: linear-gradient(135deg, var(--gold) 0%, var(--maroon-light) 100%);
        color: white;
        font-weight: 700;
        font-size: 0.88rem;
        border: none;
        cursor: pointer;
        transition: all 0.25s var(--ease-spring, cubic-bezier(0.34,1.56,0.64,1));
        box-shadow: 0 4px 16px -4px color-mix(in srgb, var(--gold) 50%, transparent);
        white-space: nowrap;
        position: relative;
        overflow: hidden;
        font-family: inherit;
      }
      .mc-btn-add::before {
        content: '';
        position: absolute; inset: 0;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,.3), transparent);
        transform: translateX(-100%);
        transition: transform 0.6s ease;
      }
      .mc-btn-add:hover::before { transform: translateX(100%); }
      .mc-btn-add > * { position: relative; z-index: 1; }
      .mc-btn-add:hover {
        transform: translateY(-2px);
        box-shadow: 0 12px 28px -6px color-mix(in srgb, var(--gold) 60%, transparent);
        filter: brightness(1.1);
      }
      .mc-btn-add.is-open {
        background: var(--background);
        color: var(--text-main);
        border: 1.5px solid var(--border);
        box-shadow: none;
      }
      .mc-btn-add.is-open:hover {
        background: var(--surface);
        border-color: color-mix(in srgb, var(--gold) 50%, var(--border));
        color: var(--gold);
        box-shadow: none;
        transform: translateY(-1px);
      }

      /* ============ FORM PANEL ============ */
      .mc-form-panel {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 18px;
        padding: 1.5rem;
        box-shadow: 0 8px 24px -8px rgba(0,0,0,0.08);
        position: relative;
        overflow: hidden;
        animation: form-slide 0.35s var(--ease-out, cubic-bezier(0.16,1,0.3,1));
      }
      @keyframes form-slide {
        from { opacity: 0; transform: translateY(-8px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .mc-form-panel::before {
        content: '';
        position: absolute; top: 0; left: 0; right: 0; height: 3px;
        background: linear-gradient(90deg, transparent, var(--gold), transparent);
        opacity: 0.8;
      }
      .mc-form-card-head {
        display: flex; align-items: center; gap: 0.75rem;
        margin-bottom: 1rem;
      }
      .mc-form-card-icon {
        width: 38px; height: 38px;
        border-radius: 10px;
        background: linear-gradient(135deg, var(--gold) 0%, var(--maroon-light) 100%);
        color: white;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 4px 12px -2px color-mix(in srgb, var(--gold) 40%, transparent);
        flex-shrink: 0;
      }
      .mc-form-card-title {
        font-family: 'Playfair Display', Georgia, serif;
        font-size: 1rem; font-weight: 700;
        color: var(--text-main);
        line-height: 1.2;
      }
      .mc-form-card-sub {
        font-size: 0.74rem; color: var(--text-muted);
        margin-top: 2px;
      }

      .mc-form-inline {
        display: flex; flex-direction: column; gap: 0.6rem;
      }
      @media (min-width: 640px) {
        .mc-form-inline { flex-direction: row; align-items: stretch; }
      }
      .mc-input-wrap { position: relative; flex: 1; }
      .mc-input-icon {
        position: absolute; left: 0.9rem; top: 50%;
        transform: translateY(-50%);
        color: var(--text-muted);
        pointer-events: none;
        transition: color 0.2s;
      }
      .mc-input {
        width: 100%;
        padding: 0.75rem 2.4rem 0.75rem 2.4rem;
        border-radius: 10px;
        border: 1.5px solid var(--border);
        background: var(--background);
        color: var(--text-main);
        font-size: 0.88rem;
        font-family: inherit;
        transition: all 0.2s;
      }
      .mc-input:focus {
        outline: none;
        border-color: var(--gold);
        background: var(--surface);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--gold) 15%, transparent);
      }
      .mc-input-wrap:focus-within .mc-input-icon {
        color: var(--gold);
      }
      .mc-input::placeholder { color: var(--text-muted); opacity: 0.6; }
      .mc-input-clear {
        position: absolute; right: 0.7rem; top: 50%;
        transform: translateY(-50%);
        background: var(--border);
        color: var(--text-muted);
        border: none;
        width: 22px; height: 22px;
        border-radius: 50%;
        cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: all 0.2s;
      }
      .mc-input-clear:hover {
        background: var(--text-muted);
        color: var(--surface);
        transform: translateY(-50%) rotate(90deg);
      }

      .mc-hint {
        font-size: 0.7rem;
        color: var(--text-muted);
        font-variant-numeric: tabular-nums;
      }

      .mc-btn-primary {
        display: inline-flex; align-items: center; justify-content: center;
        gap: 0.5rem;
        padding: 0.75rem 1.4rem;
        border-radius: 10px;
        background: linear-gradient(135deg, var(--gold) 0%, var(--maroon-light) 100%);
        color: white;
        font-weight: 700;
        font-size: 0.88rem;
        border: none;
        cursor: pointer;
        transition: all 0.25s var(--ease-spring, cubic-bezier(0.34,1.56,0.64,1));
        box-shadow: 0 4px 12px -2px color-mix(in srgb, var(--gold) 40%, transparent);
        white-space: nowrap;
        position: relative;
        overflow: hidden;
        font-family: inherit;
      }
      .mc-btn-primary::before {
        content: '';
        position: absolute; inset: 0;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,.3), transparent);
        transform: translateX(-100%);
        transition: transform 0.6s ease;
      }
      .mc-btn-primary:hover::before { transform: translateX(100%); }
      .mc-btn-primary > * { position: relative; z-index: 1; }
      .mc-btn-primary:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px -4px color-mix(in srgb, var(--gold) 50%, transparent);
        filter: brightness(1.1);
      }
      .mc-btn-primary:disabled {
        opacity: 0.5; cursor: not-allowed; box-shadow: none;
      }

      .mc-btn-spinner {
        width: 14px; height: 14px;
        border: 2px solid rgba(255,255,255,0.4);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
        display: inline-block;
      }
      @keyframes spin { to { transform: rotate(360deg); } }

      /* ============ GRID KATEGORI ============ */
      .mc-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 0.75rem;
      }
      @media (min-width: 640px) {
        .mc-grid { grid-template-columns: repeat(2, 1fr); }
      }
      @media (min-width: 1024px) {
        .mc-grid { grid-template-columns: repeat(3, 1fr); }
      }

      .mc-cat-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 14px;
        padding: 0.9rem 1rem;
        display: flex; align-items: center; gap: 0.8rem;
        transition: all 0.25s var(--ease-spring, cubic-bezier(0.34,1.56,0.64,1));
        animation: card-in 0.4s var(--ease-out, cubic-bezier(0.16,1,0.3,1)) both;
        position: relative;
        overflow: hidden;
      }
      @keyframes card-in {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .mc-cat-card::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0; height: 2px;
        background: linear-gradient(90deg, transparent, var(--gold), transparent);
        opacity: 0;
        transition: opacity 0.3s;
      }
      .mc-cat-card:hover {
        border-color: color-mix(in srgb, var(--gold) 40%, var(--border));
        box-shadow: 0 8px 24px -8px rgba(0,0,0,0.15);
        transform: translateY(-3px);
      }
      .mc-cat-card:hover::before { opacity: 1; }
      .mc-cat-card.is-deleting {
        opacity: 0.5;
        pointer-events: none;
      }
      .mc-cat-initial {
        width: 42px; height: 42px;
        border-radius: 11px;
        display: flex; align-items: center; justify-content: center;
        font-weight: 800;
        font-size: 0.85rem;
        border: 1px solid;
        flex-shrink: 0;
        transition: transform 0.25s;
      }
      .mc-cat-card:hover .mc-cat-initial {
        transform: scale(1.08) rotate(-6deg);
      }
      .mc-cat-body { flex: 1; min-width: 0; }
      .mc-cat-name {
        font-weight: 700;
        font-size: 0.92rem;
        color: var(--text-main);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .mc-cat-count {
        font-size: 0.72rem;
        color: var(--text-muted);
        margin-top: 3px;
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
      }
      .mc-cat-count svg { opacity: 0.7; }
      .mc-cat-del {
        width: 32px; height: 32px;
        border-radius: 8px;
        background: transparent;
        border: 1px solid transparent;
        color: var(--text-muted);
        cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: all 0.2s;
        opacity: 0;
        flex-shrink: 0;
      }
      .mc-cat-card:hover .mc-cat-del,
      .mc-cat-del:focus { opacity: 1; }
      .mc-cat-del:hover {
        background: rgba(239,68,68,0.1);
        color: #EF4444;
        border-color: rgba(239,68,68,0.2);
      }
      .mc-cat-del:disabled { opacity: 0.6; cursor: not-allowed; }

      /* ============ SKELETON ============ */
      .mc-skel-card {
        height: 78px;
        border-radius: 14px;
        background: var(--surface);
        border: 1px solid var(--border);
        animation: pulse 1.5s ease-in-out infinite;
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      /* ============ EMPTY ============ */
      .mc-empty {
        position: relative;
        background: var(--surface);
        border: 1.5px dashed var(--border);
        border-radius: 18px;
        padding: 3rem 1.5rem;
        text-align: center;
        display: flex; flex-direction: column; align-items: center;
        gap: 0.5rem;
        overflow: hidden;
      }
      .mc-empty-glow {
        position: absolute;
        top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        width: 300px; height: 300px;
        background: radial-gradient(circle, color-mix(in srgb, var(--gold) 15%, transparent) 0%, transparent 70%);
        filter: blur(40px);
        opacity: 0.6;
        pointer-events: none;
        animation: empty-pulse 4s ease-in-out infinite;
      }
      @keyframes empty-pulse {
        0%, 100% { opacity: 0.4; transform: translate(-50%, -50%) scale(1); }
        50% { opacity: 0.7; transform: translate(-50%, -50%) scale(1.1); }
      }
      .mc-empty-icon {
        position: relative; z-index: 1;
        width: 68px; height: 68px;
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
      .mc-empty-title {
        position: relative; z-index: 1;
        font-family: 'Playfair Display', Georgia, serif;
        font-weight: 700; font-size: 1rem;
        color: var(--text-main);
      }
      .mc-empty-sub {
        position: relative; z-index: 1;
        font-size: 0.85rem;
        color: var(--text-muted);
        max-width: 320px;
      }
      .mc-empty-btn {
        position: relative; z-index: 1;
        margin-top: 0.75rem;
        padding: 0.55rem 1rem;
        border-radius: 8px;
        background: var(--gold-soft);
        color: var(--gold);
        border: 1px solid color-mix(in srgb, var(--gold) 40%, transparent);
        font-weight: 600;
        font-size: 0.8rem;
        cursor: pointer;
        transition: all 0.2s;
        display: inline-flex; align-items: center; gap: 0.35rem;
        font-family: inherit;
      }
      .mc-empty-btn:hover {
        background: var(--gold);
        color: white;
        transform: translateY(-1px);
        box-shadow: 0 4px 16px -4px color-mix(in srgb, var(--gold) 50%, transparent);
      }

      .mc-list-footer {
        display: flex; align-items: center; justify-content: center;
        gap: 0.4rem;
        font-size: 0.78rem;
        color: var(--text-muted);
        padding-top: 0.5rem;
      }
      .mc-list-footer svg { color: #10B981; }
      .mc-list-footer strong { color: var(--text-main); font-weight: 700; }
    `}</style>
  );
}