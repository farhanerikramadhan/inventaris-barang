import { useEffect, useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { 
  ArrowLeft, Loader2, Printer, PackageX, 
  QrCode, Box, FileWarning, Bug, ChevronDown, ChevronUp 
} from "lucide-react";
import { supabase } from "../lib/supabase";
import LabelPrint from "../components/items/LabelPrint";

export default function Print() {
  const [params] = useSearchParams();

  // ── Baca parameter ──
  const itemId = params.get("item_id");
  const idsParam = params.get("ids") || "";
  const ids = useMemo(
    () => idsParam.split(",").map(s => s.trim()).filter(Boolean),
    [idsParam]
  );

  // ── State ──
  const [labels, setLabels] = useState([]);
  const [itemName, setItemName] = useState("");
  const [mode, setMode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [debug, setDebug] = useState([]);          // log debug
  const [showDebug, setShowDebug] = useState(false);

  // ── Helper log ──
  const log = (msg, data) => {
    const line = data !== undefined ? `${msg}: ${JSON.stringify(data)}` : msg;
    console.log(`[Print] ${line}`);
    setDebug(prev => [...prev, line]);
  };

  // ── Fetch ──
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError("");
      setLabels([]);
      setDebug([]);
      setItemName("");
      setMode(null);

      log("URL params", { item_id: itemId, ids: idsParam });

      try {
        // ═══════════════════════════════════════════
        // MODE 1 — item_id → semua unit 1 barang
        // ═══════════════════════════════════════════
        if (itemId) {
          log("Mode: item_id", itemId);

          const { data: item, error: itemErr } = await supabase
            .from("items")
            .select("id, name, location:locations(name)")
            .eq("id", itemId)
            .single();

          if (cancelled) return;

          log("Query item", { ok: !itemErr, item, error: itemErr?.message });

          if (itemErr || !item) {
            setError("Barang tidak ditemukan atau sudah dihapus.");
            return;
          }

          const { data: units, error: unitErr } = await supabase
            .from("item_units")
            .select("*")
            .eq("item_id", itemId)
            .order("unit_number", { ascending: true });

          if (cancelled) return;

          log("Query units", { count: units?.length, error: unitErr?.message });

          if (unitErr) {
            setError(`Gagal memuat unit: ${unitErr.message}`);
            return;
          }

          if (!units || units.length === 0) {
            setError("Barang ini belum punya unit fisik. Tambahkan stok dulu.");
            return;
          }

          setItemName(item.name);
          setMode("item");

          const built = units.map(u => ({
            // field lengkap — biar kompatibel dengan LabelPrint apa pun
            id: u.id,
            unitId: u.id,
            unit_id: u.id,
            unitCode: u.unit_code || `${item.name}-${String(u.unit_number).padStart(3, "0")}`,
            unit_code: u.unit_code || `${item.name}-${String(u.unit_number).padStart(3, "0")}`,
            unitNumber: u.unit_number,
            unit_number: u.unit_number,
            condition: u.condition,
            itemName: item.name,
            item_name: item.name,
            name: item.name,          // ← untuk LabelPrint lama
            itemId: item.id,
            item_id: item.id,
            location: item.location?.name || null,
            // kalau LabelPrint butuh nested item:
            item: {
              id: item.id,
              name: item.name,
              location: item.location?.name || null,
            },
          }));

          log("Labels built", { count: built.length, sample: built[0] });
          setLabels(built);
          return;
        }

        // ═══════════════════════════════════════════
        // MODE 2 — ids (dari checkbox UnitTable)
        // ═══════════════════════════════════════════
        if (ids.length > 0) {
          log("Mode: ids", ids);

          // 2a: coba sebagai unit_id
          const { data: units, error: unitErr } = await supabase
            .from("item_units")
            .select(`
              id, unit_number, unit_code, condition, item_id,
              item:items(id, name, location:locations(name))
            `)
            .in("id", ids);

          if (cancelled) return;

          log("Query unit_units by ids", { count: units?.length, error: unitErr?.message });

          if (!unitErr && units && units.length > 0) {
            setMode("units");
            setLabels(
              units.map(u => {
                const code = u.unit_code || `${u.item?.name}-${String(u.unit_number).padStart(3, "0")}`;
                const name = u.item?.name || "-";
                const loc = u.item?.location?.name || null;
                return {
                  id: u.id,
                  unitId: u.id,
                  unit_id: u.id,
                  unitCode: code,
                  unit_code: code,
                  unitNumber: u.unit_number,
                  unit_number: u.unit_number,
                  condition: u.condition,
                  itemName: name,
                  item_name: name,
                  name,
                  itemId: u.item?.id,
                  item_id: u.item?.id,
                  location: loc,
                  item: { id: u.item?.id, name, location: loc },
                };
              })
            );
            return;
          }

          // 2b: fallback — mungkin ids berisi item_id (mode lama)
          const { data: itemsData } = await supabase
            .from("items")
            .select("*, location:locations(name)")
            .in("id", ids);

          if (cancelled) return;

          log("Fallback: ids as item_id", { count: itemsData?.length });

          if (itemsData && itemsData.length > 0) {
            setMode("items");
            setLabels(
              itemsData.map(it => {
                const code = it.code || it.id;
                return {
                  id: it.id,
                  itemId: it.id,
                  item_id: it.id,
                  itemName: it.name,
                  item_name: it.name,
                  name: it.name,
                  unitCode: code,
                  unit_code: code,
                  location: it.location?.name || null,
                  item: { id: it.id, name: it.name, location: it.location?.name || null },
                };
              })
            );
            return;
          }
        }

        // ═══════════════════════════════════════════
        // Tidak ada parameter valid
        // ═══════════════════════════════════════════
        log("Tidak ada parameter valid");
        setError("Tidak ada barang yang dipilih untuk dicetak.");
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          log("Exception", err.message);
          setError(`Terjadi kesalahan: ${err.message}`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [itemId, ids.join(",")]);

  // ── Back URL ──
  const backUrl = itemId ? `/items/${itemId}` : "/items";
  const backLabel = itemId ? "Kembali ke Barang" : "Kembali ke Daftar";

  // ═══════════════════════════════════════════
  // LOADING
  // ═══════════════════════════════════════════
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 size={48} className="text-[var(--accent)] animate-spin" />
        <p className="text-[var(--text-main)] font-semibold">Memuat data label...</p>
        <p className="text-[var(--text-muted)] text-sm">Menyiapkan QR code untuk dicetak</p>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // ERROR / EMPTY
  // ═══════════════════════════════════════════
  if (error || labels.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="flex flex-col items-center justify-center text-center mb-6">
          <div className={`
            w-20 h-20 rounded-full flex items-center justify-center mb-4 border
            ${error 
              ? "bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-900/50" 
              : "bg-[var(--surface)] border-[var(--border)]"}
          `}>
            {error ? (
              <FileWarning size={36} className="text-orange-500" />
            ) : (
              <Printer size={36} className="text-[var(--text-muted)] opacity-50" />
            )}
          </div>

          <h2 className="text-xl font-bold text-[var(--text-main)] mb-2">
            {error || "Tidak ada barang untuk dicetak"}
          </h2>
          <p className="text-[var(--text-muted)] text-sm mb-6 max-w-md leading-relaxed">
            {error
              ? "Periksa log debug di bawah untuk detail."
              : "Pastikan Anda memilih barang terlebih dahulu."}
          </p>

          <Link
            to={backUrl}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white font-semibold text-sm hover:bg-[var(--accent-hover)] transition shadow-md"
          >
            <ArrowLeft size={16} /> {backLabel}
          </Link>
        </div>

        {/* Debug panel */}
        <DebugPanel debug={debug} show={showDebug} onToggle={() => setShowDebug(v => !v)} />
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // RENDER LABEL
  // ═══════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Toolbar (hidden saat print) */}
      <div className="print:hidden sticky top-0 z-20 bg-[var(--surface)] border-b border-[var(--border)] shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <Link
            to={backUrl}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--accent)] transition"
          >
            <ArrowLeft size={16} /> {backLabel}
          </Link>

          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1.5">
              <QrCode size={14} className="text-[var(--accent)]" />
              <span className="font-bold text-[var(--text-main)]">{labels.length}</span>
              <span className="text-[var(--text-muted)]">label siap dicetak</span>
            </div>
            {itemName && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[var(--text-muted)]">
                <span className="w-1 h-1 rounded-full bg-[var(--text-muted)]" />
                <Box size={13} />
                <span className="font-semibold text-[var(--text-main)] max-w-[200px] truncate">
                  {itemName}
                </span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDebug(v => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--text-muted)] text-xs font-semibold hover:border-[var(--accent-border)] transition"
              title="Debug info"
            >
              <Bug size={13} /> Debug
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent)] text-white font-semibold text-sm hover:bg-[var(--accent-hover)] transition shadow-md"
            >
              <Printer size={16} /> Cetak Sekarang
            </button>
          </div>
        </div>

        {showDebug && (
          <div className="max-w-6xl mx-auto px-4 pb-3">
            <DebugPanel debug={debug} show={true} onToggle={() => setShowDebug(false)} compact />
          </div>
        )}
      </div>

      {/* Konten label — props dikirim LENGKAP untuk kompatibilitas */}
      <LabelPrint
        labels={labels}
        items={labels}
        data={labels}
        mode={mode}
        itemName={itemName}
        onClose={() => window.history.back()}
      />
    </div>
  );
}

/* ============================================================
   Debug Panel
============================================================ */
function DebugPanel({ debug, show, onToggle, compact }) {
  if (compact) {
    return (
      <details className="rounded-lg bg-[var(--background)] border border-[var(--border)] p-3 text-xs font-mono">
        <summary className="cursor-pointer text-[var(--text-muted)] font-sans font-semibold">
          Debug log ({debug.length} baris)
        </summary>
        <pre className="mt-2 whitespace-pre-wrap text-[var(--text-muted)] leading-relaxed">
          {debug.join("\n")}
        </pre>
      </details>
    );
  }

  return (
    <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-[var(--text-main)] hover:bg-[var(--background)] transition"
      >
        <span className="inline-flex items-center gap-2">
          <Bug size={14} /> Debug Info ({debug.length} baris)
        </span>
        {show ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {show && (
        <pre className="px-4 py-3 text-xs font-mono whitespace-pre-wrap text-[var(--text-muted)] bg-[var(--background)] border-t border-[var(--border)] leading-relaxed max-h-96 overflow-auto">
          {debug.length === 0 ? "(belum ada log)" : debug.join("\n")}
        </pre>
      )}
    </div>
  );
}