import { useEffect, useState, useMemo } from "react";
import {
  Plus, Trash2, Search, MapPin, Map,
  Sparkles, CheckCircle2, X, Building2,
  FileText, AlertCircle, Grid3x3, Box,
  ArrowUpRight, Package, Hash
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { logActivity } from "../utils/logActivity";
import ConfirmDialog from "../components/ui/ConfirmDialog";

export default function Locations() {
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({});
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [mounted, setMounted] = useState(false);

  // ── State konfirmasi hapus ──
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 30);
    return () => clearTimeout(t);
  }, []);

  const load = async () => {
    setLoading(true);
    const [{ data: locs }, { data: items }] = await Promise.all([
      supabase.from("locations").select("*").order("name"),
      supabase.from("items").select("location_id"),
    ]);

    const map = {};
    (items || []).forEach(it => {
      if (it.location_id) map[it.location_id] = (map[it.location_id] || 0) + 1;
    });

    setRows(locs || []);
    setCounts(map);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const { error } = await supabase.from("locations").insert({
      name: name.trim(),
      description: description.trim() || null,
    });

    if (error) {
      alert(error.message);
    } else {
      await logActivity({ action: "create_location", entity: "locations", detail: { name } });
      setName("");
      setDescription("");
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
    const { error } = await supabase.from("locations").delete().eq("id", row.id);

    if (error) {
      setDeletingId(null);
      throw new Error(error.message);
    }

    await logActivity({ action: "delete_location", entity: "locations", entityId: row.id });
    setDeletingId(null);
    load();
  };

  const filteredRows = useMemo(() => {
    return rows.filter(r =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(search.toLowerCase()))
    );
  }, [rows, search]);

  const totalBarangTerlokasi = useMemo(
    () => Object.values(counts).reduce((a, b) => a + b, 0),
    [counts]
  );

  return (
    <div className={`mc-loc ${mounted ? "is-mounted" : ""}`}>
      <LocationsStyles />

      {/* ========== HEADER ========== */}
      <div className="mc-head">
        <div className="mc-head-text">
          <div className="mc-eyebrow">
            <Sparkles size={12} /> Manajemen Data
          </div>
          <h1 className="mc-title">
            <span className="mc-title-icon">
              <MapPin size={22} />
            </span>
            Lokasi & Ruangan
          </h1>
          <p className="mc-sub">
            Atur tempat penyimpanan atau ruangan inventaris sekolah.
          </p>
        </div>

        <div className="mc-quick-stats">
          <div className="mc-qs-item" style={{ "--qs-accent": "#D4AF37" }}>
            <span className="mc-qs-icon"><Building2 size={14} /></span>
            <div>
              <p className="mc-qs-val">{rows.length}</p>
              <p className="mc-qs-lbl">Lokasi</p>
            </div>
          </div>
          <div className="mc-qs-item" style={{ "--qs-accent": "#10B981" }}>
            <span className="mc-qs-icon"><Box size={14} /></span>
            <div>
              <p className="mc-qs-val">{totalBarangTerlokasi}</p>
              <p className="mc-qs-lbl">Barang</p>
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
            placeholder="Cari lokasi atau deskripsi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mc-search-input"
          />
          {search && (
            <button onClick={() => setSearch("")} className="mc-search-clear" aria-label="Clear">
              <X size={14} />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowForm(v => !v)}
          className={`mc-btn-add ${showForm ? "is-open" : ""}`}
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? "Batal" : "Tambah Lokasi"}
        </button>
      </div>

      {/* ========== FORM PANEL ========== */}
      {showForm && (
        <div className="mc-form-panel">
          <div className="mc-form-panel-head">
            <div className="mc-form-panel-icon">
              <Plus size={18} />
            </div>
            <div>
              <h2 className="mc-form-panel-title">Tambah Lokasi Baru</h2>
              <p className="mc-form-panel-sub">Lokasi membantu pencarian &amp; pelaporan barang</p>
            </div>
          </div>

          <form onSubmit={add} className="mc-form-grid">
            <div>
              <label className="mc-label">Nama Lokasi</label>
              <div className="mc-input-wrap">
                <MapPin size={16} className="mc-input-icon" />
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Lab Komputer, Gudang..."
                  className="mc-input"
                  autoFocus
                  maxLength={60}
                />
                {name && (
                  <button type="button" onClick={() => setName("")} className="mc-input-clear">
                    <X size={14} />
                  </button>
                )}
              </div>
              <p className="mc-hint">{name.length}/60 karakter</p>
            </div>

            <div>
              <label className="mc-label">Deskripsi (Opsional)</label>
              <div className="mc-input-wrap">
                <FileText size={16} className="mc-input-icon" style={{ top: "1rem" }} />
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Keterangan tambahan tentang lokasi ini..."
                  rows={2}
                  maxLength={200}
                  className="mc-input mc-textarea"
                />
              </div>
              <p className="mc-hint">{description.length}/200 karakter</p>
            </div>

            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="mc-btn-submit"
            >
              {isSubmitting ? (
                <>
                  <span className="mc-btn-spinner" /> Menyimpan...
                </>
              ) : (
                <>
                  <Plus size={16} /> Simpan Lokasi
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* ========== DAFTAR LOKASI ========== */}
      {loading ? (
        <div className="mc-grid">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="mc-skel-card" style={{ animationDelay: `${i * 0.08}s` }} />
          ))}
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="mc-empty">
          <div className="mc-empty-glow" />
          <div className="mc-empty-icon">
            {search ? <Search size={32} /> : <Map size={32} />}
          </div>
          <h3 className="mc-empty-title">
            {search ? "Tidak ada hasil" : "Belum ada lokasi"}
          </h3>
          <p className="mc-empty-sub">
            {search
              ? `Tidak ditemukan lokasi dengan kata kunci "${search}".`
              : "Mulai dengan menambahkan lokasi pertama Anda."}
          </p>
          {search ? (
            <button onClick={() => setSearch("")} className="mc-empty-btn">
              Reset pencarian
            </button>
          ) : (
            <button onClick={() => setShowForm(true)} className="mc-empty-btn">
              <Plus size={14} /> Tambah lokasi pertama
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="mc-grid">
            {filteredRows.map((row, index) => {
              const itemCount = counts[row.id] || 0;
              const isDeleting = deletingId === row.id;
              const hasItems = itemCount > 0;

              return (
                <div
                  key={row.id}
                  className={`mc-loc-card ${isDeleting ? "is-deleting" : ""} ${hasItems ? "has-items" : "no-items"}`}
                  style={{ animationDelay: `${index * 0.04}s` }}
                >
                  <span className="mc-loc-accent" />

                  <div className="mc-loc-icon">
                    <MapPin size={22} />
                    <span className="mc-loc-icon-glow" />
                  </div>

                  <div className="mc-loc-body">
                    <div className="mc-loc-header">
                      <p className="mc-loc-name" title={row.name}>{row.name}</p>
                      {hasItems && (
                        <span className="mc-loc-badge" title={`${itemCount} barang terkait`}>
                          <Package size={10} />
                          {itemCount}
                        </span>
                      )}
                    </div>

                    {row.description ? (
                      <p className="mc-loc-desc" title={row.description}>
                        {row.description}
                      </p>
                    ) : (
                      <p className="mc-loc-desc is-empty">Belum ada deskripsi</p>
                    )}
                  </div>

                  <button
                    onClick={() => handleDeleteClick(row)}
                    disabled={isDeleting}
                    className="mc-loc-del"
                    title="Hapus Lokasi"
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
            Menampilkan <strong>{filteredRows.length}</strong> dari <strong>{rows.length}</strong> lokasi
          </p>
        </>
      )}

      {/* ========== MODAL KONFIRMASI HAPUS ========== */}
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Hapus Lokasi?"
        description={
          <>
            Lokasi <strong>"{confirmDelete?.name}"</strong> akan dihapus permanen.
            Barang dengan lokasi ini tidak akan terhapus, namun lokasinya menjadi kosong.
          </>
        }
        confirmText="Hapus Lokasi"
        variant="danger"
      />
    </div>
  );
}

/* ============================================================
   Styles — Tema Landing + Card Premium
============================================================ */
function LocationsStyles() {
  return (
    <style>{`
      /* CONTAINER */
      .mc-loc {
        width: 100%; max-width: 100%;
        display: flex; flex-direction: column;
        gap: 1.25rem; padding-bottom: 2.5rem;
        position: relative;
      }
      .mc-loc > * {
        opacity: 0; transform: translateY(14px);
        transition: opacity 0.5s var(--ease-out, cubic-bezier(0.16,1,0.3,1)),
                    transform 0.5s var(--ease-out, cubic-bezier(0.16,1,0.3,1));
      }
      .mc-loc.is-mounted > * { opacity: 1; transform: translateY(0); }
      .mc-loc.is-mounted > *:nth-child(1) { transition-delay: 0s; }
      .mc-loc.is-mounted > *:nth-child(2) { transition-delay: 0.08s; }
      .mc-loc.is-mounted > *:nth-child(3) { transition-delay: 0.16s; }
      .mc-loc.is-mounted > *:nth-child(4) { transition-delay: 0.24s; }

      /* HEADER */
      .mc-head { display: flex; flex-direction: column; gap: 1.25rem; }
      @media (min-width: 768px) {
        .mc-head { flex-direction: row; align-items: flex-end; justify-content: space-between; }
      }
      .mc-head-text { flex: 1; min-width: 0; }

      .mc-eyebrow {
        display: inline-flex; align-items: center; gap: 0.35rem;
        font-size: 0.7rem; font-weight: 700;
        color: var(--gold); background: var(--gold-soft);
        border: 1px solid color-mix(in srgb, var(--gold) 40%, transparent);
        padding: 0.3rem 0.7rem; border-radius: 999px;
        text-transform: uppercase; letter-spacing: 0.08em;
        margin-bottom: 0.6rem;
      }
      .mc-eyebrow svg { animation: eyebrow-spin 4s linear infinite; }
      @keyframes eyebrow-spin { to { transform: rotate(360deg); } }

      .mc-title {
        display: flex; align-items: center; gap: 0.75rem;
        font-family: 'Playfair Display', Georgia, serif;
        font-size: 1.85rem; font-weight: 800;
        color: var(--text-main); letter-spacing: -0.02em;
        margin-bottom: 0.35rem;
      }
      .mc-title-icon {
        width: 44px; height: 44px; border-radius: 12px;
        background: linear-gradient(135deg, var(--gold) 0%, var(--maroon-light) 100%);
        border: 1px solid color-mix(in srgb, var(--gold) 40%, transparent);
        color: #fff;
        display: inline-flex; align-items: center; justify-content: center;
        box-shadow: 0 4px 16px -4px color-mix(in srgb, var(--gold) 40%, transparent);
        position: relative; overflow: hidden;
        transition: transform 0.3s var(--ease-spring, cubic-bezier(0.34,1.56,0.64,1));
      }
      .mc-title-icon::before {
        content: ''; position: absolute; inset: 0;
        background: linear-gradient(135deg, transparent, rgba(255,255,255,.4), transparent);
        transform: translateX(-100%);
        animation: icon-shimmer 3s ease-in-out infinite;
      }
      @keyframes icon-shimmer {
        0%, 100% { transform: translateX(-100%); }
        50% { transform: translateX(100%); }
      }
      .mc-title:hover .mc-title-icon { transform: scale(1.06) rotate(-4deg); }

      .mc-sub {
        font-size: 0.88rem; color: var(--text-muted);
        margin-left: 3.4rem; max-width: 520px;
      }
      @media (max-width: 640px) {
        .mc-title { font-size: 1.5rem; }
        .mc-title-icon { width: 36px; height: 36px; }
        .mc-sub { margin-left: 0; }
      }

      /* Quick stats */
      .mc-quick-stats { display: flex; gap: 0.75rem; }
      .mc-qs-item {
        display: flex; align-items: center; gap: 0.6rem;
        background: var(--surface); border: 1px solid var(--border);
        border-radius: 12px; padding: 0.7rem 0.95rem;
        transition: all 0.25s var(--ease-spring, cubic-bezier(0.34,1.56,0.64,1));
        position: relative; overflow: hidden;
      }
      .mc-qs-item::before {
        content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
        background: linear-gradient(90deg, transparent, var(--qs-accent, var(--gold)), transparent);
        opacity: 0; transition: opacity 0.3s;
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
      .mc-qs-item:hover .mc-qs-icon { transform: scale(1.1) rotate(-4deg); }
      .mc-qs-val {
        font-family: 'Playfair Display', Georgia, serif;
        font-size: 1.1rem; font-weight: 800;
        color: var(--text-main); line-height: 1;
        font-variant-numeric: tabular-nums;
      }
      .mc-qs-lbl {
        font-size: 0.68rem; font-weight: 600;
        color: var(--text-muted);
        text-transform: uppercase; letter-spacing: 0.04em;
        margin-top: 2px;
      }

      /* TOOLBAR */
      .mc-toolbar { display: flex; flex-direction: column; gap: 0.75rem; }
      @media (min-width: 640px) {
        .mc-toolbar { flex-direction: row; }
      }
      .mc-search-wrap { position: relative; flex: 1; }
      .mc-search-icon {
        position: absolute; left: 1rem; top: 50%;
        transform: translateY(-50%);
        color: var(--text-muted);
        pointer-events: none; transition: color 0.2s;
      }
      .mc-search-input {
        width: 100%; padding: 0.8rem 2.9rem 0.8rem 2.9rem;
        border-radius: 12px; border: 1.5px solid var(--border);
        background: var(--surface); color: var(--text-main);
        font-size: 0.9rem; font-family: inherit;
        transition: all 0.2s;
      }
      .mc-search-input:focus {
        outline: none; border-color: var(--gold);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--gold) 15%, transparent);
      }
      .mc-search-input:focus ~ .mc-search-icon { color: var(--gold); }
      .mc-search-input::placeholder { color: var(--text-muted); opacity: 0.6; }
      .mc-search-clear {
        position: absolute; right: 0.75rem; top: 50%;
        transform: translateY(-50%);
        background: var(--background);
        border: 1px solid var(--border); color: var(--text-muted);
        width: 24px; height: 24px; border-radius: 50%;
        cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: all 0.2s;
      }
      .mc-search-clear:hover {
        background: var(--gold); color: white;
        border-color: var(--gold);
        transform: translateY(-50%) rotate(90deg);
      }

      .mc-btn-add {
        display: inline-flex; align-items: center; justify-content: center;
        gap: 0.5rem; padding: 0.8rem 1.4rem; border-radius: 12px;
        background: linear-gradient(135deg, var(--gold) 0%, var(--maroon-light) 100%);
        color: white; font-weight: 700; font-size: 0.88rem;
        border: none; cursor: pointer;
        transition: all 0.25s var(--ease-spring, cubic-bezier(0.34,1.56,0.64,1));
        box-shadow: 0 4px 16px -4px color-mix(in srgb, var(--gold) 50%, transparent);
        white-space: nowrap; position: relative; overflow: hidden;
        font-family: inherit;
      }
      .mc-btn-add::before {
        content: ''; position: absolute; inset: 0;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,.3), transparent);
        transform: translateX(-100%); transition: transform 0.6s ease;
      }
      .mc-btn-add:hover::before { transform: translateX(100%); }
      .mc-btn-add > * { position: relative; z-index: 1; }
      .mc-btn-add:hover {
        transform: translateY(-2px);
        box-shadow: 0 12px 28px -6px color-mix(in srgb, var(--gold) 60%, transparent);
        filter: brightness(1.1);
      }
      .mc-btn-add.is-open {
        background: var(--background); color: var(--text-main);
        border: 1.5px solid var(--border); box-shadow: none;
      }
      .mc-btn-add.is-open:hover {
        background: var(--surface);
        border-color: color-mix(in srgb, var(--gold) 50%, var(--border));
        color: var(--gold); box-shadow: none;
      }

      /* FORM PANEL */
      .mc-form-panel {
        background: var(--surface); border: 1px solid var(--border);
        border-radius: 18px; padding: 1.5rem;
        box-shadow: 0 8px 24px -8px rgba(0,0,0,0.08);
        position: relative; overflow: hidden;
        animation: form-slide 0.35s var(--ease-out, cubic-bezier(0.16,1,0.3,1));
      }
      @keyframes form-slide {
        from { opacity: 0; transform: translateY(-8px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .mc-form-panel::before {
        content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
        background: linear-gradient(90deg, transparent, var(--gold), transparent);
        opacity: 0.8;
      }
      .mc-form-panel-head {
        display: flex; align-items: center; gap: 0.75rem;
        margin-bottom: 1rem;
      }
      .mc-form-panel-icon {
        width: 38px; height: 38px; border-radius: 10px;
        background: linear-gradient(135deg, var(--gold) 0%, var(--maroon-light) 100%);
        color: white;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 4px 12px -2px color-mix(in srgb, var(--gold) 40%, transparent);
        flex-shrink: 0;
      }
      .mc-form-panel-title {
        font-family: 'Playfair Display', Georgia, serif;
        font-size: 1rem; font-weight: 700;
        color: var(--text-main); line-height: 1.2;
      }
      .mc-form-panel-sub {
        font-size: 0.74rem; color: var(--text-muted);
        margin-top: 2px;
      }

      .mc-form-grid { display: flex; flex-direction: column; gap: 1rem; }
      @media (min-width: 640px) {
        .mc-form-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;
        }
        .mc-form-grid > button { grid-column: 1 / -1; }
      }

      .mc-label {
        display: block; font-size: 0.7rem; font-weight: 700;
        color: var(--text-muted); text-transform: uppercase;
        letter-spacing: 0.06em; margin-bottom: 0.5rem;
      }
      .mc-input-wrap { position: relative; }
      .mc-input-icon {
        position: absolute; left: 0.9rem; top: 50%;
        transform: translateY(-50%);
        color: var(--text-muted); pointer-events: none;
        transition: color 0.2s;
      }
      .mc-input {
        width: 100%; padding: 0.7rem 2.4rem 0.7rem 2.4rem;
        border-radius: 10px; border: 1.5px solid var(--border);
        background: var(--background); color: var(--text-main);
        font-size: 0.88rem; font-family: inherit;
        transition: all 0.2s;
      }
      .mc-textarea {
        padding-top: 0.65rem; padding-bottom: 0.65rem;
        resize: vertical; min-height: 72px; line-height: 1.5;
      }
      .mc-input:focus {
        outline: none; border-color: var(--gold);
        background: var(--surface);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--gold) 15%, transparent);
      }
      .mc-input-wrap:focus-within .mc-input-icon { color: var(--gold); }
      .mc-input::placeholder { color: var(--text-muted); opacity: 0.6; }
      .mc-input-clear {
        position: absolute; right: 0.7rem; top: 50%;
        transform: translateY(-50%);
        background: var(--border); color: var(--text-muted);
        border: none; width: 22px; height: 22px;
        border-radius: 50%; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: all 0.2s;
      }
      .mc-input-clear:hover {
        background: var(--text-muted); color: var(--surface);
        transform: translateY(-50%) rotate(90deg);
      }
      .mc-hint {
        font-size: 0.7rem; color: var(--text-muted);
        margin-top: 0.4rem; text-align: right;
        font-variant-numeric: tabular-nums;
      }

      .mc-btn-submit {
        display: inline-flex; align-items: center; justify-content: center;
        gap: 0.5rem; padding: 0.75rem 1.4rem;
        border-radius: 10px;
        background: linear-gradient(135deg, var(--gold) 0%, var(--maroon-light) 100%);
        color: white; font-weight: 700; font-size: 0.88rem;
        border: none; cursor: pointer;
        transition: all 0.25s var(--ease-spring, cubic-bezier(0.34,1.56,0.64,1));
        box-shadow: 0 4px 12px -2px color-mix(in srgb, var(--gold) 40%, transparent);
        position: relative; overflow: hidden;
        font-family: inherit;
      }
      .mc-btn-submit::before {
        content: ''; position: absolute; inset: 0;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,.3), transparent);
        transform: translateX(-100%); transition: transform 0.6s ease;
      }
      .mc-btn-submit:hover::before { transform: translateX(100%); }
      .mc-btn-submit > * { position: relative; z-index: 1; }
      .mc-btn-submit:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px -4px color-mix(in srgb, var(--gold) 50%, transparent);
        filter: brightness(1.1);
      }
      .mc-btn-submit:disabled {
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

      /* GRID */
      .mc-grid {
        display: grid; grid-template-columns: 1fr; gap: 0.85rem;
      }
      @media (min-width: 640px) {
        .mc-grid { grid-template-columns: repeat(2, 1fr); }
      }
      @media (min-width: 1024px) {
        .mc-grid { grid-template-columns: repeat(3, 1fr); }
      }

      /* CARD LOKASI */
      .mc-loc-card {
        position: relative; background: var(--surface);
        border: 1px solid var(--border); border-radius: 16px;
        padding: 1.1rem 1rem 1rem;
        display: flex; align-items: flex-start; gap: 0.85rem;
        transition: all 0.3s var(--ease-spring, cubic-bezier(0.34,1.56,0.64,1));
        animation: card-in 0.5s var(--ease-out, cubic-bezier(0.16,1,0.3,1)) both;
        overflow: hidden;
      }
      @keyframes card-in {
        from { opacity: 0; transform: translateY(12px) scale(0.98); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      .mc-loc-accent {
        position: absolute; top: 0; left: 0; right: 0; height: 3px;
        background: linear-gradient(90deg, transparent, var(--gold), transparent);
        opacity: 0; transition: opacity 0.3s;
      }
      .mc-loc-card:hover .mc-loc-accent { opacity: 1; }
      .mc-loc-card:hover {
        border-color: color-mix(in srgb, var(--gold) 50%, var(--border));
        box-shadow: 0 12px 28px -10px rgba(0,0,0,0.18);
        transform: translateY(-4px);
      }
      .mc-loc-card.is-deleting { opacity: 0.5; pointer-events: none; }
      .mc-loc-card.has-items {
        border-color: color-mix(in srgb, var(--gold) 25%, var(--border));
      }

      .mc-loc-icon {
        width: 48px; height: 48px; border-radius: 14px;
        background: linear-gradient(135deg, var(--gold) 0%, var(--maroon-light) 100%);
        color: white;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0; position: relative;
        box-shadow: 0 4px 14px -4px color-mix(in srgb, var(--gold) 50%, transparent);
        transition: all 0.35s var(--ease-spring, cubic-bezier(0.34,1.56,0.64,1));
      }
      .mc-loc-card:hover .mc-loc-icon {
        transform: scale(1.08) rotate(-6deg);
        box-shadow: 0 8px 24px -6px color-mix(in srgb, var(--gold) 60%, transparent);
      }
      .mc-loc-icon-glow {
        position: absolute; inset: -6px; border-radius: 20px;
        background: radial-gradient(circle, color-mix(in srgb, var(--gold) 30%, transparent) 0%, transparent 70%);
        opacity: 0; transition: opacity 0.35s; pointer-events: none;
      }
      .mc-loc-card:hover .mc-loc-icon-glow { opacity: 1; }

      .mc-loc-body { flex: 1; min-width: 0; }
      .mc-loc-header {
        display: flex; align-items: center; gap: 0.5rem;
        margin-bottom: 0.35rem; min-width: 0;
      }
      .mc-loc-name {
        font-family: 'Playfair Display', Georgia, serif;
        font-weight: 700; font-size: 1rem;
        color: var(--text-main);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        flex: 1; min-width: 0;
        transition: color 0.2s;
      }
      .mc-loc-card:hover .mc-loc-name { color: var(--gold); }

      .mc-loc-badge {
        display: inline-flex; align-items: center; gap: 0.25rem;
        padding: 0.15rem 0.5rem; border-radius: 999px;
        background: color-mix(in srgb, var(--gold) 15%, transparent);
        border: 1px solid color-mix(in srgb, var(--gold) 40%, transparent);
        color: var(--gold);
        font-size: 0.68rem; font-weight: 800;
        font-variant-numeric: tabular-nums;
        flex-shrink: 0; transition: all 0.3s;
      }
      .mc-loc-card:hover .mc-loc-badge {
        background: linear-gradient(135deg, var(--gold) 0%, var(--maroon-light) 100%);
        color: white; border-color: transparent;
        box-shadow: 0 2px 8px -2px color-mix(in srgb, var(--gold) 50%, transparent);
      }

      .mc-loc-desc {
        font-size: 0.76rem; color: var(--text-muted);
        line-height: 1.5;
        display: -webkit-box; -webkit-line-clamp: 2;
        -webkit-box-orient: vertical; overflow: hidden;
      }
      .mc-loc-desc.is-empty {
        font-style: italic; opacity: 0.55; font-size: 0.74rem;
      }

      .mc-loc-del {
        width: 32px; height: 32px; border-radius: 8px;
        background: transparent; border: 1px solid transparent;
        color: var(--text-muted); cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: all 0.2s;
        opacity: 0; flex-shrink: 0; margin-top: -2px;
      }
      .mc-loc-card:hover .mc-loc-del,
      .mc-loc-del:focus { opacity: 1; }
      .mc-loc-del:hover {
        background: rgba(239,68,68,0.1);
        color: #EF4444; border-color: rgba(239,68,68,0.2);
        transform: scale(1.1);
      }
      .mc-loc-del:disabled { opacity: 0.6; cursor: not-allowed; }

      /* SKELETON */
      .mc-skel-card {
        height: 100px; border-radius: 16px;
        background: var(--surface); border: 1px solid var(--border);
        animation: pulse 1.5s ease-in-out infinite;
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      /* EMPTY */
      .mc-empty {
        position: relative; background: var(--surface);
        border: 1.5px dashed var(--border); border-radius: 18px;
        padding: 3rem 1.5rem; text-align: center;
        display: flex; flex-direction: column; align-items: center;
        gap: 0.5rem; overflow: hidden;
      }
      .mc-empty-glow {
        position: absolute; top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        width: 300px; height: 300px;
        background: radial-gradient(circle, color-mix(in srgb, var(--gold) 15%, transparent) 0%, transparent 70%);
        filter: blur(40px); opacity: 0.6; pointer-events: none;
        animation: empty-pulse 4s ease-in-out infinite;
      }
      @keyframes empty-pulse {
        0%, 100% { opacity: 0.4; transform: translate(-50%, -50%) scale(1); }
        50% { opacity: 0.7; transform: translate(-50%, -50%) scale(1.1); }
      }
      .mc-empty-icon {
        position: relative; z-index: 1;
        width: 68px; height: 68px; border-radius: 50%;
        background: var(--background); border: 1px solid var(--border);
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
        font-weight: 700; font-size: 1rem; color: var(--text-main);
      }
      .mc-empty-sub {
        position: relative; z-index: 1;
        font-size: 0.85rem; color: var(--text-muted); max-width: 320px;
      }
      .mc-empty-btn {
        position: relative; z-index: 1;
        margin-top: 0.75rem; padding: 0.55rem 1rem;
        border-radius: 8px; background: var(--gold-soft);
        color: var(--gold);
        border: 1px solid color-mix(in srgb, var(--gold) 40%, transparent);
        font-weight: 600; font-size: 0.8rem; cursor: pointer;
        transition: all 0.2s;
        display: inline-flex; align-items: center; gap: 0.35rem;
        font-family: inherit;
      }
      .mc-empty-btn:hover {
        background: var(--gold); color: white;
        transform: translateY(-1px);
        box-shadow: 0 4px 16px -4px color-mix(in srgb, var(--gold) 50%, transparent);
      }

      .mc-list-footer {
        display: flex; align-items: center; justify-content: center;
        gap: 0.4rem; font-size: 0.78rem; color: var(--text-muted);
        padding-top: 0.5rem;
      }
      .mc-list-footer svg { color: #10B981; }
      .mc-list-footer strong { color: var(--text-main); font-weight: 700; }
    `}</style>
  );
}