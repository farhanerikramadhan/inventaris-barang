import { useEffect, useState, useMemo } from "react";
import {
  FileBarChart, Sparkles, Package, Box, MapPin, Tag,
  CheckCircle2, AlertTriangle, XCircle, Download,
  Printer, Calendar, Filter, RefreshCw, ChevronRight,
  ChevronDown, ChevronUp, BarChart3, PieChart as PieIcon,
  AlertCircle, ArrowUpDown, Eye, Search, X, Hash,
  Building2, TrendingUp, TrendingDown, Minus,
  ChevronLeft, Info
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  CartesianGrid,
} from "recharts";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../stores/authStore";

/* ── Pagination ── */
const DETAIL_PAGE_SIZE = 15;
const UNIT_PAGE_SIZE = 20;

/* ── Helper ── */
function getUnitsOfItem(item, unitsByItem) {
  if (!item) return [];
  if (Array.isArray(item.item_units)) return item.item_units;
  return unitsByItem?.[item.id] || [];
}
function getTotalUnits(item, unitsByItem) {
  return getUnitsOfItem(item, unitsByItem).length;
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

const CONDITION_META = {
  baik:         { label: "Baik",          color: "#10B981", bg: "rgba(16,185,129,0.12)",  icon: CheckCircle2 },
  rusak_ringan: { label: "Rusak Ringan",  color: "#F59E0B", bg: "rgba(245,158,11,0.12)",  icon: AlertTriangle },
  rusak_berat:  { label: "Rusak Berat",   color: "#EF4444", bg: "rgba(239,68,68,0.12)",   icon: XCircle },
};

const STATUS_META = {
  active:      { label: "Aktif",      color: "#3B82F6" },
  rusak:       { label: "Rusak",      color: "#EF4444" },
  hilang:      { label: "Hilang",     color: "#6B7280" },
  dipinjam:    { label: "Dipinjam",   color: "#F59E0B" },
  maintenance: { label: "Perbaikan",  color: "#EAB308" },
};

const kelayakanMeta = (pct) => {
  if (pct >= 80) return { label: "Layak", color: "#10B981", bg: "rgba(16,185,129,0.12)", icon: CheckCircle2 };
  if (pct >= 50) return { label: "Perlu Perhatian", color: "#F59E0B", bg: "rgba(245,158,11,0.12)", icon: AlertTriangle };
  return { label: "Kritis", color: "#EF4444", bg: "rgba(239,68,68,0.12)", icon: XCircle };
};

export default function Reports() {
  const { profile } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [activeTab, setActiveTab] = useState("detail");
  const [mounted, setMounted] = useState(false);

  // Filter & search
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterLocation, setFilterLocation] = useState("all");
  const [filterCondition, setFilterCondition] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState("asc");

  // Expanded row
  const [expandedId, setExpandedId] = useState(null);

  // Pagination
  const [detailPage, setDetailPage] = useState(1);
  const [unitPage, setUnitPage] = useState(1);

  // Modal detail
  const [detailModal, setDetailModal] = useState(null);

  useEffect(() => {
    setMounted(true);
    fetchAll();
  }, []);

  useEffect(() => {
    setDetailPage(1);
    setUnitPage(1);
  }, [search, filterCategory, filterLocation, filterCondition]);

  // ESC + lock scroll untuk modal
  useEffect(() => {
    if (!detailModal) return;
    const handler = (e) => {
      if (e.key === "Escape") setDetailModal(null);
    };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [detailModal]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [itemsRes, catsRes, locsRes] = await Promise.all([
        supabase.from("items").select(`
          id, name, notes, created_at, category_id, location_id,
          category:categories(id, name),
          location:locations(id, name),
          item_units(id, unit_number, unit_code, condition, status, notes)
        `).order("name"),
        supabase.from("categories").select("id, name").order("name"),
        supabase.from("locations").select("id, name").order("name"),
      ]);
      setItems(itemsRes.data || []);
      setCategories(catsRes.data || []);
      setLocations(locsRes.data || []);
    } catch (err) {
      console.error("Gagal fetch laporan:", err);
    } finally {
      setLoading(false);
    }
  };

  const unitsByItem = useMemo(() => {
    const map = {};
    items.forEach(it => {
      map[it.id] = Array.isArray(it.item_units) ? it.item_units : [];
    });
    return map;
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(it => {
      if (filterCategory !== "all" && it.category_id !== filterCategory) return false;
      if (filterLocation !== "all" && it.location_id !== filterLocation) return false;
      if (search) {
        const q = search.toLowerCase();
        const itemUnits = getUnitsOfItem(it, unitsByItem);
        const matchCode = itemUnits.some(u => (u.unit_code || "").toLowerCase().includes(q));
        if (
          !it.name.toLowerCase().includes(q) &&
          !matchCode &&
          !(it.category?.name || "").toLowerCase().includes(q) &&
          !(it.location?.name || "").toLowerCase().includes(q)
        ) return false;
      }
      if (filterCondition === "has_damage") {
        const itemUnits = getUnitsOfItem(it, unitsByItem);
        if (!itemUnits.some(u => u.condition !== "baik")) return false;
      }
      if (filterCondition === "no_damage") {
        const itemUnits = getUnitsOfItem(it, unitsByItem);
        if (itemUnits.some(u => u.condition !== "baik")) return false;
      }
      return true;
    });
  }, [items, search, filterCategory, filterLocation, filterCondition, unitsByItem]);

  const enrichedItems = useMemo(() => {
    return filteredItems.map(it => {
      const itemUnits = getUnitsOfItem(it, unitsByItem);
      const total = itemUnits.length;
      const baik = itemUnits.filter(u => u.condition === "baik").length;
      const rusakRingan = itemUnits.filter(u => u.condition === "rusak_ringan").length;
      const rusakBerat = itemUnits.filter(u => u.condition === "rusak_berat").length;
      const pct = total ? Math.round((baik / total) * 100) : 0;
      return {
        ...it,
        itemUnits,
        total,
        baik,
        rusakRingan,
        rusakBerat,
        pct,
        kelayakan: kelayakanMeta(pct),
      };
    });
  }, [filteredItems, unitsByItem]);

  const sortedItems = useMemo(() => {
    const arr = [...enrichedItems];
    arr.sort((a, b) => {
      let va, vb;
      switch (sortBy) {
        case "units":    va = a.total;     vb = b.total;     break;
        case "damaged":  va = a.rusakRingan + a.rusakBerat; vb = b.rusakRingan + b.rusakBerat; break;
        case "pct":      va = a.pct;       vb = b.pct;       break;
        case "category": va = a.category?.name || ""; vb = b.category?.name || ""; break;
        case "location": va = a.location?.name || ""; vb = b.location?.name || ""; break;
        default:         va = a.name.toLowerCase(); vb = b.name.toLowerCase();
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [enrichedItems, sortBy, sortDir]);

  // Detail Barang: pagination
  const detailTotalPages = Math.max(1, Math.ceil(sortedItems.length / DETAIL_PAGE_SIZE));
  const detailSafePage = Math.min(detailPage, detailTotalPages);
  const paginatedDetail = useMemo(() => {
    const start = (detailSafePage - 1) * DETAIL_PAGE_SIZE;
    return sortedItems.slice(start, start + DETAIL_PAGE_SIZE);
  }, [sortedItems, detailSafePage]);

  const detailStart = sortedItems.length === 0 ? 0 : (detailSafePage - 1) * DETAIL_PAGE_SIZE + 1;
  const detailEnd = Math.min(detailSafePage * DETAIL_PAGE_SIZE, sortedItems.length);

  // Detail Unit: pagination
  const allUnitsFlat = useMemo(() => {
    const arr = [];
    sortedItems.forEach((it) => {
      (it.itemUnits || []).forEach((u) => {
        arr.push({ ...u, item: it });
      });
    });
    return arr;
  }, [sortedItems]);

  const unitTotalPages = Math.max(1, Math.ceil(allUnitsFlat.length / UNIT_PAGE_SIZE));
  const unitSafePage = Math.min(unitPage, unitTotalPages);
  const paginatedUnits = useMemo(() => {
    const start = (unitSafePage - 1) * UNIT_PAGE_SIZE;
    return allUnitsFlat.slice(start, start + UNIT_PAGE_SIZE);
  }, [allUnitsFlat, unitSafePage]);

  const unitStart = allUnitsFlat.length === 0 ? 0 : (unitSafePage - 1) * UNIT_PAGE_SIZE + 1;
  const unitEnd = Math.min(unitSafePage * UNIT_PAGE_SIZE, allUnitsFlat.length);

  // Stats global
  const stats = useMemo(() => {
    const totalItems = filteredItems.length;
    const totalUnits = filteredItems.reduce((sum, it) => sum + getTotalUnits(it, unitsByItem), 0);
    let baik = 0, rusakRingan = 0, rusakBerat = 0;
    filteredItems.forEach(it => {
      getUnitsOfItem(it, unitsByItem).forEach(u => {
        if (u.condition === "baik") baik++;
        else if (u.condition === "rusak_ringan") rusakRingan++;
        else if (u.condition === "rusak_berat") rusakBerat++;
      });
    });
    const persenBaik = totalUnits ? Math.round((baik / totalUnits) * 100) : 0;
    return { totalItems, totalUnits, baik, rusakRingan, rusakBerat, persenBaik };
  }, [filteredItems, unitsByItem]);

  const byCategory = useMemo(() => {
    const map = {};
    filteredItems.forEach(it => {
      const name = it.category?.name || "Tanpa Kategori";
      if (!map[name]) map[name] = { name, items: 0, units: 0, baik: 0 };
      map[name].items++;
      getUnitsOfItem(it, unitsByItem).forEach(u => {
        map[name].units++;
        if (u.condition === "baik") map[name].baik++;
      });
    });
    return Object.values(map)
      .map(c => ({ ...c, pct: c.units ? Math.round((c.baik / c.units) * 100) : 0 }))
      .sort((a, b) => b.units - a.units);
  }, [filteredItems, unitsByItem]);

  const byLocation = useMemo(() => {
    const map = {};
    filteredItems.forEach(it => {
      const name = it.location?.name || "Tanpa Lokasi";
      if (!map[name]) map[name] = { name, items: 0, units: 0, baik: 0 };
      map[name].items++;
      getUnitsOfItem(it, unitsByItem).forEach(u => {
        map[name].units++;
        if (u.condition === "baik") map[name].baik++;
      });
    });
    return Object.values(map)
      .map(l => ({ ...l, pct: l.units ? Math.round((l.baik / l.units) * 100) : 0 }))
      .sort((a, b) => b.units - a.units);
  }, [filteredItems, unitsByItem]);

  const byCondition = useMemo(() => {
    return [
      { name: "Baik", value: stats.baik, color: CONDITION_META.baik.color },
      { name: "Rusak Ringan", value: stats.rusakRingan, color: CONDITION_META.rusak_ringan.color },
      { name: "Rusak Berat", value: stats.rusakBerat, color: CONDITION_META.rusak_berat.color },
    ].filter(c => c.value > 0);
  }, [stats]);

  const damagedItems = useMemo(() => {
    return enrichedItems
      .filter(it => it.rusakRingan > 0 || it.rusakBerat > 0)
      .sort((a, b) => (b.rusakRingan + b.rusakBerat) - (a.rusakRingan + a.rusakBerat));
  }, [enrichedItems]);

  const exportCSV = () => {
    const rows = [
      ["LAPORAN INVENTARIS LENGKAP"],
      ["Dicetak oleh", profile?.full_name || "-"],
      ["Tanggal", new Date().toLocaleString("id-ID")],
      ["Filter Kategori", filterCategory === "all" ? "Semua" : categories.find(c => c.id === filterCategory)?.name || "-"],
      ["Filter Lokasi", filterLocation === "all" ? "Semua" : locations.find(l => l.id === filterLocation)?.name || "-"],
      [],
      ["RINGKASAN"],
      ["Total Barang", stats.totalItems],
      ["Total Unit Fisik", stats.totalUnits],
      ["Kondisi Baik", stats.baik],
      ["Rusak Ringan", stats.rusakRingan],
      ["Rusak Berat", stats.rusakBerat],
      ["Persentase Baik", `${stats.persenBaik}%`],
      [],
      ["DETAIL PER BARANG"],
      ["No", "Nama Barang", "Kategori", "Lokasi", "Total Unit", "Baik", "Rusak Ringan", "Rusak Berat", "% Baik", "Kelayakan", "Catatan"],
      ...sortedItems.map((it, i) => [
        i + 1, it.name, it.category?.name || "-", it.location?.name || "-",
        it.total, it.baik, it.rusakRingan, it.rusakBerat,
        `${it.pct}%`, it.kelayakan.label, it.notes || "",
      ]),
      [],
      ["DETAIL UNIT PER BARANG"],
      ["Nama Barang", "Kode Unit", "No Urut", "Kondisi", "Status", "Catatan"],
      ...sortedItems.flatMap(it =>
        (it.itemUnits || []).map(u => [
          it.name, u.unit_code || "-", u.unit_number,
          CONDITION_META[u.condition]?.label || u.condition,
          STATUS_META[u.status]?.label || u.status,
          u.notes || "",
        ])
      ),
      [],
      ["PER KATEGORI"],
      ["Kategori", "Barang", "Unit", "Baik", "% Baik"],
      ...byCategory.map(c => [c.name, c.items, c.units, c.baik, `${c.pct}%`]),
      [],
      ["PER LOKASI"],
      ["Lokasi", "Barang", "Unit", "Baik", "% Baik"],
      ...byLocation.map(l => [l.name, l.items, l.units, l.baik, `${l.pct}%`]),
    ];

    const csv = rows.map(row =>
      row.map(cell => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")
    ).join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-lengkap-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSort = (key) => {
    if (sortBy === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortBy(key); setSortDir("asc"); }
  };

  const resetFilters = () => {
    setSearch("");
    setFilterCategory("all");
    setFilterLocation("all");
    setFilterCondition("all");
  };

  const hasFilter = search || filterCategory !== "all" || filterLocation !== "all" || filterCondition !== "all";

  const TABS = [
    { key: "detail",    label: "Detail Barang",   icon: Package },
    { key: "units",     label: "Detail Unit",     icon: Box },
    { key: "category",  label: "Per Kategori",    icon: Tag },
    { key: "location",  label: "Per Lokasi",      icon: MapPin },
    { key: "condition", label: "Kondisi",         icon: PieIcon },
    { key: "damaged",   label: "Perlu Perhatian", icon: AlertCircle, badge: damagedItems.length },
  ];

  return (
    <div className={`mc-reports ${mounted ? "is-mounted" : ""}`}>
      <ReportStyles />

      {/* HEADER */}
      <div className="mc-head">
        <div className="mc-head-text">
          <div className="mc-eyebrow">
            <Sparkles size={12} />
            <span>Laporan Lengkap</span>
          </div>
          <h1 className="mc-title">
            <span className="mc-title-icon"><FileBarChart size={22} /></span>
            Laporan Inventaris
          </h1>
          <p className="mc-sub">
            Laporan lengkap kondisi aset — per barang, per unit, per kategori, &amp; per lokasi.
          </p>
        </div>

        <div className="mc-head-actions">
          <button onClick={fetchAll} className="mc-btn-secondary" disabled={loading}>
            <RefreshCw size={16} className={loading ? "mc-spin" : ""} /> Refresh
          </button>
          <button onClick={exportCSV} className="mc-btn-secondary" disabled={loading}>
            <Download size={16} /> Export CSV
          </button>
         <button
  onClick={() => {
    const params = new URLSearchParams();
    if (filterCategory !== "all") params.set("category", filterCategory);
    if (filterLocation !== "all") params.set("location", filterLocation);
    if (filterCondition !== "all") params.set("condition", filterCondition);
    const qs = params.toString();
    window.open(`/reports/print${qs ? "?" + qs : ""}`, "_blank");
  }}
  className="mc-btn-primary"
  disabled={loading}
>
  <Printer size={16} /> Cetak
</button>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="mc-stat-grid">
        {[
          { label: "Total Barang",     value: stats.totalItems,  icon: Package,      color: "#3B82F6", bg: "rgba(59,130,246,0.12)" },
          { label: "Total Unit Fisik", value: stats.totalUnits,  icon: Box,          color: "#8B5CF6", bg: "rgba(139,92,246,0.12)" },
          { label: "Kondisi Baik",     value: `${stats.persenBaik}%`, sub: `${stats.baik} unit`, icon: CheckCircle2, color: "#10B981", bg: "rgba(16,185,129,0.12)" },
          { label: "Perlu Perhatian",  value: stats.rusakRingan + stats.rusakBerat, sub: "unit rusak", icon: AlertTriangle, color: "#EF4444", bg: "rgba(239,68,68,0.12)" },
        ].map((s, i) => (
          <div key={s.label} className="mc-stat-card" style={{ animationDelay: `${i * 0.06}s` }}>
            <div className="mc-stat-icon" style={{ background: s.bg, color: s.color }}>
              <s.icon size={18} />
            </div>
            <div className="mc-stat-body">
              <p className="mc-stat-label">{s.label}</p>
              <p className="mc-stat-value">{s.value}</p>
              {s.sub && <p className="mc-stat-sub">{s.sub}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* FILTER */}
      <div className="mc-filter-panel">
        <div className="mc-search-row">
          <Search size={16} className="mc-search-icon" />
          <input
            type="text"
            placeholder="Cari barang, kode unit, kategori, lokasi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mc-search-input"
          />
          {search && (
            <button onClick={() => setSearch("")} className="mc-search-clear">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="mc-filter-row">
          <div className="mc-filter-group">
            <Tag size={12} />
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="all">Semua Kategori</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="mc-filter-group">
            <MapPin size={12} />
            <select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)}>
              <option value="all">Semua Lokasi</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          <div className="mc-filter-group">
            <AlertTriangle size={12} />
            <select value={filterCondition} onChange={(e) => setFilterCondition(e.target.value)}>
              <option value="all">Semua Kondisi</option>
              <option value="has_damage">Ada Kerusakan</option>
              <option value="no_damage">Semua Baik</option>
            </select>
          </div>

          {hasFilter && (
            <button onClick={resetFilters} className="mc-filter-reset">
              <X size={12} /> Reset
            </button>
          )}

          <span className="mc-filter-count">{sortedItems.length} barang</span>
        </div>
      </div>

      {/* TABS */}
      <div className="mc-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`mc-tab ${activeTab === t.key ? "is-active" : ""}`}
          >
            <t.icon size={14} />
            <span>{t.label}</span>
            {t.badge > 0 && <span className="mc-tab-badge">{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      {loading ? (
        <div className="mc-loading">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="mc-skel-row" style={{ animationDelay: `${i * 0.06}s` }} />
          ))}
        </div>
      ) : (
        <div className="mc-tab-content">

          {/* ═══════ TAB: DETAIL BARANG ═══════ */}
          {activeTab === "detail" && (
            <div className="mc-card">
              <div className="mc-card-head">
                <h3 className="mc-card-title">
                  <Package size={16} /> Detail Per Barang
                </h3>
                <span className="mc-card-count">{sortedItems.length} barang</span>
              </div>

              {sortedItems.length === 0 ? (
                <div className="mc-empty">Tidak ada barang cocok dengan filter.</div>
              ) : (
                <>
                  <div className="mc-table-scroll">
                    <table className="mc-table mc-table-detail">
                      <colgroup>
                        <col style={{ width: "3%" }} />
                        <col style={{ width: "22%" }} />
                        <col style={{ width: "12%" }} />
                        <col style={{ width: "13%" }} />
                        <col style={{ width: "7%" }} />
                        <col style={{ width: "18%" }} />
                        <col style={{ width: "8%" }} />
                        <col style={{ width: "12%" }} />
                        <col style={{ width: "5%" }} />
                      </colgroup>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>
                            <button onClick={() => toggleSort("name")} className="mc-sort-btn">
                              Nama Barang
                              {sortBy === "name" && (sortDir === "asc" ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}
                            </button>
                          </th>
                          <th>
                            <button onClick={() => toggleSort("category")} className="mc-sort-btn">
                              Kategori
                              {sortBy === "category" && (sortDir === "asc" ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}
                            </button>
                          </th>
                          <th>
                            <button onClick={() => toggleSort("location")} className="mc-sort-btn">
                              Lokasi
                              {sortBy === "location" && (sortDir === "asc" ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}
                            </button>
                          </th>
                          <th className="text-center">
                            <button onClick={() => toggleSort("units")} className="mc-sort-btn">
                              Unit
                              {sortBy === "units" && (sortDir === "asc" ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}
                            </button>
                          </th>
                          <th>
                            <button onClick={() => toggleSort("damaged")} className="mc-sort-btn">
                              Kondisi
                              {sortBy === "damaged" && (sortDir === "asc" ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}
                            </button>
                          </th>
                          <th className="text-center">
                            <button onClick={() => toggleSort("pct")} className="mc-sort-btn">
                              % Baik
                              {sortBy === "pct" && (sortDir === "asc" ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}
                            </button>
                          </th>
                          <th className="text-center">Kelayakan</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedDetail.map((it, i) => {
                          const isExpanded = expandedId === it.id;
                          const globalIndex = (detailSafePage - 1) * DETAIL_PAGE_SIZE + i + 1;
                          return (
                            <tr key={it.id} className={isExpanded ? "is-expanded" : ""}>
                              <td className="mc-cell-num">{globalIndex}</td>
                              <td>
                                <div className="mc-item-cell">
                                  <div className="mc-item-icon"><Package size={13} /></div>
                                  <div className="mc-item-info">
                                    <p className="mc-item-name">{it.name}</p>
                                    {it.notes && <p className="mc-item-notes">{it.notes}</p>}
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span className="mc-tag">
                                  <Tag size={10} /> {it.category?.name || "-"}
                                </span>
                              </td>
                              <td>
                                <span className="mc-tag">
                                  <MapPin size={10} /> {it.location?.name || "-"}
                                </span>
                              </td>
                              <td className="text-center">
                                <span className="mc-unit-count">{it.total}</span>
                              </td>
                              <td>
                                {it.total === 0 ? (
                                  <span className="mc-cond-empty">Belum ada unit</span>
                                ) : (
                                  <div className="mc-cond-mini">
                                    <div className="mc-cond-bar-mini">
                                      <div className="mc-cond-fill" style={{ width: `${(it.baik / it.total) * 100}%`, background: CONDITION_META.baik.color }} />
                                      <div className="mc-cond-fill" style={{ width: `${(it.rusakRingan / it.total) * 100}%`, background: CONDITION_META.rusak_ringan.color }} />
                                      <div className="mc-cond-fill" style={{ width: `${(it.rusakBerat / it.total) * 100}%`, background: CONDITION_META.rusak_berat.color }} />
                                    </div>
                                    <div className="mc-cond-legend-mini">
                                      {it.baik > 0 && <span style={{ color: CONDITION_META.baik.color }}>✓ {it.baik}</span>}
                                      {it.rusakRingan > 0 && <span style={{ color: CONDITION_META.rusak_ringan.color }}>⚠ {it.rusakRingan}</span>}
                                      {it.rusakBerat > 0 && <span style={{ color: CONDITION_META.rusak_berat.color }}>✗ {it.rusakBerat}</span>}
                                    </div>
                                  </div>
                                )}
                              </td>
                              <td className="text-center">
                                <span className="mc-pct" style={{ color: it.kelayakan.color }}>{it.pct}%</span>
                              </td>
                              <td className="text-center">
                                <span className="mc-badge-status" style={{ color: it.kelayakan.color, background: it.kelayakan.bg }}>
                                  <it.kelayakan.icon size={10} /> {it.kelayakan.label}
                                </span>
                              </td>
                              <td className="text-center">
                                <button
                                  onClick={() => setExpandedId(isExpanded ? null : it.id)}
                                  className="mc-expand-btn"
                                  title={isExpanded ? "Tutup" : "Detail Unit"}
                                >
                                  {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {detailTotalPages > 1 && (
                    <div className="mc-mini-pagination">
                      <span className="mc-mini-pagination-info">
                        Menampilkan <strong>{detailStart}–{detailEnd}</strong> dari <strong>{sortedItems.length}</strong> barang
                      </span>

                      <div className="mc-mini-pagination-controls">
                        <button
                          onClick={() => setDetailPage(p => Math.max(1, p - 1))}
                          disabled={detailSafePage === 1}
                          className="mc-mini-page-btn"
                          title="Sebelumnya"
                        >
                          <ChevronLeft size={14} />
                        </button>

                        <div className="mc-mini-page-numbers">
                          {buildPageNumbers(detailSafePage, detailTotalPages).map((p, i) =>
                            p === "..." ? (
                              <span key={`e${i}`} className="mc-mini-page-ellipsis">…</span>
                            ) : (
                              <button
                                key={p}
                                onClick={() => setDetailPage(p)}
                                className={`mc-mini-page-num ${p === detailSafePage ? "is-active" : ""}`}
                              >
                                {p}
                              </button>
                            )
                          )}
                        </div>

                        <button
                          onClick={() => setDetailPage(p => Math.min(detailTotalPages, p + 1))}
                          disabled={detailSafePage === detailTotalPages}
                          className="mc-mini-page-btn"
                          title="Berikutnya"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ═══════ TAB: DETAIL UNIT ═══════ */}
          {activeTab === "units" && (
            <div className="mc-card">
              <div className="mc-card-head">
                <h3 className="mc-card-title">
                  <Box size={16} /> Detail Per Unit
                </h3>
                <span className="mc-card-count">{allUnitsFlat.length} unit</span>
              </div>

              {allUnitsFlat.length === 0 ? (
                <div className="mc-empty">Belum ada unit fisik.</div>
              ) : (
                <>
                  <div className="mc-table-scroll">
                    <table className="mc-table">
                      <colgroup>
                        <col style={{ width: "4%" }} />
                        <col style={{ width: "28%" }} />
                        <col style={{ width: "18%" }} />
                        <col style={{ width: "8%" }} />
                        <col style={{ width: "14%" }} />
                        <col style={{ width: "14%" }} />
                        <col style={{ width: "14%" }} />
                      </colgroup>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Nama Barang</th>
                          <th>Kode Unit</th>
                          <th className="text-center">No</th>
                          <th>Kondisi</th>
                          <th>Status</th>
                          <th>Lokasi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedUnits.map((u, i) => {
                          const cond = CONDITION_META[u.condition] || CONDITION_META.baik;
                          const stat = STATUS_META[u.status] || STATUS_META.active;
                          const globalIndex = (unitSafePage - 1) * UNIT_PAGE_SIZE + i + 1;
                          return (
                            <tr key={u.id}>
                              <td className="mc-cell-num">{globalIndex}</td>
                              <td><strong>{u.item?.name}</strong></td>
                              <td><span className="mc-code-mono">{u.unit_code || "-"}</span></td>
                              <td className="text-center">#{u.unit_number}</td>
                              <td>
                                <span className="mc-badge-status" style={{ color: cond.color, background: cond.bg }}>
                                  <cond.icon size={10} /> {cond.label}
                                </span>
                              </td>
                              <td>
                                <span className="mc-badge-status" style={{ color: stat.color }}>
                                  {stat.label}
                                </span>
                              </td>
                              <td>{u.item?.location?.name || "-"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {unitTotalPages > 1 && (
                    <div className="mc-mini-pagination">
                      <span className="mc-mini-pagination-info">
                        Menampilkan <strong>{unitStart}–{unitEnd}</strong> dari <strong>{allUnitsFlat.length}</strong> unit
                      </span>

                      <div className="mc-mini-pagination-controls">
                        <button
                          onClick={() => setUnitPage(p => Math.max(1, p - 1))}
                          disabled={unitSafePage === 1}
                          className="mc-mini-page-btn"
                          title="Sebelumnya"
                        >
                          <ChevronLeft size={14} />
                        </button>

                        <div className="mc-mini-page-numbers">
                          {buildPageNumbers(unitSafePage, unitTotalPages).map((p, i) =>
                            p === "..." ? (
                              <span key={`e${i}`} className="mc-mini-page-ellipsis">…</span>
                            ) : (
                              <button
                                key={p}
                                onClick={() => setUnitPage(p)}
                                className={`mc-mini-page-num ${p === unitSafePage ? "is-active" : ""}`}
                              >
                                {p}
                              </button>
                            )
                          )}
                        </div>

                        <button
                          onClick={() => setUnitPage(p => Math.min(unitTotalPages, p + 1))}
                          disabled={unitSafePage === unitTotalPages}
                          className="mc-mini-page-btn"
                          title="Berikutnya"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ═══════ TAB: KATEGORI ═══════ */}
          {activeTab === "category" && (
            <div className="mc-card">
              <h3 className="mc-card-title"><Tag size={16} /> Per Kategori</h3>
              <div className="mc-table-responsive">
                <table className="mc-table">
                  <thead>
                    <tr>
                      <th>Kategori</th>
                      <th className="text-center">Barang</th>
                      <th className="text-center">Unit</th>
                      <th className="text-center">Baik</th>
                      <th>% Baik</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byCategory.map((c) => (
                      <tr key={c.name}>
                        <td><strong>{c.name}</strong></td>
                        <td className="text-center">{c.items}</td>
                        <td className="text-center">{c.units}</td>
                        <td className="text-center">{c.baik}</td>
                        <td>
                          <div className="mc-pct-bar">
                            <div className="mc-pct-fill" style={{
                              width: `${c.pct}%`,
                              background: c.pct >= 80 ? "#10B981" : c.pct >= 50 ? "#F59E0B" : "#EF4444",
                            }} />
                            <span className="mc-pct-label">{c.pct}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══════ TAB: LOKASI ═══════ */}
          {activeTab === "location" && (
            <div className="mc-card">
              <h3 className="mc-card-title"><MapPin size={16} /> Per Lokasi</h3>
              <div className="mc-table-responsive">
                <table className="mc-table">
                  <thead>
                    <tr>
                      <th>Lokasi</th>
                      <th className="text-center">Barang</th>
                      <th className="text-center">Unit</th>
                      <th className="text-center">Baik</th>
                      <th>% Baik</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byLocation.map((l) => (
                      <tr key={l.name}>
                        <td><strong>{l.name}</strong></td>
                        <td className="text-center">{l.items}</td>
                        <td className="text-center">{l.units}</td>
                        <td className="text-center">{l.baik}</td>
                        <td>
                          <div className="mc-pct-bar">
                            <div className="mc-pct-fill" style={{
                              width: `${l.pct}%`,
                              background: l.pct >= 80 ? "#10B981" : l.pct >= 50 ? "#F59E0B" : "#EF4444",
                            }} />
                            <span className="mc-pct-label">{l.pct}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══════ TAB: KONDISI ═══════ */}
          {activeTab === "condition" && (
            <div className="mc-grid-2">
              <div className="mc-card">
                <h3 className="mc-card-title"><PieIcon size={16} /> Distribusi Kondisi</h3>
                {byCondition.length === 0 ? (
                  <div className="mc-empty-small">Belum ada unit</div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={byCondition} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} stroke="none">
                        {byCondition.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <RechartsTooltip contentStyle={{ borderRadius: "10px", border: "1px solid var(--border)", backgroundColor: "var(--surface)", color: "var(--text-main)" }} />
                      <Legend wrapperStyle={{ fontSize: "12px", color: "var(--text-muted)" }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="mc-card">
                <h3 className="mc-card-title">Rincian Kondisi</h3>
                <div className="mc-condition-detail">
                  {Object.entries(CONDITION_META).map(([key, meta]) => {
                    const value = key === "baik" ? stats.baik : key === "rusak_ringan" ? stats.rusakRingan : stats.rusakBerat;
                    const pct = stats.totalUnits ? Math.round((value / stats.totalUnits) * 100) : 0;
                    return (
                      <div key={key} className="mc-cond-card">
                        <div className="mc-cond-head">
                          <span className="mc-cond-icon" style={{ background: meta.bg, color: meta.color }}>
                            <meta.icon size={16} />
                          </span>
                          <span className="mc-cond-label">{meta.label}</span>
                        </div>
                        <div className="mc-cond-body">
                          <p className="mc-cond-value">{value}</p>
                          <p className="mc-cond-pct">{pct}%</p>
                        </div>
                        <div className="mc-cond-bar">
                          <div className="mc-cond-fill" style={{ width: `${pct}%`, background: meta.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ═══════ TAB: PERLU PERHATIAN ═══════ */}
          {activeTab === "damaged" && (
            <div className="mc-card">
              <h3 className="mc-card-title"><AlertTriangle size={16} /> Barang Perlu Perhatian</h3>
              {damagedItems.length === 0 ? (
                <div className="mc-empty-small">
                  <CheckCircle2 size={32} style={{ color: "#10B981", marginBottom: "0.5rem" }} />
                  <p>Semua barang dalam kondisi baik 🎉</p>
                </div>
              ) : (
                <div className="mc-table-responsive">
                  <table className="mc-table">
                    <thead>
                      <tr>
                        <th>Nama Barang</th>
                        <th>Kategori</th>
                        <th>Lokasi</th>
                        <th className="text-center">Rusak Ringan</th>
                        <th className="text-center">Rusak Berat</th>
                        <th className="text-center">Total</th>
                        <th className="text-center">Kelayakan</th>
                        <th className="text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {damagedItems.map((d) => (
                        <tr key={d.id}>
                          <td><strong>{d.name}</strong></td>
                          <td>{d.category?.name || "-"}</td>
                          <td>{d.location?.name || "-"}</td>
                          <td className="text-center">
                            {d.rusakRingan > 0 ? <span className="mc-badge warning">{d.rusakRingan}</span> : <span className="mc-muted">-</span>}
                          </td>
                          <td className="text-center">
                            {d.rusakBerat > 0 ? <span className="mc-badge danger">{d.rusakBerat}</span> : <span className="mc-muted">-</span>}
                          </td>
                          <td className="text-center"><strong>{d.rusakRingan + d.rusakBerat}</strong></td>
                          <td className="text-center">
                            <span className="mc-badge-status" style={{ color: d.kelayakan.color, background: d.kelayakan.bg }}>
                              <d.kelayakan.icon size={10} /> {d.kelayakan.label}
                            </span>
                          </td>
                          <td className="text-right">
                            {/* ✅ TOMBOL DETAIL → BUKA MODAL, bukan Link */}
                            <button
                              onClick={() => setDetailModal(d)}
                              className="mc-link"
                              style={{ background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit" }}
                              title="Lihat detail"
                            >
                              Detail <Info size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* FOOTER */}
      <div className="mc-report-footer">
        <div className="mc-report-footer-left">
          <Calendar size={13} />
          Laporan dibuat: <strong>{new Date().toLocaleString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</strong>
        </div>
        <div className="mc-report-footer-right">
          Oleh: <strong>{profile?.full_name || "-"}</strong>
        </div>
      </div>

      {/* ═══════════════ MODAL DETAIL BARANG ═══════════════ */}
      {detailModal && (
        <div
          className="mc-modal-backdrop"
          onClick={(e) => e.target === e.currentTarget && setDetailModal(null)}
        >
          <div className="mc-detail-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="mc-detail-modal-head">
              <div className="mc-detail-modal-head-content">
                <div className="mc-detail-modal-icon">
                  <Package size={22} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <h2 className="mc-detail-modal-title">{detailModal.name}</h2>
                  <p className="mc-detail-modal-sub">
                    Detail kondisi barang — untuk informasi lengkap
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailModal(null)}
                className="mc-detail-modal-close"
                aria-label="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="mc-detail-modal-body">
              {/* Info grid */}
              <div className="mc-detail-info-grid">
                <div className="mc-detail-info-item">
                  <span className="mc-detail-info-icon"><Tag size={14} /></span>
                  <div>
                    <p className="mc-detail-info-label">Kategori</p>
                    <p className="mc-detail-info-value">{detailModal.category?.name || "-"}</p>
                  </div>
                </div>
                <div className="mc-detail-info-item">
                  <span className="mc-detail-info-icon"><MapPin size={14} /></span>
                  <div>
                    <p className="mc-detail-info-label">Lokasi</p>
                    <p className="mc-detail-info-value">{detailModal.location?.name || "-"}</p>
                  </div>
                </div>
                <div className="mc-detail-info-item">
                  <span className="mc-detail-info-icon"><Box size={14} /></span>
                  <div>
                    <p className="mc-detail-info-label">Total Unit</p>
                    <p className="mc-detail-info-value">{detailModal.total} unit</p>
                  </div>
                </div>
                <div className="mc-detail-info-item">
                  <span className="mc-detail-info-icon"><CheckCircle2 size={14} /></span>
                  <div>
                    <p className="mc-detail-info-label">Persentase Baik</p>
                    <p className="mc-detail-info-value" style={{ color: detailModal.kelayakan.color }}>
                      {detailModal.pct}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {detailModal.notes && (
                <div className="mc-detail-notes">
                  <p className="mc-detail-notes-label">Catatan Barang:</p>
                  <p className="mc-detail-notes-text">{detailModal.notes}</p>
                </div>
              )}

              {/* Kondisi summary */}
              <div className="mc-detail-section">
                <p className="mc-detail-section-title">Ringkasan Kondisi</p>
                <div className="mc-detail-cond-grid">
                  <div className="mc-detail-cond-card good">
                    <div className="mc-detail-cond-head">
                      <CheckCircle2 size={14} />
                      <span>Baik</span>
                    </div>
                    <p className="mc-detail-cond-value">{detailModal.baik}</p>
                  </div>
                  <div className="mc-detail-cond-card warning">
                    <div className="mc-detail-cond-head">
                      <AlertTriangle size={14} />
                      <span>Rusak Ringan</span>
                    </div>
                    <p className="mc-detail-cond-value">{detailModal.rusakRingan}</p>
                  </div>
                  <div className="mc-detail-cond-card danger">
                    <div className="mc-detail-cond-head">
                      <XCircle size={14} />
                      <span>Rusak Berat</span>
                    </div>
                    <p className="mc-detail-cond-value">{detailModal.rusakBerat}</p>
                  </div>
                </div>
              </div>

              {/* Daftar unit */}
              {detailModal.itemUnits && detailModal.itemUnits.length > 0 && (
                <div className="mc-detail-section">
                  <p className="mc-detail-section-title">
                    Daftar Unit
                    <span className="mc-detail-section-count">{detailModal.itemUnits.length}</span>
                  </p>
                  <div className="mc-detail-unit-list">
                    {detailModal.itemUnits.map((u) => {
                      const cond = CONDITION_META[u.condition] || CONDITION_META.baik;
                      const stat = STATUS_META[u.status] || STATUS_META.active;
                      return (
                        <div key={u.id} className="mc-detail-unit-item">
                          <div className="mc-detail-unit-code">
                            <span className="mc-detail-unit-num">#{u.unit_number}</span>
                            <span className="mc-detail-unit-mono">{u.unit_code}</span>
                          </div>
                          <div className="mc-detail-unit-badges">
                            <span className="mc-badge-status" style={{ color: cond.color, background: cond.bg }}>
                              <cond.icon size={9} /> {cond.label}
                            </span>
                            <span className="mc-badge-status" style={{ color: stat.color }}>
                              {stat.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mc-detail-modal-footer">
              <p className="mc-detail-modal-footer-info">
                <Info size={12} /> Data tidak bisa diubah dari sini
              </p>
              <button
                onClick={() => setDetailModal(null)}
                className="mc-detail-modal-close-btn"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function ReportStyles() {
  return (
    <style>{`
      .mc-reports {
        width: 100%; display: flex; flex-direction: column;
        gap: 1.1rem; padding-bottom: 2.5rem;
      }
      .mc-reports > * {
        opacity: 0; transform: translateY(14px);
        transition: opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1), transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .mc-reports.is-mounted > * { opacity: 1; transform: translateY(0); }
      .mc-reports.is-mounted > *:nth-child(2) { transition-delay: 0.06s; }
      .mc-reports.is-mounted > *:nth-child(3) { transition-delay: 0.12s; }
      .mc-reports.is-mounted > *:nth-child(4) { transition-delay: 0.18s; }

      /* HEADER */
      .mc-head { display: flex; flex-direction: column; gap: 1.25rem; }
      @media (min-width: 768px) {
        .mc-head { flex-direction: row; align-items: flex-end; justify-content: space-between; }
      }
      .mc-eyebrow {
        display: inline-flex; align-items: center; gap: 0.4rem;
        font-size: 0.7rem; font-weight: 700;
        color: var(--accent); background: var(--accent-soft);
        border: 1px solid var(--accent-border);
        padding: 0.35rem 0.75rem; border-radius: 999px;
        text-transform: uppercase; letter-spacing: 0.08em;
        margin-bottom: 0.65rem;
      }
      .mc-title {
        display: flex; align-items: center; gap: 0.75rem;
        font-size: 1.85rem; font-weight: 800;
        color: var(--text-main); letter-spacing: -0.02em;
        margin-bottom: 0.35rem;
      }
      .mc-title-icon {
        width: 44px; height: 44px; border-radius: 12px;
        background: var(--accent-soft); border: 1px solid var(--accent-border);
        color: var(--accent);
        display: inline-flex; align-items: center; justify-content: center;
      }
      .mc-sub {
        font-size: 0.88rem; color: var(--text-muted);
        margin-left: 3.4rem; max-width: 620px; line-height: 1.55;
      }
      @media (max-width: 640px) {
        .mc-title { font-size: 1.5rem; }
        .mc-title-icon { width: 36px; height: 36px; }
        .mc-sub { margin-left: 0; }
        .mc-head-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; width: 100%; }
        .mc-head-actions > button { width: 100%; justify-content: center; }
      }
      .mc-head-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }
      .mc-btn-primary, .mc-btn-secondary {
        display: inline-flex; align-items: center; justify-content: center;
        gap: 0.4rem; padding: 0.65rem 1.1rem;
        border-radius: 10px; font-size: 0.82rem; font-weight: 700;
        border: 1.5px solid transparent; cursor: pointer;
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        white-space: nowrap;
      }
      .mc-btn-primary {
        background: var(--accent); color: white;
        box-shadow: 0 4px 12px -2px rgba(185,28,28,0.3);
      }
      .mc-btn-primary:hover:not(:disabled) {
        background: var(--accent-hover);
        transform: translateY(-2px);
        box-shadow: 0 12px 24px -6px rgba(185,28,28,0.4);
      }
      .mc-btn-secondary {
        background: var(--surface); color: var(--text-main);
        border-color: var(--border);
      }
      .mc-btn-secondary:hover:not(:disabled) {
        background: var(--background);
        border-color: var(--accent-border); color: var(--accent);
        transform: translateY(-2px);
      }
      .mc-btn-primary:disabled, .mc-btn-secondary:disabled {
        opacity: 0.5; cursor: not-allowed; transform: none;
      }
      .mc-spin { animation: spin 0.8s linear infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }

      /* STAT */
      .mc-stat-grid {
        display: grid; grid-template-columns: 1fr; gap: 0.75rem;
      }
      @media (min-width: 640px) {
        .mc-stat-grid { grid-template-columns: repeat(2, 1fr); }
      }
      @media (min-width: 900px) {
        .mc-stat-grid { grid-template-columns: repeat(4, 1fr); }
      }
      .mc-stat-card {
        display: flex; align-items: center; gap: 0.85rem;
        background: var(--surface); border: 1px solid var(--border);
        border-radius: 14px; padding: 1rem 1.15rem;
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        animation: card-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
      }
      @keyframes card-in {
        from { opacity: 0; transform: translateY(8px) scale(0.98); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      .mc-stat-card:hover {
        border-color: var(--accent-border);
        transform: translateY(-3px);
        box-shadow: 0 8px 24px -6px rgba(0,0,0,0.12);
      }
      .mc-stat-icon {
        width: 44px; height: 44px; border-radius: 11px;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
        transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      .mc-stat-card:hover .mc-stat-icon { transform: scale(1.08) rotate(-4deg); }
      .mc-stat-label {
        font-size: 0.7rem; font-weight: 700;
        color: var(--text-muted); text-transform: uppercase;
        letter-spacing: 0.04em; margin-bottom: 2px;
      }
      .mc-stat-value {
        font-size: 1.55rem; font-weight: 800;
        color: var(--text-main); line-height: 1.05;
        font-variant-numeric: tabular-nums;
      }
      .mc-stat-sub { font-size: 0.68rem; color: var(--text-muted); margin-top: 2px; }

      /* FILTER */
      .mc-filter-panel {
        display: flex; flex-direction: column; gap: 0.65rem;
        padding: 0.85rem 1rem;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 12px;
      }
      .mc-search-row { position: relative; display: flex; align-items: center; }
      .mc-search-icon { position: absolute; left: 0.75rem; color: var(--text-muted); pointer-events: none; }
      .mc-search-input {
        flex: 1;
        background: var(--background);
        border: 1.5px solid var(--border);
        border-radius: 8px;
        padding: 0.55rem 2.2rem 0.55rem 2.2rem;
        font-size: 0.82rem; color: var(--text-main);
        font-family: inherit; transition: all 0.2s;
      }
      .mc-search-input:focus {
        outline: none; border-color: var(--accent);
        box-shadow: 0 0 0 3px var(--accent-soft);
      }
      .mc-search-clear {
        position: absolute; right: 0.5rem;
        width: 22px; height: 22px; border-radius: 50%;
        background: var(--border); border: none; color: var(--text-muted);
        display: flex; align-items: center; justify-content: center;
        cursor: pointer;
      }
      .mc-search-clear:hover { background: var(--accent); color: white; }

      .mc-filter-row { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
      .mc-filter-group {
        display: inline-flex; align-items: center; gap: 0.35rem;
        background: var(--background); border: 1.5px solid var(--border);
        border-radius: 8px; padding: 0.35rem 0.7rem;
        flex: 1; /* Membuat filter memanjang di HP */
        min-width: 120px;
      }
      .mc-filter-group svg { color: var(--text-muted); flex-shrink: 0; }
      .mc-filter-group select {
        background: transparent; border: none; color: var(--text-main);
        font-size: 0.78rem; font-weight: 600;
        font-family: inherit; cursor: pointer; outline: none;
        width: 100%;
      }
      .mc-filter-reset {
        display: inline-flex; align-items: center; gap: 0.3rem;
        padding: 0.4rem 0.75rem; border-radius: 8px;
        background: var(--accent-soft); color: var(--accent);
        border: 1px solid var(--accent-border);
        font-size: 0.72rem; font-weight: 700;
        cursor: pointer; font-family: inherit; transition: all 0.2s;
        justify-content: center;
      }
      .mc-filter-reset:hover { background: var(--accent); color: white; }
      .mc-filter-count {
        font-size: 0.72rem; font-weight: 700;
        color: var(--text-muted); margin-left: auto;
        padding: 0.35rem 0.7rem; background: var(--background); border-radius: 6px;
      }
      @media (max-width: 640px) {
        .mc-filter-count { width: 100%; text-align: center; margin-left: 0; margin-top: 0.5rem; }
      }

      /* TABS */
      .mc-tabs {
        display: flex; gap: 0.25rem;
        border-bottom: 1.5px solid var(--border);
        overflow-x: auto; scrollbar-width: none;
      }
      .mc-tabs::-webkit-scrollbar { display: none; }
      .mc-tab {
        display: inline-flex; align-items: center; gap: 0.4rem;
        padding: 0.75rem 1.1rem;
        background: transparent; border: none;
        border-bottom: 2px solid transparent;
        font-size: 0.82rem; font-weight: 700;
        color: var(--text-muted); cursor: pointer;
        transition: all 0.2s; white-space: nowrap;
        margin-bottom: -1.5px; font-family: inherit;
      }
      .mc-tab:hover { color: var(--text-main); }
      .mc-tab.is-active { color: var(--accent); border-bottom-color: var(--accent); }
      .mc-tab-badge {
        display: inline-flex; align-items: center; justify-content: center;
        min-width: 18px; height: 18px; padding: 0 0.35rem;
        border-radius: 999px;
        background: rgba(239,68,68,0.15); color: #EF4444;
        font-size: 0.62rem; font-weight: 800;
      }

      .mc-tab-content { animation: content-in 0.35s ease; }
      @keyframes content-in {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: translateY(0); }
      }

      /* CARD */
      .mc-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 16px; padding: 1.25rem;
        box-shadow: 0 1px 3px rgba(0,0,0,0.03);
        overflow: hidden; /* Penting agar tabel bisa discroll */
      }
      @media (max-width: 640px) {
        .mc-card { padding: 0.85rem; }
      }
      .mc-card-head {
        display: flex; align-items: center; justify-content: space-between;
        margin-bottom: 1rem; gap: 1rem;
        flex-wrap: wrap;
      }
      .mc-card-title {
        display: flex; align-items: center; gap: 0.5rem;
        font-size: 1rem; font-weight: 800; color: var(--text-main);
      }
      .mc-card-title svg { color: var(--accent); }
      .mc-card-count {
        font-size: 0.72rem; font-weight: 700;
        color: var(--text-muted);
        padding: 0.25rem 0.65rem;
        background: var(--background); border-radius: 6px;
      }
      .mc-empty { padding: 2rem; text-align: center; color: var(--text-muted); font-size: 0.88rem; font-style: italic; }
      .mc-empty-small { padding: 2rem; text-align: center; color: var(--text-muted); font-size: 0.88rem; }

      /* TABLE SCROLL - KUNCI PERBAIKAN DI HP */
      .mc-table-scroll {
        overflow-x: auto; overflow-y: auto;
        max-height: 65vh;
        border-radius: 12px; position: relative;
        -webkit-overflow-scrolling: touch; /* Scroll halus di iOS */
      }
      .mc-table-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
      .mc-table-scroll::-webkit-scrollbar-track { background: transparent; }
      .mc-table-scroll::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
      .mc-table-scroll::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

      .mc-table-responsive { overflow-x: auto; -webkit-overflow-scrolling: touch; }

      .mc-table {
        width: 100%; border-collapse: collapse; font-size: 0.82rem;
        min-width: 800px; /* MEMAKSA TABEL LEBAR DI HP AGAR BISA DISCROLL */
      }
      .mc-table-detail { min-width: 900px; }
      
      .mc-table thead { background: var(--background); border-bottom: 1.5px solid var(--border); }
      .mc-table-scroll .mc-table thead th {
        position: sticky; top: 0; z-index: 2;
        background: var(--background);
        border-bottom: 1.5px solid var(--border);
      }
      .mc-table th {
        padding: 0.65rem 0.7rem; text-align: left;
        font-size: 0.66rem; font-weight: 700;
        color: var(--text-muted); text-transform: uppercase;
        letter-spacing: 0.05em; white-space: nowrap;
      }
      .mc-table th.text-center { text-align: center; }
      .mc-table th.text-right { text-align: right; }
      .mc-sort-btn {
        display: inline-flex; align-items: center; gap: 0.2rem;
        background: none; border: none; color: inherit;
        font: inherit; cursor: pointer; padding: 0;
        text-transform: uppercase;
      }
      .mc-sort-btn:hover { color: var(--accent); }
      .mc-table tbody tr {
        border-bottom: 1px solid var(--border);
        transition: background 0.15s;
      }
      .mc-table tbody tr:hover { background: var(--background); }
      .mc-table tbody tr.is-expanded { background: var(--accent-soft); }
      .mc-table td {
        padding: 0.65rem 0.7rem; color: var(--text-main);
        vertical-align: middle;
      }
      .mc-table td.text-center { text-align: center; }
      .mc-table td.text-right { text-align: right; }
      .mc-cell-num { color: var(--text-muted); font-size: 0.72rem; font-variant-numeric: tabular-nums; }

      .mc-item-cell { display: flex; align-items: center; gap: 0.5rem; min-width: 0; }
      .mc-item-icon {
        width: 28px; height: 28px; border-radius: 7px;
        background: var(--accent-soft); border: 1px solid var(--accent-border);
        color: var(--accent);
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
      }
      .mc-item-info { min-width: 0; }
      .mc-item-name {
        font-weight: 700; font-size: 0.82rem; color: var(--text-main);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .mc-item-notes {
        font-size: 0.68rem; color: var(--text-muted); margin-top: 1px;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }

      .mc-tag {
        display: inline-flex; align-items: center; gap: 0.25rem;
        padding: 0.2rem 0.5rem; border-radius: 5px;
        background: var(--background); border: 1px solid var(--border);
        font-size: 0.7rem; font-weight: 600;
        color: var(--text-main); white-space: nowrap;
        max-width: 100%; overflow: hidden; text-overflow: ellipsis;
      }
      .mc-tag svg { color: var(--text-muted); flex-shrink: 0; }

      .mc-unit-count {
        display: inline-flex; align-items: center; justify-content: center;
        min-width: 30px; padding: 0.15rem 0.5rem; border-radius: 6px;
        background: var(--accent-soft); color: var(--accent);
        border: 1px solid var(--accent-border);
        font-weight: 800; font-variant-numeric: tabular-nums;
      }

      .mc-cond-mini { display: flex; flex-direction: column; gap: 0.25rem; }
      .mc-cond-bar-mini {
        display: flex; height: 5px; border-radius: 3px; overflow: hidden;
        background: var(--border);
      }
      .mc-cond-fill { transition: width 0.5s ease; }
      .mc-cond-legend-mini {
        display: flex; gap: 0.5rem;
        font-size: 0.66rem; font-weight: 700;
      }
      .mc-cond-empty {
        font-size: 0.7rem; color: var(--text-muted); font-style: italic;
      }

      .mc-pct { font-weight: 800; font-variant-numeric: tabular-nums; }
      .mc-badge-status {
        display: inline-flex; align-items: center; gap: 0.25rem;
        padding: 0.15rem 0.5rem; border-radius: 5px;
        font-size: 0.68rem; font-weight: 700; white-space: nowrap;
      }
      .mc-expand-btn {
        width: 24px; height: 24px; border-radius: 6px;
        background: var(--background); border: 1px solid var(--border);
        color: var(--text-muted);
        display: inline-flex; align-items: center; justify-content: center;
        cursor: pointer; transition: all 0.2s; padding: 0;
      }
      .mc-expand-btn:hover {
        background: var(--accent); color: white; border-color: var(--accent);
      }

      .mc-code-mono {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.74rem; font-weight: 700;
      }

      .mc-pct-bar { display: flex; align-items: center; gap: 0.5rem; }
      .mc-pct-fill {
        height: 6px; border-radius: 3px; min-width: 4px;
        transition: width 0.5s ease;
      }
      .mc-pct-label {
        font-size: 0.7rem; font-weight: 700;
        color: var(--text-muted); font-variant-numeric: tabular-nums;
        min-width: 36px;
      }

      .mc-grid-2 { display: grid; grid-template-columns: 1fr; gap: 1rem; }
      @media (min-width: 900px) { .mc-grid-2 { grid-template-columns: 1.2fr 1fr; } }

      .mc-condition-detail {
        display: grid; grid-template-columns: 1fr; gap: 0.75rem;
      }
      @media (min-width: 640px) { .mc-condition-detail { grid-template-columns: repeat(3, 1fr); } }
      .mc-cond-card {
        background: var(--background);
        border: 1px solid var(--border);
        border-radius: 12px; padding: 1rem;
      }
      .mc-cond-head { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.6rem; }
      .mc-cond-icon {
        width: 30px; height: 30px; border-radius: 8px;
        display: flex; align-items: center; justify-content: center;
      }
      .mc-cond-label { font-size: 0.8rem; font-weight: 800; color: var(--text-main); }
      .mc-cond-body { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 0.5rem; }
      .mc-cond-value { font-size: 1.75rem; font-weight: 800; color: var(--text-main); font-variant-numeric: tabular-nums; line-height: 1; }
      .mc-cond-pct { font-size: 0.85rem; font-weight: 700; color: var(--text-muted); }
      .mc-cond-bar { height: 5px; border-radius: 3px; background: var(--border); overflow: hidden; }

      .mc-badge {
        display: inline-flex; align-items: center; justify-content: center;
        min-width: 26px; height: 22px; padding: 0 0.45rem;
        border-radius: 6px; font-size: 0.72rem; font-weight: 800;
        font-variant-numeric: tabular-nums;
      }
      .mc-badge.warning { background: rgba(245,158,11,0.12); color: #D97706; }
      .mc-badge.danger { background: rgba(239,68,68,0.12); color: #DC2626; }
      .mc-muted { color: var(--text-muted); opacity: 0.5; }

      .mc-link {
        display: inline-flex; align-items: center; gap: 0.25rem;
        font-size: 0.75rem; font-weight: 700;
        color: var(--accent); text-decoration: none;
        padding: 0.25rem 0.5rem; border-radius: 6px;
        transition: all 0.2s;
      }
      .mc-link:hover { background: var(--accent-soft); }

      .mc-report-footer {
        display: flex; align-items: center; justify-content: space-between;
        gap: 1rem; flex-wrap: wrap;
        padding: 0.85rem 1.15rem;
        background: var(--surface);
        border: 1px dashed var(--border);
        border-radius: 12px;
        font-size: 0.78rem; color: var(--text-muted);
      }
      .mc-report-footer-left { display: inline-flex; align-items: center; gap: 0.4rem; }
      .mc-report-footer strong { color: var(--text-main); font-weight: 800; }

      .mc-loading { display: flex; flex-direction: column; gap: 0.5rem; }
      .mc-skel-row {
        height: 56px; background: var(--surface);
        border: 1px solid var(--border); border-radius: 10px;
        animation: pulse 1.5s ease-in-out infinite;
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      /* MINI PAGINATION */
      .mc-mini-pagination {
        display: flex; align-items: center; justify-content: space-between;
        gap: 0.75rem;
        padding: 0.65rem 0.85rem;
        margin-top: 0.65rem;
        background: var(--background);
        border: 1px solid var(--border);
        border-radius: 10px;
        flex-wrap: wrap;
      }
      @media (max-width: 640px) {
        .mc-mini-pagination { flex-direction: column; align-items: center; gap: 0.5rem; }
      }
      .mc-mini-pagination-info {
        font-size: 0.72rem;
        color: var(--text-muted);
        font-variant-numeric: tabular-nums;
        font-weight: 600;
      }
      .mc-mini-pagination-info strong {
        color: var(--text-main); font-weight: 800;
      }
      .mc-mini-pagination-controls {
        display: flex; align-items: center; gap: 0.2rem;
      }
      .mc-mini-page-btn {
        width: 28px; height: 28px; border-radius: 7px;
        background: var(--surface);
        border: 1px solid var(--border);
        color: var(--text-main);
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; transition: all 0.2s;
        padding: 0; font-family: inherit;
      }
      .mc-mini-page-btn:hover:not(:disabled) {
        border-color: var(--accent-border);
        color: var(--accent);
        background: var(--accent-soft);
      }
      .mc-mini-page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
      .mc-mini-page-numbers {
        display: flex; align-items: center; gap: 0.15rem;
        padding: 0 0.2rem;
      }
      .mc-mini-page-num {
        min-width: 28px; height: 28px;
        padding: 0 0.4rem; border-radius: 7px;
        background: transparent;
        border: 1px solid transparent;
        color: var(--text-muted);
        font-size: 0.72rem; font-weight: 700;
        cursor: pointer; transition: all 0.2s;
        font-family: inherit; font-variant-numeric: tabular-nums;
      }
      .mc-mini-page-num:hover:not(.is-active) {
        background: var(--surface);
        color: var(--text-main);
        border-color: var(--border);
      }
      .mc-mini-page-num.is-active {
        background: var(--accent);
        color: white;
        border-color: var(--accent);
        box-shadow: 0 2px 8px -2px rgba(185,28,28,0.35);
      }
      .mc-mini-page-ellipsis {
        padding: 0 0.25rem;
        color: var(--text-muted);
        font-size: 0.75rem; font-weight: 600;
        user-select: none;
      }

      /* ═══════════════ MODAL DETAIL BARANG ═══════════════ */
      .mc-modal-backdrop {
        position: fixed; inset: 0;
        background: rgba(0, 0, 0, 0.55);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        z-index: 100;
        padding: 1rem;
        animation: mc-backdrop-in 0.2s ease;
      }
      @keyframes mc-backdrop-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      .mc-detail-modal {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 18px;
        box-shadow: 0 24px 64px -16px rgba(0, 0, 0, 0.45);
        width: 100%;
        max-width: 560px;
        max-height: calc(100vh - 2rem);
        display: flex; flex-direction: column;
        overflow: hidden;
        animation: mc-modal-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes mc-modal-in {
        from { opacity: 0; transform: scale(0.95) translateY(12px); }
        to { opacity: 1; transform: scale(1) translateY(0); }
      }

      .mc-detail-modal-head {
        display: flex; align-items: flex-start; justify-content: space-between;
        gap: 0.75rem;
        padding: 1rem 1.25rem;
        background: linear-gradient(135deg, var(--accent) 0%, #7F1D1D 100%);
        color: white;
        position: relative;
        overflow: hidden;
        flex-shrink: 0;
      }
      .mc-detail-modal-head-content {
        display: flex; align-items: center; gap: 0.75rem;
        position: relative; z-index: 1;
        min-width: 0;
      }
      .mc-detail-modal-icon {
        width: 42px; height: 42px;
        border-radius: 11px;
        background: rgba(255,255,255,0.18);
        border: 1px solid rgba(255,255,255,0.25);
        backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
      }
      .mc-detail-modal-title {
        font-size: 1.05rem; font-weight: 800;
        line-height: 1.2;
        margin-bottom: 0.15rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 380px;
      }
      .mc-detail-modal-sub {
        font-size: 0.72rem;
        color: rgba(255,255,255,0.8);
      }
      .mc-detail-modal-close {
        width: 30px; height: 30px;
        border-radius: 8px;
        background: rgba(255,255,255,0.12);
        border: 1px solid rgba(255,255,255,0.18);
        color: white;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; transition: all 0.2s;
        flex-shrink: 0; padding: 0;
        position: relative; z-index: 1;
      }
      .mc-detail-modal-close:hover {
        background: rgba(255,255,255,0.25);
        transform: rotate(90deg);
      }

      .mc-detail-modal-body {
        padding: 1.25rem;
        overflow-y: auto;
        display: flex; flex-direction: column;
        gap: 1rem;
      }

      .mc-detail-info-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.6rem;
      }
      @media (min-width: 480px) {
        .mc-detail-info-grid { grid-template-columns: repeat(4, 1fr); }
      }
      .mc-detail-info-item {
        display: flex; align-items: center; gap: 0.5rem;
        padding: 0.6rem 0.7rem;
        background: var(--background);
        border: 1px solid var(--border);
        border-radius: 9px;
      }
      .mc-detail-info-icon {
        width: 28px; height: 28px;
        border-radius: 7px;
        background: var(--accent-soft);
        color: var(--accent);
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
      }
      .mc-detail-info-label {
        font-size: 0.6rem;
        font-weight: 700;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.04em;
        margin-bottom: 1px;
      }
      .mc-detail-info-value {
        font-size: 0.8rem;
        font-weight: 800;
        color: var(--text-main);
        line-height: 1.2;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .mc-detail-notes {
        padding: 0.7rem 0.85rem;
        background: rgba(245,158,11,0.06);
        border: 1px solid rgba(245,158,11,0.2);
        border-radius: 9px;
      }
      .mc-detail-notes-label {
        font-size: 0.68rem;
        font-weight: 700;
        color: #D97706;
        margin-bottom: 2px;
      }
      .mc-detail-notes-text {
        font-size: 0.78rem;
        color: var(--text-main);
        line-height: 1.5;
      }

      .mc-detail-section { display: flex; flex-direction: column; gap: 0.5rem; }
      .mc-detail-section-title {
        display: flex; align-items: center; gap: 0.4rem;
        font-size: 0.72rem;
        font-weight: 800;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }
      .mc-detail-section-count {
        font-size: 0.62rem;
        padding: 0.1rem 0.4rem;
        background: var(--accent-soft);
        color: var(--accent);
        border-radius: 4px;
      }

      .mc-detail-cond-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.5rem;
      }
      .mc-detail-cond-card {
        padding: 0.6rem 0.7rem;
        border-radius: 9px;
        border: 1px solid var(--border);
        background: var(--background);
      }
      .mc-detail-cond-card.good {
        background: rgba(16,185,129,0.06);
        border-color: rgba(16,185,129,0.25);
      }
      .mc-detail-cond-card.warning {
        background: rgba(245,158,11,0.06);
        border-color: rgba(245,158,11,0.25);
      }
      .mc-detail-cond-card.danger {
        background: rgba(239,68,68,0.06);
        border-color: rgba(239,68,68,0.25);
      }
      .mc-detail-cond-head {
        display: flex; align-items: center; gap: 0.3rem;
        font-size: 0.68rem; font-weight: 700;
        margin-bottom: 0.35rem;
      }
      .mc-detail-cond-card.good .mc-detail-cond-head { color: #059669; }
      .mc-detail-cond-card.warning .mc-detail-cond-head { color: #D97706; }
      .mc-detail-cond-card.danger .mc-detail-cond-head { color: #DC2626; }
      .mc-detail-cond-value {
        font-size: 1.3rem;
        font-weight: 800;
        color: var(--text-main);
        font-variant-numeric: tabular-nums;
        line-height: 1;
      }

      .mc-detail-unit-list {
        display: flex; flex-direction: column;
        gap: 0.35rem;
        max-height: 220px;
        overflow-y: auto;
        padding-right: 2px;
      }
      .mc-detail-unit-list::-webkit-scrollbar { width: 4px; }
      .mc-detail-unit-list::-webkit-scrollbar-thumb {
        background: var(--border);
        border-radius: 2px;
      }
      .mc-detail-unit-item {
        display: flex; align-items: center; justify-content: space-between;
        gap: 0.5rem;
        padding: 0.4rem 0.6rem;
        background: var(--background);
        border: 1px solid var(--border);
        border-radius: 7px;
      }
      .mc-detail-unit-code {
        display: flex; align-items: center; gap: 0.4rem;
        min-width: 0;
      }
      .mc-detail-unit-num {
        font-size: 0.62rem;
        font-weight: 800;
        padding: 0.1rem 0.35rem;
        background: var(--accent-soft);
        color: var(--accent);
        border-radius: 4px;
        font-variant-numeric: tabular-nums;
        flex-shrink: 0;
      }
      .mc-detail-unit-mono {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.72rem;
        font-weight: 700;
        color: var(--text-main);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .mc-detail-unit-badges {
        display: flex; gap: 0.3rem;
        flex-shrink: 0;
      }

      .mc-detail-modal-footer {
        display: flex; align-items: center; justify-content: space-between;
        gap: 0.75rem;
        padding: 0.85rem 1.25rem;
        background: var(--background);
        border-top: 1px solid var(--border);
        flex-wrap: wrap;
        flex-shrink: 0;
      }
      .mc-detail-modal-footer-info {
        display: inline-flex; align-items: center; gap: 0.3rem;
        font-size: 0.7rem;
        color: var(--text-muted);
      }
      .mc-detail-modal-close-btn {
        padding: 0.5rem 1.1rem;
        border-radius: 8px;
        background: var(--accent);
        color: white;
        font-size: 0.78rem;
        font-weight: 700;
        border: none;
        cursor: pointer;
        transition: all 0.2s;
        font-family: inherit;
      }
      .mc-detail-modal-close-btn:hover {
        background: var(--accent-hover);
        transform: translateY(-1px);
      }

      @media (max-width: 480px) {
        .mc-detail-modal-title { max-width: 220px; font-size: 0.9rem; }
        .mc-detail-info-grid { grid-template-columns: repeat(2, 1fr); }
        .mc-detail-cond-grid { grid-template-columns: 1fr; }
        .mc-detail-modal-footer { flex-direction: column; align-items: stretch; }
        .mc-detail-modal-close-btn { width: 100%; }
      }

      /* PRINT */
      @media print {
        .mc-reports { padding: 0 !important; gap: 0.75rem; }
        .mc-head-actions, .mc-filter-panel, .mc-tabs { display: none !important; }
        .mc-stat-card, .mc-card {
          box-shadow: none !important;
          border: 1px solid #ccc !important;
          page-break-inside: avoid; break-inside: avoid;
        }
        .mc-tab-content > * { display: block !important; margin-bottom: 1rem; }
        .mc-report-footer { border-style: solid !important; }
        .mc-reports > * { opacity: 1 !important; transform: none !important; }
        .mc-expand-btn { display: none !important; }
        .mc-table-scroll {
          max-height: none !important;
          overflow: visible !important;
        }
        .mc-mini-pagination { display: none !important; }
        .mc-modal-backdrop { display: none !important; }
      }
    `}</style>
  );
}