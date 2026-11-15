import { useState } from "react";
import Papa from "papaparse";
import { supabase } from "../../lib/supabase";
import { logActivity } from "../../utils/logActivity";
import { buildUnitCode } from "../../utils/unitCodeGenerator";
import { UploadCloud, CheckCircle2, AlertCircle } from "lucide-react";

export default function ImportCSV({ onClose, onImported }) {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setError("");
    setResult(null);

    try {
      const text = await file.text();
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });

      if (parsed.errors.length) throw new Error("CSV tidak valid: " + parsed.errors[0].message);

      // Filter baris yang punya data valid
      const rows = parsed.data.filter(r => r["Jenis Sarana"] && r["Letak"] && r["Jumlah"]);
      if (rows.length === 0) throw new Error("Data tidak ditemukan. Pastikan format CSV sesuai Dapodik (kolom: Jenis Sarana, Letak, Jumlah).");

      // 1. Grouping data berdasarkan (Jenis Sarana + Letak)
      const groups = {};
      rows.forEach((r) => {
        const name = r["Jenis Sarana"].trim();
        const locationName = r["Letak"].trim();
        const qtyLaik = parseInt(r["Laik"]) || parseInt(r["Jumlah"]) || 0;
        
        if (qtyLaik <= 0) return; // Skip jika 0 barang laik

        const key = `${name}__${locationName}`;
        if (!groups[key]) {
          groups[key] = { name, locationName, totalQty: 0 };
        }
        groups[key].totalQty += qtyLaik;
      });

      const groupedRows = Object.values(groups);
      
      // 2. Pastikan Kategori "Inventaris Dapodik" & Lokasi sudah ada
      const categoryName = "Inventaris Dapodik";
      const uniqueLocations = [...new Set(groupedRows.map(r => r.locationName))];
      
      await supabase.from("categories").upsert({ name: categoryName }, { onConflict: "name" });
      await supabase.from("locations").upsert(
        uniqueLocations.map(name => ({ name })), 
        { onConflict: "name" }
      );

      // 3. Ambil ID Kategori & Lokasi untuk mapping
      const { data: catData } = await supabase.from("categories").select("id").eq("name", categoryName).single();
      const { data: locData } = await supabase.from("locations").select("id, name").in("name", uniqueLocations);
      
      const catId = catData.id;
      const locMap = Object.fromEntries(locData.map(l => [l.name, l.id]));

      // 4. Proses Insert Barang (Induk + Unit)
      let totalItemsCreated = 0;
      let totalUnitsCreated = 0;

      for (const group of groupedRows) {
        // Buat Induk Barang
        const { data: newItem, error: itemErr } = await supabase
          .from("items")
          .insert({
            name: group.name,
            category_id: catId,
            location_id: locMap[group.locationName] || null,
          })
          .select()
          .single();

        if (itemErr) throw itemErr;

        // Generate Unit Fisik
        const unitsPayload = [];
        for (let i = 1; i <= group.totalQty; i++) {
          unitsPayload.push({
            item_id: newItem.id,
            unit_number: i,
            unit_code: buildUnitCode(group.name, group.locationName, i),
            condition: "baik",
            status: "active",
          });
        }

        const { error: unitErr } = await supabase.from("item_units").insert(unitsPayload);
        if (unitErr) throw unitErr;

        totalItemsCreated++;
        totalUnitsCreated += group.totalQty;
      }

      await logActivity({ 
        action: "import_dapodik", 
        entity: "items", 
        detail: { items: totalItemsCreated, units: totalUnitsCreated } 
      });

      setResult(`Berhasil import ${totalItemsCreated} jenis barang dan generate ${totalUnitsCreated} unit fisik!`);
      onImported?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--surface)] rounded-2xl shadow-xl border border-[var(--border)] w-full max-w-lg p-6 space-y-5 animate-fade-in">
        
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[var(--accent-soft)] text-[var(--accent)] rounded-full mb-3">
            <UploadCloud size={28} />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-main)]">Import Data Dapodik</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">Upload file CSV Sarana dari Dapodik</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100 flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {result && (
          <div className="bg-green-50 text-green-700 text-sm p-3 rounded-xl border border-green-100 flex items-start gap-2">
            <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            <p>{result}</p>
          </div>
        )}

        <div className="bg-[var(--background)] border border-[var(--border)] rounded-xl p-4 text-sm text-[var(--text-muted)] space-y-2">
          <p className="font-bold text-[var(--text-main)]">Instruksi:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Buka file Excel Dapodik → Sheet <b>Sarana</b>.</li>
            <li>Save As → format <b>CSV (Comma delimited)</b>.</li>
            <li>Pastikan kolom: <code>Jenis Sarana</code>, <code>Letak</code>, <code>Laik</code>, <code>Jumlah</code> ada.</li>
            <li>Upload file CSV tersebut di bawah ini.</li>
          </ol>
        </div>

        <input 
          type="file" 
          accept=".csv" 
          onChange={handleFile} 
          disabled={importing}
          className="block w-full text-sm text-[var(--text-muted)] file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-[var(--accent)] file:text-white hover:file:bg-[var(--accent-hover)] transition cursor-pointer" 
        />

        <div className="flex justify-end pt-2">
          <button onClick={onClose} className="px-5 py-2 rounded-xl border border-[var(--border)] text-[var(--text-main)] font-semibold text-sm hover:bg-[var(--background)] transition">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
