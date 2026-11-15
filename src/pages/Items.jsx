import { useState, useEffect, useMemo, useRef } from "react";
import {
  Plus, Upload, Search, PackageSearch, Sparkles,
  X, Box, Tag, MapPin, CheckCircle2, AlertTriangle,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Command, Rows3, Filter, SlidersHorizontal,
  ArrowUpDown, ChevronDown, ChevronUp, TrendingUp,
  LayoutGrid, ArrowUpRight, Trash2
} from "lucide-react";
import { useAuthStore } from "../stores/authStore";
import { useItems } from "../hooks/useItems";
import { supabase } from "../lib/supabase";
import { logActivity } from "../utils/logActivity";
import ItemTable from "../components/items/ItemTable";
import ItemForm from "../components/items/ItemForm";
import ImportCSV from "../components/items/ImportCSV";
import ConfirmDialog from "../components/ui/ConfirmDialog";

const PAGE_SIZE = 10;

/* ✅ Helper — deteksi field unit dari berbagai kemungkinan */
function getUnitCount(item) {
  if (!item) return 0;
  if (typeof item.total_units === "number") return item.total_units;
  if (typeof item.unit_count === "number") return item.unit_count;
  if (typeof item.units_count === "number") return item.units_count;
  if (Array.isArray(item.item_units)) return item.item_units.length;
  if (Array.isArray(item.units)) return item.units.length;
  return 0;
}

/* ✅ Helper — hitung total rusak dari condition_summary */
function getRusakCount(item) {
  if (!item) return 0;
  const c = item.condition_summary || {};
  return (c.rusak || 0) + (c.rusak_ringan || 0) + (c.rusak_berat || 0);
}

export default function Items() {
  const { hasRole } = useAuthStore();
  const canWrite = hasRole("super_admin", "admin");

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [page, setPage] = useState(1);
  const [mounted, setMounted] = useState(false);
  const searchRef = useRef(null);
  const tableRef = useRef(null);

  // ── Filter state ──
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterLocation, setFilterLocation] = useState("all");
  const [filterCondition, setFilterCondition] = useState("all");
  const [filterUnit, setFilterUnit] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [showFilters, setShowFilters] = useState(false);

  // ── State konfirmasi hapus ──
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ── Reference data ──
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);

  const { items, loading, refetch } = useItems({ search });

  // Fetch categories & locations sekali di awal
  useEffect(() => {
    (async () => {
      const [cats, locs] = await Promise.all([
        supabase.from("categories").select("id, name").order("name"),
        supabase.from("locations").select("id, name").order("name"),
      ]);
      setCategories(cats.data || []);
      setLocations(locs.data || []);
    })();
  }, []);

  useEffect(() => {
    setMounted(true);
    setPage(1);
  }, [search, filterCategory, filterLocation, filterCondition, filterUnit]);

  // ⌘K / Ctrl+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── Filter ──
  const filteredItems = useMemo(() => {
    return items.filter(it => {
      if (filterCategory !== "all" && it.category_id !== filterCategory) return false;
      if (filterLocation !== "all" && it.location_id !== filterLocation) return false;

      const unitCount = getUnitCount(it);
      if (filterUnit === "has_unit" && unitCount === 0) return false;
      if (filterUnit === "no_unit" && unitCount > 0) return false;

      const rusakCount = getRusakCount(it);
      if (filterCondition === "has_damage" && rusakCount === 0) return false;
      if (filterCondition === "no_damage" && rusakCount > 0) return false;

      return true;
    });
  }, [items, filterCategory, filterLocation, filterCondition, filterUnit]);

  // ── Sort ──
  const sortedItems = useMemo(() => {
    const arr = [...filteredItems];
    arr.sort((a, b) => {
      let va, vb;
      switch (sortBy) {
        case "category":
          va = a.category?.name || "";
          vb = b.category?.name || "";
          break;
        case "location":
          va = a.location?.name || "";
          vb = b.location?.name || "";
          break;
        case "units":
          va = getUnitCount(a);
          vb = getUnitCount(b);
          break;
        case "condition":
          va = getRusakCount(a);
          vb = getRusakCount(b);
          break;
        default:
          va = (a.name || "").toLowerCase();
          vb = (b.name || "").toLowerCase();
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filteredItems, sortBy, sortDir]);

  // ── Stats (dari filtered) ──
  const stats = useMemo(() => {
    const totalItems = sortedItems.length;
    const withUnits = sortedItems.filter(it => getUnitCount(it) > 0).length;
    const cats = new Set(sortedItems.map(it => it.category?.name || it.category_id).filter(Boolean)).size;
    const locs = new Set(sortedItems.map(it => it.location?.name || it.location_id).filter(Boolean)).size;
    return { totalItems, withUnits, categories: cats, locations: locs };
  }, [sortedItems]);

  // ── Pagination ──
  const totalPages = Math.max(1, Math.ceil(sortedItems.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return sortedItems.slice(start, start + PAGE_SIZE);
  }, [sortedItems, safePage]);

  const startIndex = sortedItems.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const endIndex = Math.min(safePage * PAGE_SIZE, sortedItems.length);

  const goToPage = (p) => {
    const next = Math.max(1, Math.min(totalPages, p));
    setPage(next);
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const activeFilterCount = [
    filterCategory !== "all",
    filterLocation !== "all",
    filterCondition !== "all",
    filterUnit !== "all",
  ].filter(Boolean).length;

  const resetFilters = () => {
    setFilterCategory("all");
    setFilterLocation("all");
    setFilterCondition("all");
    setFilterUnit("all");
    setSearch("");
    setPage(1);
  };

  const openAdd = () => { setEditing(null); setShowForm(true); };

  // ── Handle delete dari ItemTable ──
  const handleDeleteClick = (item) => {
    setConfirmDelete(item);
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;
    const item = confirmDelete;

    setDeleting(true);
    const { error } = await supabase.from("items").delete().eq("id", item.id);

    if (error) {
      setDeleting(false);
      throw new Error(error.message);
    }

    await logActivity({
      action: "delete_item",
      entity: "items",
      entityId: item.id,
      detail: { name: item.name },
    });

    setDeleting(false);
    refetch();
  };

  return (
    <div className={`mc-items ${mounted ? "is-mounted" : ""}`}>
      <ItemsStyles />

      {/* ================= HEADER ================= */}
      <div className="mc-head">
        <div className="mc-head-text">
          <div className="mc-eyebrow">
            <Sparkles size={12} />
            <span>Manajemen Inventaris</span>
          </div>
          <h1 className="mc-title">
            <span className="mc-title-icon"><Box size={22} /></span>
            Daftar Barang
          </h1>
          <p className="mc-sub">
            Kelola data inventaris induk dan unit fisik barang sekolah dengan mudah dan terorganisir.
          </p>
        </div>

        {canWrite && (
          <div className="mc-head-actions">
            <button onClick={() => setShowImport(true)} className="mc-btn-secondary">
              <Upload size={16} /> Import CSV
            </button>
            <button onClick={openAdd} className="mc-btn-primary">
              <Plus size={16} /> Tambah Barang
            </button>
          </div>
        )}
      </div>

      {/* ================= STAT SUMMARY ================= */}
      {!loading && items.length > 0 && (
        <div className="mc-stat-row">
          {[
            { label: "Total Barang", value: stats.totalItems, icon: Box, cls: "blue", accent: "#D4AF37" },
            { label: "Punya Unit", value: stats.withUnits, icon: CheckCircle2, cls: "green", accent: "#10B981" },
            { label: "Kategori", value: stats.categories, icon: Tag, cls: "purple", accent: "#8B5CF6" },
            { label: "Lokasi", value: stats.locations, icon: MapPin, cls: "orange", accent: "#F59E0B" },
          ].map((s, i) => (
            <div
              key={s.label}
              className="mc-stat-item"
              style={{
                animationDelay: `${0.05 + i * 0.06}s`,
                "--stat-accent": s.accent,
              }}
            >
              <span className={`mc-stat-icon ${s.cls}`}><s.icon size={14} /></span>
              <div className="mc-stat-body">
                <p className="mc-stat-val">{s.value}</p>
                <p className="mc-stat-lbl">{s.label}</p>
              </div>
              <ArrowUpRight size={12} className="mc-stat-arrow" />
            </div>
          ))}
        </div>
      )}

      {/* ================= SEARCH + FILTER TOGGLE ================= */}
      <div className="mc-search-row">
        <div className="mc-search-wrap">
          <div className="mc-search-glow" />
          <div className="mc-search-inner">
            <Search size={18} className="mc-search-icon" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Cari nama barang, kode, atau kategori..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mc-search-input"
            />
            {search ? (
              <button onClick={() => setSearch("")} className="mc-search-clear" aria-label="Clear search">
                <X size={14} />
              </button>
            ) : (
              <div className="mc-search-hint"><Command size={11} /> K</div>
            )}
          </div>
        </div>

        <button
          onClick={() => setShowFilters(v => !v)}
          className={`mc-filter-toggle ${showFilters || activeFilterCount > 0 ? "is-active" : ""}`}
        >
          <SlidersHorizontal size={16} />
          <span className="mc-filter-toggle-text">Filter</span>
          {activeFilterCount > 0 && <span className="mc-filter-badge">{activeFilterCount}</span>}
        </button>
      </div>

      {/* ================= FILTER PANEL ================= */}
      {showFilters && (
        <div className="mc-filter-panel">
          <div className="mc-filter-grid">
            <div className="mc-filter-field">
              <label><Tag size={12} /> Kategori</label>
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="mc-filter-select">
                <option value="all">Semua Kategori</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="mc-filter-field">
              <label><MapPin size={12} /> Lokasi</label>
              <select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} className="mc-filter-select">
                <option value="all">Semua Lokasi</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>

            <div className="mc-filter-field">
              <label><AlertTriangle size={12} /> Kondisi</label>
              <select value={filterCondition} onChange={(e) => setFilterCondition(e.target.value)} className="mc-filter-select">
                <option value="all">Semua Kondisi</option>
                <option value="has_damage">Ada Kerusakan</option>
                <option value="no_damage">Semua Baik</option>
              </select>
            </div>

            <div className="mc-filter-field">
              <label><Box size={12} /> Unit Fisik</label>
              <select value={filterUnit} onChange={(e) => setFilterUnit(e.target.value)} className="mc-filter-select">
                <option value="all">Semua</option>
                <option value="has_unit">Punya Unit</option>
                <option value="no_unit">Belum Punya</option>
              </select>
            </div>

            <div className="mc-filter-field">
              <label><ArrowUpDown size={12} /> Urutkan</label>
              <div className="mc-sort-group">
                <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); }} className="mc-filter-select">
                  <option value="name">Nama</option>
                  <option value="category">Kategori</option>
                  <option value="location">Lokasi</option>
                  <option value="units">Jumlah Unit</option>
                  <option value="condition">Kondisi</option>
                </select>
                <button
                  onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
                  className="mc-sort-dir"
                  title={sortDir === "asc" ? "A → Z" : "Z → A"}
                >
                  {sortDir === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>
            </div>
          </div>

          {activeFilterCount > 0 && (
            <div className="mc-active-filters">
              <span className="mc-active-label"><Filter size={11} /> Filter aktif:</span>

              {filterCategory !== "all" && (
                <span className="mc-filter-chip">
                  <Tag size={10} />
                  {categories.find(c => c.id === filterCategory)?.name || "Kategori"}
                  <button onClick={() => setFilterCategory("all")}><X size={10} /></button>
                </span>
              )}
              {filterLocation !== "all" && (
                <span className="mc-filter-chip">
                  <MapPin size={10} />
                  {locations.find(l => l.id === filterLocation)?.name || "Lokasi"}
                  <button onClick={() => setFilterLocation("all")}><X size={10} /></button>
                </span>
              )}
              {filterCondition !== "all" && (
                <span className="mc-filter-chip">
                  <AlertTriangle size={10} />
                  {filterCondition === "has_damage" ? "Ada Kerusakan" : "Semua Baik"}
                  <button onClick={() => setFilterCondition("all")}><X size={10} /></button>
                </span>
              )}
              {filterUnit !== "all" && (
                <span className="mc-filter-chip">
                  <Box size={10} />
                  {filterUnit === "has_unit" ? "Punya Unit" : "Belum Punya"}
                  <button onClick={() => setFilterUnit("all")}><X size={10} /></button>
                </span>
              )}

              <button onClick={resetFilters} className="mc-reset-btn">
                <X size={11} /> Reset semua
              </button>
            </div>
          )}
        </div>
      )}

      {/* ================= KONTEN ================= */}
      {loading && items.length === 0 ? (
        <div className="mc-skeleton">
          <div className="mc-skel-head" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="mc-skel-row" style={{ animationDelay: `${i * 0.06}s` }} />
          ))}
        </div>
      ) : sortedItems.length === 0 ? (
        <div className="mc-empty">
          <div className="mc-empty-glow" />
          <div className="mc-empty-icon"><PackageSearch size={40} /></div>
          <h3 className="mc-empty-title">
            {(search || activeFilterCount > 0) ? "Tidak ada hasil" : "Belum ada data barang"}
          </h3>
          <p className="mc-empty-sub">
            {(search || activeFilterCount > 0)
              ? "Tidak ditemukan barang cocok dengan pencarian atau filter."
              : "Silakan tambahkan barang baru secara manual atau import data dari file CSV untuk memulai inventarisasi."}
          </p>
          {(search || activeFilterCount > 0) ? (
            <button onClick={resetFilters} className="mc-empty-btn">Reset semua filter</button>
          ) : canWrite ? (
            <div className="mc-empty-actions">
              <button onClick={openAdd} className="mc-btn-primary"><Plus size={16} /> Tambah Barang Pertama</button>
              <button onClick={() => setShowImport(true)} className="mc-btn-secondary"><Upload size={16} /> Import CSV</button>
            </div>
          ) : null}
        </div>
      ) : (
        <div ref={tableRef} className="mc-table-section">
          <div className="mc-table-info">
            <div className="mc-table-info-left">
              <LayoutGrid size={13} />
              <span>
                Menampilkan <strong>{startIndex}–{endIndex}</strong> dari <strong>{sortedItems.length}</strong> barang
                {activeFilterCount > 0 && <> · <strong>{activeFilterCount}</strong> filter aktif</>}
              </span>
            </div>
            <div className="mc-table-info-right">
              Halaman <strong>{safePage}</strong> / {totalPages}
            </div>
          </div>

          <div className="mc-table-scroll-wrap">
            <ItemTable
              items={paginatedItems}
              loading={loading}
              onDelete={refetch}
              onDeleteClick={handleDeleteClick}
              canWrite={canWrite}
            />
          </div>

          {totalPages > 1 && (
            <div className="mc-pagination">
              <div className="mc-pagination-info">{startIndex}–{endIndex} / {sortedItems.length}</div>

              <div className="mc-pagination-controls">
                <button onClick={() => goToPage(1)} disabled={safePage === 1} className="mc-page-btn edge" title="Halaman pertama">
                  <ChevronsLeft size={14} />
                </button>
                <button onClick={() => goToPage(safePage - 1)} disabled={safePage === 1} className="mc-page-btn" title="Sebelumnya">
                  <ChevronLeft size={14} />
                </button>

                <div className="mc-page-numbers">
                  {buildPageNumbers(safePage, totalPages).map((p, i) =>
                    p === "..." ? (
                      <span key={`e${i}`} className="mc-page-ellipsis">…</span>
                    ) : (
                      <button key={p} onClick={() => goToPage(p)} className={`mc-page-num ${p === safePage ? "is-active" : ""}`}>
                        {p}
                      </button>
                    )
                  )}
                </div>

                <button onClick={() => goToPage(safePage + 1)} disabled={safePage === totalPages} className="mc-page-btn" title="Berikutnya">
                  <ChevronRight size={14} />
                </button>
                <button onClick={() => goToPage(totalPages)} disabled={safePage === totalPages} className="mc-page-btn edge" title="Halaman terakhir">
                  <ChevronsRight size={14} />
                </button>
              </div>

              <div className="mc-pagination-size"><span>{PAGE_SIZE} / hal</span></div>
            </div>
          )}
        </div>
      )}

      {/* ================= MODALS ================= */}
      {showForm && <ItemForm item={editing} onClose={() => setShowForm(false)} onSaved={refetch} />}
      {showImport && <ImportCSV onClose={() => setShowImport(false)} onImported={refetch} />}

      {/* ================= MODAL KONFIRMASI HAPUS ================= */}
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => !deleting && setConfirmDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Hapus Barang?"
        description={
          <>
            Barang <strong>"{confirmDelete?.name}"</strong> beserta{" "}
            <strong>semua unit fisiknya</strong> akan dihapus permanen.
            Tindakan ini tidak dapat dibatalkan.
          </>
        }
        confirmText="Hapus Barang"
        variant="danger"
      />
    </div>
  );
}

function buildPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("...");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push("...");
  pages.push(total);
  return pages;
}

/* ============================================================
   Styles — Tema Landing (Gold/Maroon/Navy)
============================================================ */
function ItemsStyles() {
  return (
    <style>{`
      /* CONTAINER */
      .mc-items {
        width: 100%; max-width: 100%;
        display: flex; flex-direction: column;
        gap: 1.1rem; padding-bottom: 2.5rem;
        position: relative;
      }
      .mc-items > * {
        opacity: 0; transform: translateY(14px);
        transition: opacity 0.5s var(--ease-out, cubic-bezier(0.16,1,0.3,1)),
                    transform 0.5s var(--ease-out, cubic-bezier(0.16,1,0.3,1));
      }
      .mc-items.is-mounted > * { opacity: 1; transform: translateY(0); }
      .mc-items.is-mounted > *:nth-child(1) { transition-delay: 0s; }
      .mc-items.is-mounted > *:nth-child(2) { transition-delay: 0.06s; }
      .mc-items.is-mounted > *:nth-child(3) { transition-delay: 0.12s; }
      .mc-items.is-mounted > *:nth-child(4) { transition-delay: 0.18s; }
      .mc-items.is-mounted > *:nth-child(5) { transition-delay: 0.24s; }

      /* HEADER */
      .mc-head { display: flex; flex-direction: column; gap: 1.25rem; }
      @media (min-width: 768px) {
        .mc-head { flex-direction: row; align-items: flex-end; justify-content: space-between; }
      }
      .mc-head-text { flex: 1; min-width: 0; }

      .mc-eyebrow {
        display: inline-flex; align-items: center; gap: 0.4rem;
        font-size: 0.7rem; font-weight: 700;
        color: var(--gold); background: var(--gold-soft);
        border: 1px solid color-mix(in srgb, var(--gold) 40%, transparent);
        padding: 0.35rem 0.75rem; border-radius: 999px;
        text-transform: uppercase; letter-spacing: 0.08em;
        margin-bottom: 0.65rem;
        animation: eyebrow-in 0.6s var(--ease-out, cubic-bezier(0.16,1,0.3,1)) both;
      }
      .mc-eyebrow svg { animation: eyebrow-spin 4s linear infinite; }
      @keyframes eyebrow-in {
        from { opacity: 0; transform: scale(0.9) translateY(4px); }
        to { opacity: 1; transform: scale(1) translateY(0); }
      }
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
        position: relative; overflow: hidden;
        transition: transform 0.3s var(--ease-spring, cubic-bezier(0.34,1.56,0.64,1));
        box-shadow: 0 4px 16px -4px color-mix(in srgb, var(--gold) 40%, transparent);
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
      .mc-title:hover .mc-title-icon { transform: scale(1.08) rotate(-5deg); }
      .mc-sub {
        font-size: 0.88rem; color: var(--text-muted);
        margin-left: 3.4rem; max-width: 620px; line-height: 1.55;
      }
      @media (max-width: 640px) {
        .mc-title { font-size: 1.5rem; }
        .mc-title-icon { width: 36px; height: 36px; }
        .mc-sub { margin-left: 0; }
      }

      .mc-head-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }
      .mc-btn-primary, .mc-btn-secondary {
        display: inline-flex; align-items: center; justify-content: center;
        gap: 0.4rem; padding: 0.65rem 1.1rem;
        border-radius: 10px; font-size: 0.82rem; font-weight: 700;
        text-decoration: none; border: 1.5px solid transparent;
        cursor: pointer; transition: all 0.25s var(--ease-spring, cubic-bezier(0.34,1.56,0.64,1));
        white-space: nowrap; position: relative; overflow: hidden;
        font-family: inherit;
      }
      .mc-btn-primary::before, .mc-btn-secondary::before {
        content: ''; position: absolute; inset: 0;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,.3), transparent);
        transform: translateX(-100%); transition: transform 0.6s ease;
        pointer-events: none;
      }
      .mc-btn-primary:hover::before, .mc-btn-secondary:hover::before { transform: translateX(100%); }
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
      .mc-btn-primary:active { transform: translateY(0); }
      .mc-btn-secondary {
        background: var(--surface); color: var(--text-main);
        border-color: var(--border);
      }
      .mc-btn-secondary:hover {
        background: var(--gold-soft); border-color: var(--gold);
        color: var(--gold); transform: translateY(-2px);
      }
      .mc-btn-secondary:hover svg { color: var(--gold); }

      /* STAT SUMMARY */
      .mc-stat-row {
        display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem;
      }
      @media (min-width: 640px) {
        .mc-stat-row { grid-template-columns: repeat(4, 1fr); }
      }
      .mc-stat-item {
        display: flex; align-items: center; gap: 0.65rem;
        background: var(--surface); border: 1px solid var(--border);
        border-radius: 14px; padding: 0.85rem 1rem;
        transition: all 0.25s var(--ease-spring, cubic-bezier(0.34,1.56,0.64,1));
        animation: stat-in 0.5s var(--ease-out, cubic-bezier(0.16,1,0.3,1)) both;
        position: relative; overflow: hidden;
        cursor: default;
      }
      .mc-stat-item::before {
        content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
        background: linear-gradient(90deg, transparent, var(--stat-accent, var(--gold)), transparent);
        opacity: 0; transition: opacity 0.3s;
      }
      .mc-stat-item:hover {
        border-color: color-mix(in srgb, var(--stat-accent, var(--gold)) 40%, var(--border));
        transform: translateY(-3px);
        box-shadow: 0 8px 24px -8px rgba(0,0,0,0.15);
      }
      .mc-stat-item:hover::before { opacity: 1; }
      @keyframes stat-in {
        from { opacity: 0; transform: translateY(8px) scale(0.98); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      .mc-stat-icon {
        width: 38px; height: 38px; border-radius: 10px;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
        transition: transform 0.3s var(--ease-spring, cubic-bezier(0.34,1.56,0.64,1));
      }
      .mc-stat-item:hover .mc-stat-icon { transform: scale(1.1) rotate(-4deg); }
      .mc-stat-icon.blue { background: rgba(212,175,55,0.15); color: #D4AF37; }
      .mc-stat-icon.green { background: rgba(16,185,129,0.12); color: #10B981; }
      .mc-stat-icon.purple { background: rgba(139,92,246,0.12); color: #8B5CF6; }
      .mc-stat-icon.orange { background: rgba(245,158,11,0.12); color: #F59E0B; }
      .mc-stat-body { min-width: 0; flex: 1; }
      .mc-stat-val {
        font-family: 'Playfair Display', Georgia, serif;
        font-size: 1.25rem; font-weight: 800;
        color: var(--text-main); line-height: 1;
        font-variant-numeric: tabular-nums;
      }
      .mc-stat-lbl {
        font-size: 0.68rem; font-weight: 600;
        color: var(--text-muted);
        text-transform: uppercase; letter-spacing: 0.04em;
        margin-top: 3px;
      }
      .mc-stat-arrow {
        color: var(--text-muted); opacity: 0;
        transform: translateX(-4px);
        transition: all 0.3s;
        flex-shrink: 0;
      }
      .mc-stat-item:hover .mc-stat-arrow {
        opacity: 1; transform: translateX(0);
        color: var(--stat-accent, var(--gold));
      }

      /* SEARCH ROW */
      .mc-search-row {
        display: flex; gap: 0.6rem; align-items: stretch;
      }
      .mc-search-row > .mc-search-wrap { flex: 1; min-width: 0; }
      .mc-search-wrap { position: relative; }
      .mc-search-glow {
        position: absolute; inset: -2px;
        background: linear-gradient(135deg, var(--gold), var(--maroon-light));
        border-radius: 14px;
        opacity: 0; transition: opacity 0.3s;
        pointer-events: none; filter: blur(10px);
      }
      .mc-search-wrap:focus-within .mc-search-glow { opacity: 0.3; }
      .mc-search-inner {
        position: relative;
        background: var(--surface);
        border: 1.5px solid var(--border);
        border-radius: 12px;
        display: flex; align-items: center; gap: 0.6rem;
        padding: 0 0.9rem;
        transition: border-color 0.25s, box-shadow 0.25s;
      }
      .mc-search-inner:focus-within {
        border-color: var(--gold);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--gold) 15%, transparent);
      }
      .mc-search-icon {
        color: var(--text-muted); flex-shrink: 0;
        transition: color 0.25s, transform 0.25s;
      }
      .mc-search-inner:focus-within .mc-search-icon {
        color: var(--gold); transform: scale(1.1);
      }
      .mc-search-input {
        flex: 1; border: none; background: transparent;
        color: var(--text-main); font-size: 0.9rem;
        font-family: inherit; padding: 0.85rem 0;
        outline: none;
      }
      .mc-search-input::placeholder { color: var(--text-muted); opacity: 0.6; }
      .mc-search-hint {
        display: inline-flex; align-items: center; gap: 0.25rem;
        font-size: 0.7rem; font-weight: 700;
        color: var(--text-muted); background: var(--background);
        border: 1px solid var(--border);
        padding: 0.25rem 0.5rem; border-radius: 6px;
        flex-shrink: 0;
        animation: hint-pulse 2.5s ease-in-out infinite;
      }
      @keyframes hint-pulse {
        0%, 100% { opacity: 0.7; }
        50% { opacity: 1; }
      }
      .mc-search-clear {
        width: 26px; height: 26px; border-radius: 50%;
        background: var(--background);
        border: 1px solid var(--border);
        color: var(--text-muted);
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; transition: all 0.2s; flex-shrink: 0;
      }
      .mc-search-clear:hover {
        background: var(--gold); color: white;
        border-color: var(--gold); transform: rotate(90deg);
      }
      .mc-filter-toggle {
        display: inline-flex; align-items: center; gap: 0.4rem;
        padding: 0 1rem; border-radius: 12px;
        border: 1.5px solid var(--border);
        background: var(--surface); color: var(--text-main);
        font-size: 0.82rem; font-weight: 700;
        cursor: pointer; transition: all 0.2s;
        font-family: inherit; white-space: nowrap; position: relative;
      }
      .mc-filter-toggle:hover {
        border-color: color-mix(in srgb, var(--gold) 50%, var(--border));
        color: var(--gold);
      }
      .mc-filter-toggle.is-active {
        background: var(--gold-soft);
        border-color: color-mix(in srgb, var(--gold) 50%, var(--border));
        color: var(--gold);
      }
      .mc-filter-badge {
        display: inline-flex; align-items: center; justify-content: center;
        min-width: 18px; height: 18px; padding: 0 0.35rem;
        border-radius: 999px;
        background: linear-gradient(135deg, var(--gold) 0%, var(--maroon-light) 100%);
        color: white;
        font-size: 0.62rem; font-weight: 800;
        box-shadow: 0 2px 8px -2px color-mix(in srgb, var(--gold) 50%, transparent);
      }
      @media (max-width: 640px) {
        .mc-search-row { flex-direction: column; }
        .mc-filter-toggle { padding: 0.7rem 1rem; justify-content: center; }
      }

      /* FILTER PANEL */
      .mc-filter-panel {
        background: var(--surface); border: 1px solid var(--border);
        border-radius: 14px; padding: 1rem;
        animation: panel-in 0.3s var(--ease-out, cubic-bezier(0.16,1,0.3,1));
        display: flex; flex-direction: column; gap: 0.85rem;
        position: relative; overflow: hidden;
      }
      .mc-filter-panel::before {
        content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
        background: linear-gradient(90deg, transparent, var(--gold), transparent);
        opacity: 0.6;
      }
      @keyframes panel-in {
        from { opacity: 0; transform: translateY(-6px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .mc-filter-grid {
        display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem;
      }
      @media (min-width: 768px) {
        .mc-filter-grid { grid-template-columns: repeat(3, 1fr); }
      }
      @media (min-width: 1024px) {
        .mc-filter-grid { grid-template-columns: repeat(5, 1fr); }
      }
      .mc-filter-field { display: flex; flex-direction: column; gap: 0.35rem; }
      .mc-filter-field label {
        display: flex; align-items: center; gap: 0.3rem;
        font-size: 0.68rem; font-weight: 700;
        color: var(--text-muted);
        text-transform: uppercase; letter-spacing: 0.05em;
      }
      .mc-filter-field label svg { color: var(--gold); }
      .mc-filter-select {
        width: 100%; padding: 0.55rem 1.8rem 0.55rem 0.7rem;
        border-radius: 9px; border: 1.5px solid var(--border);
        background: var(--background); color: var(--text-main);
        font-size: 0.82rem; font-weight: 600;
        font-family: inherit; cursor: pointer;
        transition: all 0.2s; appearance: none;
        background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
        background-repeat: no-repeat;
        background-position: right 0.6rem center;
      }
      .mc-filter-select:focus {
        outline: none; border-color: var(--gold);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--gold) 15%, transparent);
      }
      .mc-sort-group { display: flex; gap: 0.3rem; }
      .mc-sort-group .mc-filter-select { flex: 1; }
      .mc-sort-dir {
        width: 34px; border-radius: 9px;
        border: 1.5px solid var(--border);
        background: var(--background); color: var(--text-main);
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; transition: all 0.2s; padding: 0;
      }
      .mc-sort-dir:hover {
        border-color: color-mix(in srgb, var(--gold) 50%, var(--border));
        color: var(--gold);
        background: var(--gold-soft);
      }
      .mc-active-filters {
        display: flex; flex-wrap: wrap; align-items: center; gap: 0.35rem;
        padding-top: 0.75rem;
        border-top: 1px dashed var(--border);
      }
      .mc-active-label {
        display: inline-flex; align-items: center; gap: 0.25rem;
        font-size: 0.7rem; font-weight: 700;
        color: var(--text-muted); margin-right: 0.25rem;
      }
      .mc-active-label svg { color: var(--gold); }
      .mc-filter-chip {
        display: inline-flex; align-items: center; gap: 0.3rem;
        padding: 0.25rem 0.4rem 0.25rem 0.55rem;
        border-radius: 999px;
        background: var(--gold-soft);
        border: 1px solid color-mix(in srgb, var(--gold) 40%, transparent);
        color: var(--gold);
        font-size: 0.7rem; font-weight: 700;
        max-width: 100%;
      }
      .mc-filter-chip button {
        width: 16px; height: 16px; border-radius: 50%;
        background: var(--gold); color: white; border: none;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; padding: 0; flex-shrink: 0;
        transition: all 0.15s;
      }
      .mc-filter-chip button:hover {
        transform: scale(1.15);
        background: var(--maroon-light);
      }
      .mc-reset-btn {
        display: inline-flex; align-items: center; gap: 0.3rem;
        padding: 0.3rem 0.65rem; border-radius: 7px;
        background: transparent; border: 1px solid var(--border);
        color: var(--text-muted);
        font-size: 0.7rem; font-weight: 700;
        cursor: pointer; transition: all 0.2s;
        font-family: inherit; margin-left: auto;
      }
      .mc-reset-btn:hover {
        background: rgba(239,68,68,0.08);
        border-color: #EF4444; color: #DC2626;
      }

      /* SKELETON */
      .mc-skeleton {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 18px; overflow: hidden;
      }
      .mc-skel-head {
        height: 56px; background: var(--background);
        border-bottom: 1px solid var(--border);
        animation: pulse 1.5s ease-in-out infinite;
      }
      .mc-skel-row {
        height: 64px; background: var(--surface);
        border-bottom: 1px solid var(--border);
        animation: pulse 1.5s ease-in-out infinite;
      }
      .mc-skel-row:last-child { border-bottom: none; }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      /* EMPTY */
      .mc-empty {
        position: relative;
        background: var(--surface);
        border: 1.5px dashed var(--border);
        border-radius: 18px;
        padding: 3.5rem 1.5rem;
        text-align: center;
        display: flex; flex-direction: column; align-items: center;
        gap: 0.5rem; overflow: hidden;
      }
      .mc-empty-glow {
        position: absolute; top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        width: 320px; height: 320px;
        background: radial-gradient(circle, color-mix(in srgb, var(--gold) 20%, transparent) 0%, transparent 70%);
        filter: blur(40px); opacity: 0.6; pointer-events: none;
        animation: empty-pulse 4s ease-in-out infinite;
      }
      @keyframes empty-pulse {
        0%, 100% { opacity: 0.4; transform: translate(-50%, -50%) scale(1); }
        50% { opacity: 0.7; transform: translate(-50%, -50%) scale(1.1); }
      }
      .mc-empty-icon {
        position: relative; z-index: 1;
        width: 80px; height: 80px;
        border-radius: 50%;
        background: var(--background);
        border: 1px solid var(--border);
        color: var(--text-muted);
        display: flex; align-items: center; justify-content: center;
        margin-bottom: 0.75rem;
        animation: icon-float 3s ease-in-out infinite;
      }
      @keyframes icon-float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-6px); }
      }
      .mc-empty-title {
        position: relative; z-index: 1;
        font-family: 'Playfair Display', Georgia, serif;
        font-size: 1.15rem; font-weight: 800;
        color: var(--text-main);
      }
      .mc-empty-sub {
        position: relative; z-index: 1;
        font-size: 0.88rem; color: var(--text-muted);
        max-width: 420px; line-height: 1.55;
      }
      .mc-empty-actions {
        position: relative; z-index: 1;
        display: flex; flex-wrap: wrap; gap: 0.5rem;
        margin-top: 1rem;
      }
      .mc-empty-btn {
        position: relative; z-index: 1;
        margin-top: 0.75rem;
        padding: 0.5rem 1rem; border-radius: 8px;
        background: var(--gold-soft); color: var(--gold);
        border: 1px solid color-mix(in srgb, var(--gold) 40%, transparent);
        font-weight: 600; font-size: 0.8rem;
        cursor: pointer; transition: all 0.2s;
        font-family: inherit;
      }
      .mc-empty-btn:hover {
        background: var(--gold); color: white;
        transform: translateY(-1px);
        box-shadow: 0 4px 16px -4px color-mix(in srgb, var(--gold) 50%, transparent);
      }

      /* TABLE SECTION */
      .mc-table-section { display: flex; flex-direction: column; gap: 0.65rem; width: 100%; }
      .mc-table-info {
        display: flex; align-items: center; justify-content: space-between;
        gap: 1rem; padding: 0 0.25rem;
        font-size: 0.78rem; color: var(--text-muted);
      }
      .mc-table-info-left {
        display: inline-flex; align-items: center; gap: 0.4rem; min-width: 0;
      }
      .mc-table-info-left svg { color: var(--gold); flex-shrink: 0; }
      .mc-table-info-left strong,
      .mc-table-info-right strong {
        color: var(--text-main); font-weight: 800;
        font-variant-numeric: tabular-nums;
      }
      .mc-table-info-right {
        font-variant-numeric: tabular-nums; white-space: nowrap;
      }
      @media (max-width: 640px) {
        .mc-table-info-right { display: none; }
      }

      .mc-table-scroll-wrap {
        max-height: 70vh;
        overflow-y: auto; overflow-x: auto;
        border-radius: 18px;
        scrollbar-width: thin;
        scrollbar-color: var(--border) transparent;
        isolation: isolate; position: relative; width: 100%;
        box-shadow: 0 1px 3px rgba(0,0,0,0.03);
      }
      .mc-table-scroll-wrap::-webkit-scrollbar { width: 8px; height: 6px; }
      .mc-table-scroll-wrap::-webkit-scrollbar-track { background: transparent; }
      .mc-table-scroll-wrap::-webkit-scrollbar-thumb {
        background: var(--border); border-radius: 4px;
      }
      .mc-table-scroll-wrap::-webkit-scrollbar-thumb:hover {
        background: var(--text-muted);
      }
      .mc-table-scroll-wrap > .mc-table-card {
        border: 1px solid var(--border);
        border-radius: 18px;
        box-shadow: none;
        width: 100%;
      }
      .mc-table-scroll-wrap .mc-table thead th {
        position: sticky; top: 0; z-index: 3;
        background: var(--background);
        border-bottom: 1.5px solid var(--border);
      }
      .mc-table-scroll-wrap .mc-table thead { background: var(--background); }

      /* PAGINATION */
      .mc-pagination {
        display: flex; align-items: center; justify-content: space-between;
        gap: 1rem;
        padding: 0.65rem 0.85rem;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 12px;
        flex-wrap: wrap;
      }
      .mc-pagination-info {
        font-size: 0.75rem; color: var(--text-muted);
        font-variant-numeric: tabular-nums; font-weight: 600;
      }
      .mc-pagination-controls {
        display: flex; align-items: center; gap: 0.25rem;
      }
      .mc-page-btn {
        width: 32px; height: 32px; border-radius: 8px;
        background: var(--background);
        border: 1px solid var(--border);
        color: var(--text-main);
        display: flex; align-items: center; justify-content: center;
        cursor: pointer;
        transition: all 0.2s var(--ease-spring, cubic-bezier(0.34,1.56,0.64,1));
        font-family: inherit; padding: 0;
      }
      .mc-page-btn:hover:not(:disabled) {
        border-color: color-mix(in srgb, var(--gold) 50%, var(--border));
        color: var(--gold);
        background: var(--gold-soft);
        transform: translateY(-1px);
      }
      .mc-page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
      .mc-page-btn.edge { color: var(--text-muted); }
      .mc-page-numbers {
        display: flex; align-items: center; gap: 0.2rem; padding: 0 0.25rem;
      }
      .mc-page-num {
        min-width: 32px; height: 32px; padding: 0 0.5rem;
        border-radius: 8px; background: transparent;
        border: 1px solid transparent;
        color: var(--text-muted);
        font-size: 0.78rem; font-weight: 700;
        cursor: pointer;
        transition: all 0.2s var(--ease-spring, cubic-bezier(0.34,1.56,0.64,1));
        font-family: inherit; font-variant-numeric: tabular-nums;
      }
      .mc-page-num:hover:not(.is-active) {
        background: var(--background); color: var(--text-main);
        border-color: var(--border); transform: translateY(-1px);
      }
      .mc-page-num.is-active {
        background: linear-gradient(135deg, var(--gold) 0%, var(--maroon-light) 100%);
        color: white;
        border-color: var(--gold);
        box-shadow: 0 4px 12px -2px color-mix(in srgb, var(--gold) 50%, transparent);
        transform: scale(1.05);
      }
      .mc-page-ellipsis {
        padding: 0 0.35rem; color: var(--text-muted);
        font-size: 0.8rem; font-weight: 600; user-select: none;
      }
      .mc-pagination-size {
        font-size: 0.72rem; color: var(--text-muted);
        font-weight: 600; white-space: nowrap;
      }
      @media (max-width: 640px) {
        .mc-pagination { justify-content: center; gap: 0.5rem; }
        .mc-pagination-info, .mc-pagination-size { display: none; }
        .mc-page-btn.edge { display: none; }
        .mc-page-num { min-width: 28px; height: 28px; }
      }
      @media (max-width: 768px) {
        .mc-table-scroll-wrap { max-height: 60vh; }
      }
    `}</style>
  );
}