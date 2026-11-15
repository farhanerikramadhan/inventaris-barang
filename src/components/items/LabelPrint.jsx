import { QRCodeSVG } from "qrcode.react";
import { Archive } from "lucide-react";

/**
 * Label QR minimalis.
 * QR berisi TEKS detail (nama, lokasi, no urut) — bukan link.
 */
export default function LabelPrint({ labels, items, data, itemName }) {
  const list = labels || items || data || [];

  const normalized = list.map((l, idx) => {
    const unitId = l.id || l.unitId || l.unit_id || idx;

    // ── Ambil field dengan fallback ──
    const namaBarang = l.itemName || l.item_name || l.name || l.item?.name || "-";
    const lokasi = l.location || l.item?.location || "-";
    const noUrut = l.unitNumber ?? l.unit_number ?? "-";
    const kodeUnit = l.unitCode || l.unit_code || `UNIT-${unitId}`;

    // ── Isi QR: teks multi-baris ──
    const qrValue = [
      `Nama Barang: ${namaBarang}`,
      `Lokasi: ${lokasi}`,
      `No Urut: ${noUrut}`,
    ].join("\n");

    return {
      id: unitId,
      qrValue,
      kodeUnit,
      namaBarang,
      lokasi,
      noUrut,
    };
  });

  const SCHOOL_NAME = "SMA Pasundan Rancaekek";

  return (
    <div className="print-area max-w-6xl mx-auto p-4">
      <LabelStyles />

      {/* Preview header */}
      <div className="print:hidden mb-4 flex items-center justify-between text-xs text-[var(--text-muted)]">
        <span>
          Preview — <strong className="text-[var(--text-main)]">{normalized.length}</strong> label
          {itemName && <> untuk <strong className="text-[var(--text-main)]">{itemName}</strong></>}
        </span>
        <span className="hidden sm:inline">A4 · 4 kolom · QR berisi detail</span>
      </div>

      {/* Grid label */}
      <div className="labels-grid">
        {normalized.map((l) => (
          <div key={l.id} className="label-card">
            {/* Header: logo + sekolah */}
            <div className="label-header">
              <div className="label-logo">
                <Archive size={10} strokeWidth={2.5} />
              </div>
              <span className="label-school">{SCHOOL_NAME}</span>
            </div>

            {/* QR */}
            <div className="label-qr">
              <QRCodeSVG
                value={l.qrValue}
                size={100}
                level="M"
                bgColor="#FFFFFF"
                fgColor="#000000"
              />
            </div>

            {/* Teks di bawah QR (untuk dibaca mata) */}
            <div className="label-text">
              <p className="label-text-name" title={l.namaBarang}>
                {l.namaBarang}
              </p>
              <p className="label-text-meta">
                <span>No. {l.noUrut}</span>
                <span className="label-text-sep">·</span>
                <span className="label-text-loc" title={l.lokasi}>
                  {l.lokasi}
                </span>
              </p>
            </div>
          </div>
        ))}
      </div>

      {normalized.length === 0 && (
        <div className="print:hidden py-16 text-center text-[var(--text-muted)]">
          Tidak ada label untuk ditampilkan.
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Styles
============================================================ */
function LabelStyles() {
  return (
    <style>{`
      .labels-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }
      @media (min-width: 640px) {
        .labels-grid { grid-template-columns: repeat(3, 1fr); }
      }
      @media (min-width: 1024px) {
        .labels-grid { grid-template-columns: repeat(4, 1fr); }
      }

      .label-card {
        background: #FFFFFF;
        border: 1px solid #E5E7EB;
        border-radius: 8px;
        padding: 8px 6px 6px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        break-inside: avoid;
        transition: all 0.2s;
      }
      .label-card:hover {
        border-color: #C9A227;
        box-shadow: 0 4px 12px -4px rgba(0,0,0,0.1);
      }

      /* Header */
      .label-header {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        width: 100%;
        padding-bottom: 4px;
        border-bottom: 1px solid #E5E7EB;
      }
      .label-logo {
        width: 16px; height: 16px;
        border-radius: 4px;
        background: #7F1D1D;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .label-school {
        font-size: 0.6rem;
        font-weight: 800;
        color: #7F1D1D;
        text-align: center;
        line-height: 1.1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      /* QR */
      .label-qr {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2px 0;
      }
      .label-qr svg {
        width: 100px !important;
        height: 100px !important;
      }

      /* Teks bawah QR */
      .label-text {
        width: 100%;
        text-align: center;
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding-top: 2px;
      }
      .label-text-name {
        font-size: 0.66rem;
        font-weight: 800;
        color: #111827;
        line-height: 1.15;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        word-break: break-word;
      }
      .label-text-meta {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 3px;
        font-size: 0.58rem;
        font-weight: 600;
        color: #6B7280;
        flex-wrap: wrap;
      }
      .label-text-meta span {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .label-text-loc {
        max-width: 80px;
      }
      .label-text-sep {
        opacity: 0.5;
      }

      /* Print */
      @media print {
        .print\\:hidden { display: none !important; }
        nav, aside, header, footer { display: none !important; }
        body { background: white !important; margin: 0 !important; padding: 0 !important; }
        .print-area { padding: 5mm !important; max-width: none !important; }
        .labels-grid {
          display: grid !important;
          grid-template-columns: repeat(4, 1fr) !important;
          gap: 3mm !important;
        }
        .label-card {
          border: 1px dashed #9CA3AF !important;
          border-radius: 4px !important;
          padding: 3px 3px 2px !important;
          gap: 2px !important;
          box-shadow: none !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        .label-logo { width: 12px !important; height: 12px !important; }
        .label-logo svg { width: 8px !important; height: 8px !important; }
        .label-school { font-size: 5.5pt !important; }
        .label-qr svg { width: 68px !important; height: 68px !important; }
        .label-text-name { font-size: 6pt !important; }
        .label-text-meta { font-size: 5pt !important; }
        @page { size: A4; margin: 5mm; }
      }
    `}</style>
  );
}