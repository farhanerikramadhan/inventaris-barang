import { useEffect, useState, useMemo } from "react";
import {
  Package, Hash, MapPin, Tag, X, Plus, Save,
  AlertCircle, CheckCircle2, Loader2, Info,
  Box, ListPlus, Sparkles, QrCode, ArrowRight
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { logActivity } from "../../utils/logActivity";
import "../../styles/modal.css";

export default function ItemForm({ item, onClose, onSaved }) {
  const isEdit = !!item;

  const [form, setForm] = useState({
    name: "",
    category_id: "",
    location_id: "",
    notes: "",
  });
  const [qty, setQty] = useState(1);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // ── ESC + lock scroll ──
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape" && !saving) onClose?.();
    };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [saving, onClose]);

  // ── Fetch categories & locations ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [cats, locs] = await Promise.all([
        supabase.from("categories").select("*").order("name"),
        supabase.from("locations").select("*").order("name"),
      ]);
      if (cancelled) return;
      setCategories(cats.data || []);
      setLocations(locs.data || []);

      if (isEdit) {
        setForm({
          name: item.name || "",
          category_id: item.category_id || "",
          location_id: item.location_id || "",
          notes: item.notes || "",
        });
        setQty(0);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [item, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  // ── Preview kode unit ──
  const previewCode = useMemo(() => {
    const namePart = (form.name || "XX")
      .replace(/[^A-Za-z]/g, "")
      .substring(0, 2)
      .toUpperCase()
      .padEnd(2, "X");
    const locName = locations.find(l => l.id === form.location_id)?.name || "";
    const locPart = (locName || "").replace(/[^0-9]/g, "");
    return `${namePart}${locPart}001`;
  }, [form.name, form.location_id, locations]);

  const selectedLocation = locations.find(l => l.id === form.location_id);
  const selectedCategory = categories.find(c => c.id === form.category_id);

  // ── Detect perubahan (mode edit) ──
  const hasChanges = isEdit
    ? (form.name !== (item.name || "") ||
       form.category_id !== (item.category_id || "") ||
       form.location_id !== (item.location_id || "") ||
       form.notes !== (item.notes || ""))
    : form.name.trim().length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving || loading) return;

    setSaving(true);
    setError("");

    const payload = {
      name: form.name.trim(),
      category_id: form.category_id || null,
      location_id: form.location_id || null,
      notes: form.notes.trim() || null,
    };

    try {
      if (isEdit) {
        // ── Mode Edit ──
        const { data: updated, error: upErr } = await supabase
          .from("items")
          .update(payload)
          .eq("id", item.id)
          .select()
          .single();
        if (upErr) throw upErr;

        await logActivity({
          action: "update_item",
          entity: "items",
          entityId: updated.id,
          detail: { name: updated.name },
        });
      } else {
        // ── Mode Create ──
        const { data: newItem, error: insErr } = await supabase
          .from("items")
          .insert(payload)
          .select()
          .single();
        if (insErr) throw insErr;

        // Generate units
        const locName = selectedLocation?.name || "";
        const namePart = form.name
          .replace(/[^A-Za-z]/g, "")
          .substring(0, 2)
          .toUpperCase()
          .padEnd(2, "X");
        const locPart = locName.replace(/[^0-9]/g, "");

        const unitsPayload = [];
        for (let i = 1; i <= qty; i++) {
          unitsPayload.push({
            item_id: newItem.id,
            unit_number: i,
            unit_code: `${namePart}${locPart}${String(i).padStart(3, "0")}`,
            condition: "baik",
            status: "active",
          });
        }

        const { error: unitErr } = await supabase.from("item_units").insert(unitsPayload);
        if (unitErr) throw unitErr;

        await logActivity({
          action: "create_item",
          entity: "items",
          entityId: newItem.id,
          detail: { name: newItem.name, units_created: qty },
        });
      }

      onSaved?.();
      onClose?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="mc-modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && !saving && onClose?.()}
    >
      <form
        onSubmit={handleSubmit}
        className="mc-modal mc-modal-wide"
        onClick={(e) => e.stopPropagation()}
      >
        <ItemFormStyles />

        {/* ============ HEADER ============ */}
        <div className="mc-modal-head">
          <div className="mc-modal-head-glow" />
          <div className="mc-modal-head-content">
            <div className="mc-modal-icon">
              <Package size={20} />
            </div>
            <div className="mc-modal-head-text">
              <h2 className="mc-modal-title">
                {isEdit ? "Edit Barang" : "Tambah Barang Baru"}
              </h2>
              <p className="mc-modal-sub">
                {isEdit
                  ? <>Edit info induk <strong>{item.name}</strong></>
                  : <>Lengkapi data barang inventaris</>}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="mc-modal-close"
              aria-label="Tutup"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ============ BODY ============ */}
        <div className="mc-modal-body mc-body-grid">
          {error && (
            <div className="mc-error mc-span-full">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="mc-skel mc-span-full" />
          ) : (
            <>
              {/* KOLOM KIRI */}
              <div className="mc-col">
                {!isEdit && (
                  <div className="mc-preview">
                    <div className="mc-preview-head">
                      <span className="mc-preview-label">
                        <QrCode size={11} /> Preview Kode Unit
                      </span>
                    </div>

                    <div className="mc-preview-code-box">
                      <p className="mc-preview-code">{previewCode}</p>
                      <p className="mc-preview-hint">
                        2 huruf barang + angka lokasi + no urut
                      </p>
                    </div>

                    {form.name && form.location_id && (
                      <div className="mc-preview-flow">
                        <span className="mc-preview-tag">{form.name.slice(0, 2).toUpperCase()}</span>
                        <span className="mc-preview-plus">+</span>
                        <span className="mc-preview-tag">
                          {selectedLocation?.name.match(/\d+/)?.[0] || "0"}
                        </span>
                        <ArrowRight size={11} className="mc-preview-arrow" />
                        <span className="mc-preview-tag highlight">
                          {previewCode}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {isEdit && (
                  <div className="mc-preview">
                    <div className="mc-preview-head">
                      <span className="mc-preview-label">
                        <Info size={11} /> Info Barang
                      </span>
                    </div>

                    <div className="mc-info-list">
                      <div className="mc-info-row">
                        <span className="mc-info-key">Nama</span>
                        <span className="mc-info-val">{item.name}</span>
                      </div>
                      <div className="mc-info-row">
                        <span className="mc-info-key">Kategori</span>
                        <span className="mc-info-val">{item.category?.name || "-"}</span>
                      </div>
                      <div className="mc-info-row">
                        <span className="mc-info-key">Lokasi</span>
                        <span className="mc-info-val">{item.location?.name || "-"}</span>
                      </div>
                    </div>
                  </div>
                )}

                {!isEdit && (
                  <div className="mc-field">
                    <label className="mc-label">
                      <ListPlus size={12} />
                      Jumlah unit fisik awal
                    </label>
                    <div className="mc-stepper">
                      <button
                        type="button"
                        onClick={() => setQty(q => Math.max(1, q - 1))}
                        disabled={qty <= 1 || saving}
                        className="mc-stepper-btn"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={qty}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          setQty(Math.max(1, Math.min(100, val)));
                        }}
                        disabled={saving}
                        className="mc-stepper-input"
                      />
                      <button
                        type="button"
                        onClick={() => setQty(q => Math.min(100, q + 1))}
                        disabled={qty >= 100 || saving}
                        className="mc-stepper-btn"
                      >
                        +
                      </button>
                    </div>
                    <p className="mc-field-hint">
                      Unit akan dibuat otomatis dengan kode berurutan
                    </p>
                  </div>
                )}
              </div>

              {/* KOLOM KANAN */}
              <div className="mc-col">
                <div className="mc-field">
                  <label className="mc-label">
                    <Package size={12} />
                    Nama Barang <span className="mc-label-req">*</span>
                  </label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    placeholder="Contoh: Meja Lipat"
                    maxLength={100}
                    disabled={saving}
                    className="mc-input"
                  />
                </div>

                <div className="mc-grid-2">
                  <div className="mc-field">
                    <label className="mc-label">
                      <Tag size={12} />
                      Kategori
                    </label>
                    <div className="mc-select-wrap">
                      <select
                        name="category_id"
                        value={form.category_id}
                        onChange={handleChange}
                        disabled={saving}
                        className="mc-select"
                      >
                        <option value="">— Tanpa Kategori —</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mc-field">
                    <label className="mc-label">
                      <MapPin size={12} />
                      Lokasi
                    </label>
                    <div className="mc-select-wrap">
                      <select
                        name="location_id"
                        value={form.location_id}
                        onChange={handleChange}
                        disabled={saving}
                        className="mc-select"
                      >
                        <option value="">— Tanpa Lokasi —</option>
                        {locations.map(l => (
                          <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="mc-field">
                  <label className="mc-label">
                    Catatan <span className="mc-label-opt">(opsional)</span>
                  </label>
                  <textarea
                    name="notes"
                    value={form.notes}
                    onChange={handleChange}
                    placeholder="Keterangan tambahan..."
                    rows={3}
                    maxLength={200}
                    disabled={saving}
                    className="mc-textarea"
                  />
                  <p className="mc-field-hint" style={{ textAlign: "right" }}>
                    {form.notes.length}/200
                  </p>
                </div>

                {isEdit && (
                  <div className="mc-hint">
                    <Info size={13} />
                    <span>
                      Info induk saja. Untuk ubah kondisi/status unit, buka detail unit.
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ============ FOOTER ============ */}
        <div className="mc-modal-footer">
          <div className="mc-modal-summary">
            {isEdit ? (
              hasChanges ? (
                <><CheckCircle2 size={13} /> Ada perubahan belum disimpan</>
              ) : (
                <><Info size={13} /> Tidak ada perubahan</>
              )
            ) : (
              <><Sparkles size={13} /> Akan membuat barang baru{qty > 0 && ` + ${qty} unit`}</>
            )}
          </div>
          <div className="mc-modal-actions">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="mc-btn-ghost"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving || loading || !hasChanges}
              className="mc-btn-primary"
            >
              {saving ? (
                <><Loader2 size={14} className="mc-spin" /> Menyimpan...</>
              ) : isEdit ? (
                <><Save size={14} /> Simpan Perubahan</>
              ) : (
                <><Plus size={14} /> Tambah Barang</>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

/* ============================================================
   Styles
============================================================ */
function ItemFormStyles() {
  return (
    <style>{`
      .mc-modal-wide { max-width: 760px; }
      @media (max-width: 720px) {
        .mc-modal-wide { max-width: 100%; margin: 0.5rem; }
      }

      /* ✅ KUNCI SCROLL: align-items start & overflow auto */
      .mc-body-grid {
        display: grid;
        grid-template-columns: 1fr 1.2fr;
        gap: 1.1rem;
        align-items: start; /* Mencegah stretching */
      }
      @media (max-width: 720px) {
        .mc-body-grid {
          grid-template-columns: 1fr;
          gap: 0.9rem;
        }
      }
      .mc-span-full { grid-column: 1 / -1; }

      .mc-col {
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
        min-width: 0;
      }

      .mc-error {
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;
        background: var(--danger-soft, #FEF2F2);
        border: 1px solid var(--danger-border, #FECACA);
        color: var(--danger, #DC2626);
        padding: 0.65rem 0.85rem;
        border-radius: 10px;
        font-size: 0.8rem;
        font-weight: 500;
      }
      .mc-error svg { flex-shrink: 0; margin-top: 1px; }
      .dark .mc-error {
        background: rgba(239, 68, 68, 0.1);
        border-color: rgba(239, 68, 68, 0.25);
        color: #F87171;
      }

      .mc-preview {
        background: var(--accent-soft);
        border: 1px solid var(--accent-border);
        border-radius: 11px;
        padding: 0.85rem 0.9rem;
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
      }
      .mc-preview-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .mc-preview-label {
        display: flex;
        align-items: center;
        gap: 0.3rem;
        font-size: 0.68rem;
        font-weight: 700;
        color: var(--accent);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .mc-preview-code-box {
        background: var(--surface);
        border: 1px solid var(--accent-border);
        border-radius: 9px;
        padding: 0.75rem;
        text-align: center;
      }
      .mc-preview-code {
        font-family: 'JetBrains Mono', 'Courier New', monospace;
        font-size: 1.15rem;
        font-weight: 800;
        color: var(--accent);
        letter-spacing: 0.05em;
        word-break: break-all;
      }
      .mc-preview-hint {
        font-size: 0.65rem;
        color: var(--text-muted);
        margin-top: 0.35rem;
        font-style: italic;
      }

      .mc-preview-flow {
        display: flex;
        align-items: center;
        gap: 0.3rem;
        flex-wrap: wrap;
        font-size: 0.7rem;
      }
      .mc-preview-tag {
        font-family: 'JetBrains Mono', 'Courier New', monospace;
        font-size: 0.68rem;
        font-weight: 800;
        color: var(--text-muted);
        background: var(--surface);
        border: 1px solid var(--border);
        padding: 0.1rem 0.4rem;
        border-radius: 4px;
      }
      .mc-preview-tag.highlight {
        color: var(--accent);
        background: var(--surface);
        border-color: var(--accent-border);
      }
      .mc-preview-plus,
      .mc-preview-arrow {
        color: var(--text-muted);
        opacity: 0.6;
        font-size: 0.75rem;
      }

      .mc-info-list {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
      }
      .mc-info-row {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 0.5rem;
        padding-bottom: 0.4rem;
        border-bottom: 1px dashed var(--accent-border);
        font-size: 0.78rem;
      }
      .mc-info-row:last-child {
        border-bottom: none;
        padding-bottom: 0;
      }
      .mc-info-key {
        color: var(--text-muted);
        font-weight: 600;
        flex-shrink: 0;
      }
      .mc-info-val {
        font-weight: 700;
        color: var(--text-main);
        text-align: right;
        word-break: break-word;
      }

      .mc-field { display: flex; flex-direction: column; }
      .mc-label {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        font-size: 0.75rem;
        font-weight: 700;
        color: var(--text-main);
        margin-bottom: 0.45rem;
      }
      .mc-label-req {
        color: #EF4444;
        font-size: 0.85rem;
        line-height: 1;
      }
      .mc-label-opt {
        font-weight: 500;
        color: var(--text-muted);
        font-size: 0.7rem;
      }
      .mc-field-hint {
        font-size: 0.68rem;
        color: var(--text-muted);
        margin-top: 0.35rem;
      }

      .mc-input {
        width: 100%;
        background: var(--background);
        border: 1.5px solid var(--border);
        border-radius: 10px;
        color: var(--text-main);
        padding: 0.6rem 0.8rem;
        font-size: 0.85rem;
        font-family: inherit;
        transition: all 0.2s;
      }
      .mc-input:focus {
        outline: none;
        border-color: var(--accent);
        background: var(--surface);
        box-shadow: 0 0 0 3px var(--accent-soft);
      }
      .mc-input::placeholder { color: var(--text-muted); opacity: 0.6; }
      .mc-input:disabled { opacity: 0.6; cursor: not-allowed; }

      .mc-select-wrap { position: relative; }
      .mc-select {
        width: 100%;
        background: var(--background);
        border: 1.5px solid var(--border);
        border-radius: 10px;
        color: var(--text-main);
        padding: 0.6rem 2rem 0.6rem 0.8rem;
        font-size: 0.85rem;
        font-family: inherit;
        cursor: pointer;
        transition: all 0.2s;
        appearance: none;
        background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
        background-repeat: no-repeat;
        background-position: right 0.7rem center;
      }
      .mc-select:focus {
        outline: none;
        border-color: var(--accent);
        background-color: var(--surface);
        box-shadow: 0 0 0 3px var(--accent-soft);
      }
      .mc-select:disabled { opacity: 0.6; cursor: not-allowed; }

      .mc-textarea {
        width: 100%;
        background: var(--background);
        border: 1.5px solid var(--border);
        border-radius: 10px;
        color: var(--text-main);
        padding: 0.6rem 0.8rem;
        font-size: 0.85rem;
        font-family: inherit;
        resize: vertical;
        min-height: 64px;
        transition: all 0.2s;
      }
      .mc-textarea:focus {
        outline: none;
        border-color: var(--accent);
        background: var(--surface);
        box-shadow: 0 0 0 3px var(--accent-soft);
      }
      .mc-textarea::placeholder { color: var(--text-muted); opacity: 0.6; }
      .mc-textarea:disabled { opacity: 0.6; cursor: not-allowed; }

      .mc-grid-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.6rem;
      }
      @media (max-width: 480px) {
        .mc-grid-2 { grid-template-columns: 1fr; }
      }

      .mc-stepper {
        display: flex;
        border: 1.5px solid var(--border);
        border-radius: 11px;
        overflow: hidden;
        background: var(--background);
        transition: border-color 0.2s, box-shadow 0.2s;
      }
      .mc-stepper:focus-within {
        border-color: var(--accent);
        box-shadow: 0 0 0 3px var(--accent-soft);
      }
      .mc-stepper-btn {
        width: 40px;
        background: transparent;
        border: none;
        color: var(--text-main);
        font-size: 1.2rem;
        font-weight: 700;
        cursor: pointer;
        transition: background 0.2s, color 0.2s;
        flex-shrink: 0;
        font-family: inherit;
      }
      .mc-stepper-btn:hover:not(:disabled) {
        background: var(--accent-soft);
        color: var(--accent);
      }
      .mc-stepper-btn:disabled { opacity: 0.3; cursor: not-allowed; }
      .mc-stepper-input {
        flex: 1;
        border: none;
        background: transparent;
        text-align: center;
        font-size: 1.2rem;
        font-weight: 800;
        color: var(--text-main);
        font-variant-numeric: tabular-nums;
        padding: 0.5rem 0;
        outline: none;
        font-family: inherit;
      }
      .mc-stepper-input::-webkit-outer-spin-button,
      .mc-stepper-input::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
      .mc-stepper-input[type=number] { -moz-appearance: textfield; }

      .mc-hint {
        display: flex;
        align-items: flex-start;
        gap: 0.45rem;
        padding: 0.55rem 0.75rem;
        background: var(--info-soft, #EFF6FF);
        border: 1px solid var(--info-border, #BFDBFE);
        border-radius: 9px;
        font-size: 0.72rem;
        color: var(--text-muted);
        line-height: 1.4;
      }
      .mc-hint svg { color: #3B82F6; flex-shrink: 0; margin-top: 1px; }
      .dark .mc-hint {
        background: rgba(59, 130, 246, 0.08);
        border-color: rgba(59, 130, 246, 0.2);
      }

      .mc-skel {
        height: 240px;
        border-radius: 11px;
        background: var(--background);
        animation: mc-pulse 1.5s ease-in-out infinite;
      }
      @keyframes mc-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      @media (max-width: 720px) {
        .mc-preview-code { font-size: 1rem; }
      }
    `}</style>
  );
}