import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../stores/authStore";

const CONDITION_LABEL = {
  baik: "Baik",
  rusak_ringan: "Rusak Ringan",
  rusak_berat: "Rusak Berat",
};

const STATUS_LABEL = {
  active: "Aktif",
  rusak: "Rusak",
  hilang: "Hilang",
  dipinjam: "Dipinjam",
  maintenance: "Perbaikan",
};

export default function ReportsPrint() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { profile } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);

  const filterCategory = params.get("category") || "all";
  const filterLocation = params.get("location") || "all";
  const filterCondition = params.get("condition") || "all";

  useEffect(() => {
    (async () => {
      const [itemsRes, catsRes, locsRes] = await Promise.all([
        supabase.from("items").select(`
          id, name, notes, category_id, location_id,
          category:categories(id, name),
          location:locations(id, name),
          item_units(id, unit_number, unit_code, condition, status)
        `).order("name"),
        supabase.from("categories").select("id, name").order("name"),
        supabase.from("locations").select("id, name").order("name"),
      ]);
      setItems(itemsRes.data || []);
      setCategories(catsRes.data || []);
      setLocations(locsRes.data || []);
      setLoading(false);
    })();
  }, []);

  // Auto print setelah load
  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => window.print(), 700);
      return () => clearTimeout(t);
    }
  }, [loading]);

  // Filter
  const filteredItems = useMemo(() => {
    return items.filter(it => {
      if (filterCategory !== "all" && it.category_id !== filterCategory) return false;
      if (filterLocation !== "all" && it.location_id !== filterLocation) return false;
      if (filterCondition === "has_damage") {
        if (!(it.item_units || []).some(u => u.condition !== "baik")) return false;
      }
      if (filterCondition === "no_damage") {
        if ((it.item_units || []).some(u => u.condition !== "baik")) return false;
      }
      return true;
    });
  }, [items, filterCategory, filterLocation, filterCondition]);

  // Enrich
  const enrichedItems = useMemo(() => {
    return filteredItems.map(it => {
      const units = it.item_units || [];
      const total = units.length;
      const baik = units.filter(u => u.condition === "baik").length;
      const rusakRingan = units.filter(u => u.condition === "rusak_ringan").length;
      const rusakBerat = units.filter(u => u.condition === "rusak_berat").length;
      const pct = total ? Math.round((baik / total) * 100) : 0;
      let kelayakan = "Baik";
      if (pct < 50) kelayakan = "Kritis";
      else if (pct < 80) kelayakan = "Perlu Perhatian";
      return { ...it, units, total, baik, rusakRingan, rusakBerat, pct, kelayakan };
    });
  }, [filteredItems]);

  // Stats
  const stats = useMemo(() => {
    const totalItems = enrichedItems.length;
    const totalUnits = enrichedItems.reduce((s, it) => s + it.total, 0);
    const baik = enrichedItems.reduce((s, it) => s + it.baik, 0);
    const rusakRingan = enrichedItems.reduce((s, it) => s + it.rusakRingan, 0);
    const rusakBerat = enrichedItems.reduce((s, it) => s + it.rusakBerat, 0);
    const pct = totalUnits ? Math.round((baik / totalUnits) * 100) : 0;
    return { totalItems, totalUnits, baik, rusakRingan, rusakBerat, pct };
  }, [enrichedItems]);

  // Filter labels untuk header
  const filterLabels = useMemo(() => {
    const labels = [];
    if (filterCategory !== "all") {
      const cat = categories.find(c => c.id === filterCategory);
      labels.push(`Kategori: ${cat?.name || "-"}`);
    }
    if (filterLocation !== "all") {
      const loc = locations.find(l => l.id === filterLocation);
      labels.push(`Lokasi: ${loc?.name || "-"}`);
    }
    if (filterCondition === "has_damage") labels.push("Kondisi: Ada Kerusakan");
    if (filterCondition === "no_damage") labels.push("Kondisi: Semua Baik");
    return labels;
  }, [filterCategory, filterLocation, filterCondition, categories, locations]);

  const now = new Date();
  const tanggalCetak = now.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const jamCetak = now.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const nomorLaporan = `INV/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}`;

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "serif" }}>
        <p>Memuat data laporan...</p>
      </div>
    );
  }

  return (
    <div className="report-print-page">
      <PrintStyles />

      {/* Tombol kontrol (hidden saat print) */}
      <div className="no-print control-bar">
        <button onClick={() => window.print()}>🖨️ Cetak Sekarang</button>
        <button onClick={() => navigate(-1)}>← Kembali</button>
      </div>

      {/* ═════════════════ KOP SURAT ═════════════════ */}
      <div className="kop-surat">
        <div className="kop-logo">
          <svg viewBox="0 0 100 100" width="70" height="70">
            <circle cx="50" cy="50" r="45" fill="none" stroke="#7F1D1D" strokeWidth="3" />
            <path d="M50 20 L70 45 L60 45 L60 75 L40 75 L40 45 L30 45 Z" fill="#7F1D1D" />
            <circle cx="50" cy="50" r="40" fill="none" stroke="#D4AF37" strokeWidth="1" />
          </svg>
        </div>
        <div className="kop-text">
          <p className="kop-line1">YAYASAN PENDIDIKAN PASUNDAN</p>
          <h1 className="kop-line2">SMA PASUNDAN RANCAEKEK</h1>
          <p className="kop-line3">
            Jl. Raya Rancaekek No. 123, Kabupaten Bandung, Jawa Barat 40394
          </p>
          <p className="kop-line4">
            Telp: (022) 1234567 · Email: info@smappasundan.sch.id · Website: www.smappasundan.sch.id
          </p>
        </div>
      </div>
      <div className="kop-divider">
        <div className="kop-divider-thick" />
        <div className="kop-divider-thin" />
      </div>

      {/* ═════════════════ JUDUL LAPORAN ═════════════════ */}
      <div className="report-title-section">
        <h2 className="report-title">LAPORAN INVENTARIS SARANA DAN PRASARANA</h2>
        <p className="report-subtitle">Sistem Informasi Inventaris Sekolah</p>
        <p className="report-number">Nomor: {nomorLaporan}</p>

        {filterLabels.length > 0 && (
          <div className="report-filter-info">
            <p><strong>Filter yang diterapkan:</strong></p>
            <ul>
              {filterLabels.map((l, i) => <li key={i}>{l}</li>)}
            </ul>
          </div>
        )}

        <p className="report-period">
          Periode: <strong>{now.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}</strong>
        </p>
      </div>

      {/* ═════════════════ RINGKASAN EKSEKUTIF ═════════════════ */}
      <div className="section">
        <h3 className="section-title">A. RINGKASAN EKSEKUTIF</h3>
        <p className="section-text">
          Berdasarkan hasil pendataan inventaris sarana dan prasarana sekolah,
          berikut adalah ringkasan kondisi aset yang tercatat dalam sistem per
          tanggal <strong>{tanggalCetak}</strong>:
        </p>

        <table className="summary-table">
          <tbody>
            <tr>
              <td className="summary-label">Total Barang (Jenis)</td>
              <td className="summary-sep">:</td>
              <td className="summary-value"><strong>{stats.totalItems}</strong> jenis barang</td>
            </tr>
            <tr>
              <td className="summary-label">Total Unit Fisik</td>
              <td className="summary-sep">:</td>
              <td className="summary-value"><strong>{stats.totalUnits}</strong> unit</td>
            </tr>
            <tr>
              <td className="summary-label">Kondisi Baik</td>
              <td className="summary-sep">:</td>
              <td className="summary-value"><strong>{stats.baik}</strong> unit ({stats.pct}%)</td>
            </tr>
            <tr>
              <td className="summary-label">Rusak Ringan</td>
              <td className="summary-sep">:</td>
              <td className="summary-value"><strong>{stats.rusakRingan}</strong> unit</td>
            </tr>
            <tr>
              <td className="summary-label">Rusak Berat</td>
              <td className="summary-sep">:</td>
              <td className="summary-value"><strong>{stats.rusakBerat}</strong> unit</td>
            </tr>
            <tr className="summary-highlight">
              <td className="summary-label">Persentase Kondisi Baik</td>
              <td className="summary-sep">:</td>
              <td className="summary-value"><strong>{stats.pct}%</strong></td>
            </tr>
          </tbody>
        </table>

        <p className="section-text">
          {stats.pct >= 80
            ? `Secara umum, kondisi sarana dan prasarana sekolah berada dalam kategori BAIK dengan persentase ${stats.pct}%. Pemeliharaan rutin tetap diperlukan untuk mempertahankan kondisi ini.`
            : stats.pct >= 50
            ? `Kondisi sarana dan prasarana sekolah berada dalam kategori CUKUP dengan persentase ${stats.pct}%. Diperlukan perhatian dan tindak lanjut untuk perbaikan aset yang rusak.`
            : `Kondisi sarana dan prasarana sekolah berada dalam kategori KRITIS dengan persentase ${stats.pct}%. Diperlukan tindakan segera untuk perbaikan dan pengadaan aset.`}
        </p>
      </div>

      {/* ═════════════════ DETAIL PER BARANG ═════════════════ */}
      <div className="section">
        <h3 className="section-title">B. DETAIL INVENTARIS PER BARANG</h3>
        <p className="section-text">
          Berikut adalah rincian inventaris per barang beserta kondisi unit fisiknya:
        </p>

        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: "4%" }}>No</th>
              <th style={{ width: "24%" }}>Nama Barang</th>
              <th style={{ width: "13%" }}>Kategori</th>
              <th style={{ width: "15%" }}>Lokasi</th>
              <th style={{ width: "7%" }} className="text-center">Unit</th>
              <th style={{ width: "7%" }} className="text-center">Baik</th>
              <th style={{ width: "8%" }} className="text-center">R. Ringan</th>
              <th style={{ width: "8%" }} className="text-center">R. Berat</th>
              <th style={{ width: "7%" }} className="text-center">% Baik</th>
              <th style={{ width: "12%" }} className="text-center">Kelayakan</th>
            </tr>
          </thead>
          <tbody>
            {enrichedItems.map((it, i) => (
              <tr key={it.id}>
                <td className="text-center">{i + 1}</td>
                <td>{it.name}</td>
                <td>{it.category?.name || "-"}</td>
                <td>{it.location?.name || "-"}</td>
                <td className="text-center">{it.total}</td>
                <td className="text-center">{it.baik}</td>
                <td className="text-center">{it.rusakRingan || "-"}</td>
                <td className="text-center">{it.rusakBerat || "-"}</td>
                <td className="text-center">{it.pct}%</td>
                <td className="text-center">{it.kelayakan}</td>
              </tr>
            ))}
            <tr className="data-table-total">
              <td colSpan={4} className="text-right"><strong>TOTAL</strong></td>
              <td className="text-center"><strong>{stats.totalUnits}</strong></td>
              <td className="text-center"><strong>{stats.baik}</strong></td>
              <td className="text-center"><strong>{stats.rusakRingan}</strong></td>
              <td className="text-center"><strong>{stats.rusakBerat}</strong></td>
              <td className="text-center"><strong>{stats.pct}%</strong></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ═════════════════ BARANG PERLU PERHATIAN ═════════════════ */}
      {enrichedItems.filter(it => it.rusakRingan > 0 || it.rusakBerat > 0).length > 0 && (
        <div className="section">
          <h3 className="section-title">C. BARANG YANG MEMERLUKAN PERHATIAN</h3>
          <p className="section-text">
            Berikut adalah daftar barang yang memiliki unit dalam kondisi rusak
            dan memerlukan tindak lanjut:
          </p>

          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: "5%" }}>No</th>
                <th style={{ width: "35%" }}>Nama Barang</th>
                <th style={{ width: "20%" }}>Lokasi</th>
                <th style={{ width: "13%" }} className="text-center">Rusak Ringan</th>
                <th style={{ width: "13%" }} className="text-center">Rusak Berat</th>
                <th style={{ width: "14%" }} className="text-center">Tindak Lanjut</th>
              </tr>
            </thead>
            <tbody>
              {enrichedItems
                .filter(it => it.rusakRingan > 0 || it.rusakBerat > 0)
                .map((it, i) => (
                  <tr key={it.id}>
                    <td className="text-center">{i + 1}</td>
                    <td>{it.name}</td>
                    <td>{it.location?.name || "-"}</td>
                    <td className="text-center">{it.rusakRingan || "-"}</td>
                    <td className="text-center">{it.rusakBerat || "-"}</td>
                    <td className="text-center">
                      {it.rusakBerat > 0 ? "Perbaikan / Ganti" : "Perbaikan"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ═════════════════ KESIMPULAN ═════════════════ */}
      <div className="section">
        <h3 className="section-title">
          {enrichedItems.filter(it => it.rusakRingan > 0 || it.rusakBerat > 0).length > 0 ? "D." : "C."} KESIMPULAN
        </h3>
        <p className="section-text">
          Demikian laporan inventaris sarana dan prasarana ini disusun sebagai
          bahan evaluasi dan pengambilan keputusan untuk peningkatan kualitas
          pengelolaan aset sekolah. Laporan ini dibuat berdasarkan data yang
          tercatat dalam Sistem Informasi Inventaris Sekolah per tanggal <strong>{tanggalCetak}</strong>.
        </p>
      </div>

      {/* ═════════════════ TANDA TANGAN ═════════════════ */}
      <div className="signature-section">
        <div className="signature-row">
          <div className="signature-col">
            <p className="signature-label">Mengetahui,</p>
            <p className="signature-title">Kepala Sekolah</p>
            <div className="signature-space" />
            <p className="signature-name">(.............................................)</p>
            <p className="signature-nip">NIP. .............................................</p>
          </div>

          <div className="signature-col">
            <p className="signature-label">Rancaekek, {tanggalCetak}</p>
            <p className="signature-title">Admin Inventaris</p>
            <div className="signature-space" />
            <p className="signature-name">{profile?.full_name || "(.............................................)"}</p>
            <p className="signature-nip">NIP. .............................................</p>
          </div>
        </div>
      </div>

      {/* ═════════════════ FOOTER ═════════════════ */}
      <div className="report-footer">
        <p>
          Laporan ini digenerate secara otomatis oleh Sistem Informasi Inventaris
          SMA Pasundan Rancaekek pada {tanggalCetak} pukul {jamCetak} WIB
        </p>
        <p className="report-footer-doc">
          Dokumen No: {nomorLaporan} · Halaman <span className="page-num" />
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   Styles
============================================================ */
function PrintStyles() {
  return (
    <style>{`
      * { box-sizing: border-box; }

      .report-print-page {
        font-family: 'Times New Roman', Times, serif;
        font-size: 11pt;
        line-height: 1.5;
        color: #000;
        background: #fff;
        padding: 2cm;
        max-width: 21cm;
        margin: 0 auto;
        min-height: 29.7cm;
      }

      /* ═════ CONTROL BAR (hidden saat print) ═════ */
      .control-bar {
        position: fixed;
        top: 1rem;
        right: 1rem;
        display: flex;
        gap: 0.5rem;
        z-index: 100;
      }
      .control-bar button {
        padding: 0.6rem 1rem;
        border-radius: 8px;
        background: #7F1D1D;
        color: white;
        border: none;
        font-family: 'Arial', sans-serif;
        font-size: 0.85rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      }
      .control-bar button:hover {
        background: #991B1B;
        transform: translateY(-1px);
      }
      .control-bar button:last-child {
        background: #6B7280;
      }
      .control-bar button:last-child:hover {
        background: #4B5563;
      }

      /* ═════ KOP SURAT ═════ */
      .kop-surat {
        position: relative;
        text-align: center;
        margin-bottom: 0.3cm;
        padding: 0 1.5cm;
      }
      .kop-logo {
        position: absolute;
        top: 50%;
        left: 0;
        transform: translateY(-50%);
        flex-shrink: 0;
      }
      .kop-text {
        text-align: center;
        width: 100%;
      }
      .kop-line1 {
        font-size: 11pt;
        font-weight: 600;
        letter-spacing: 0.5px;
        margin: 0;
        line-height: 1.3;
      }
      .kop-line2 {
        font-size: 17pt;
        font-weight: 700;
        letter-spacing: 1px;
        margin: 3px 0;
        line-height: 1.2;
        text-transform: uppercase;
      }
      .kop-line3 {
        font-size: 9.5pt;
        margin: 3px 0 0 0;
        line-height: 1.3;
      }
      .kop-line4 {
        font-size: 9pt;
        margin: 3px 0 0 0;
        color: #333;
        line-height: 1.3;
      }

      .kop-divider {
        margin: 0.4cm 0 0.6cm 0;
      }
      .kop-divider-thick {
        border-top: 3px solid #000;
      }
      .kop-divider-thin {
        border-top: 1px solid #000;
        margin-top: 2px;
      }

      /* ═════ JUDUL LAPORAN ═════ */
      .report-title-section {
        text-align: center;
        margin-bottom: 0.8cm;
      }
      .report-title {
        font-size: 14pt;
        font-weight: 700;
        text-decoration: underline;
        letter-spacing: 0.5px;
        margin: 0 0 4px 0;
        text-transform: uppercase;
      }
      .report-subtitle {
        font-size: 10pt;
        font-style: italic;
        margin: 0 0 6px 0;
      }
      .report-number {
        font-size: 10pt;
        margin: 0 0 10px 0;
      }
      .report-period {
        font-size: 10.5pt;
        margin: 8px 0 0 0;
      }
      .report-filter-info {
        display: inline-block;
        text-align: left;
        margin: 10px auto;
        padding: 6px 14px;
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 4px;
        font-size: 9.5pt;
      }
      .report-filter-info p { margin: 0 0 4px 0; }
      .report-filter-info ul {
        margin: 0;
        padding-left: 20px;
      }

      /* ═════ SECTION ═════ */
      .section {
        margin-bottom: 0.7cm;
        page-break-inside: avoid;
      }
      .section-title {
        font-size: 12pt;
        font-weight: 700;
        margin: 0 0 8px 0;
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }
      .section-text {
        font-size: 10.5pt;
        text-align: justify;
        margin: 0 0 10px 0;
        line-height: 1.6;
        text-indent: 1cm;
      }

      /* ═════ SUMMARY TABLE ═════ */
      .summary-table {
        width: 100%;
        max-width: 14cm;
        margin: 10px auto;
        font-size: 10.5pt;
        border-collapse: collapse;
      }
      .summary-table td {
        padding: 4px 8px;
        vertical-align: top;
      }
      .summary-label {
        width: 45%;
        font-weight: 500;
      }
      .summary-sep {
        width: 3%;
        text-align: center;
      }
      .summary-value {
        width: 52%;
      }
      .summary-highlight td {
        border-top: 1px solid #000;
        border-bottom: 1px solid #000;
        padding: 6px 8px;
        font-weight: 700;
      }

      /* ═════ DATA TABLE ═════ */
      .data-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 9.5pt;
        margin-top: 8px;
      }
      .data-table thead {
        background: #f3f4f6;
      }
      .data-table th {
        border: 1px solid #000;
        padding: 6px 4px;
        text-align: left;
        font-weight: 700;
        font-size: 9pt;
        vertical-align: middle;
      }
      .data-table td {
        border: 1px solid #000;
        padding: 4px 6px;
        vertical-align: top;
      }
      .data-table tbody tr:nth-child(even) {
        background: #fafafa;
      }
      .data-table-total {
        background: #f3f4f6 !important;
        border-top: 2px solid #000;
      }
      .data-table-total td {
        border-top: 2px solid #000;
        font-weight: 700;
      }
      .text-center { text-align: center; }
      .text-right { text-align: right; }

      /* ═════ TANDA TANGAN ═════ */
      .signature-section {
        margin-top: 1cm;
        page-break-inside: avoid;
      }
      .signature-row {
        display: flex;
        justify-content: space-between;
        gap: 1cm;
      }
      .signature-col {
        flex: 1;
        text-align: center;
      }
      .signature-label {
        font-size: 10.5pt;
        margin: 0;
      }
      .signature-title {
        font-size: 10.5pt;
        font-weight: 700;
        margin: 2px 0 0 0;
      }
      .signature-space {
        height: 2cm;
      }
      .signature-name {
        font-size: 10.5pt;
        font-weight: 700;
        margin: 0;
        text-decoration: underline;
      }
      .signature-nip {
        font-size: 9pt;
        margin: 2px 0 0 0;
      }

      /* ═════ FOOTER ═════ */
      .report-footer {
        margin-top: 0.8cm;
        padding-top: 8px;
        border-top: 1px solid #999;
        text-align: center;
        font-size: 8.5pt;
        font-style: italic;
        color: #555;
        page-break-inside: avoid;
      }
      .report-footer p {
        margin: 2px 0;
      }
      .report-footer-doc {
        font-style: normal;
        font-size: 8pt;
      }
      .page-num::after {
        content: counter(page);
        counter-increment: page;
      }

      /* ═════ PRINT STYLES ═════ */
      @media print {
        .no-print { display: none !important; }
        .report-print-page {
          padding: 1cm;
          max-width: none;
          min-height: 0;
        }
        @page {
          size: A4;
          margin: 1.5cm;
          @bottom-center {
            content: "Halaman " counter(page) " dari " counter(pages);
            font-family: 'Times New Roman', serif;
            font-size: 9pt;
            color: #555;
          }
        }
        .section {
          page-break-inside: auto;
        }
        .section-title {
          page-break-after: avoid;
        }
        .data-table thead {
          display: table-header-group;
        }
        .data-table tr {
          page-break-inside: avoid;
        }
        .signature-section {
          page-break-inside: avoid;
        }
      }

      @media (max-width: 640px) {
        .report-print-page { padding: 1cm; font-size: 10pt; }
        .kop-surat {
          padding: 0;
          padding-top: 70px;
        }
        .kop-logo {
          position: static;
          margin: 0 auto 0.3cm;
          transform: none;
          display: block;
          text-align: center;
        }
        .kop-line2 { font-size: 14pt; }
        .kop-line3 { font-size: 8.5pt; }
        .kop-line4 { font-size: 8pt; }
        .signature-row { flex-direction: column; gap: 0.5cm; }
        .data-table { font-size: 8.5pt; }
      }
    `}</style>
  );
}