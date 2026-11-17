import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function useItems({ search = "", categoryId = null, locationId = null } = {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);

    let query = supabase
      .from("items")
      .select(`
        *,
        category:categories(id, name),
        location:locations(id, name),
        item_units(id, condition, status)
      `)
      .order("created_at", { ascending: false });

    if (search) query = query.or(`name.ilike.%${search}%`);
    if (categoryId) query = query.eq("category_id", categoryId);
    if (locationId) query = query.eq("location_id", locationId);

    const { data, error } = await query;

    if (error) {
      setError(error.message);
    } else {
      const processed = (data || []).map((it) => {
        const units = it.item_units || [];
        const total = units.length;
        const baik = units.filter(u => u.condition === 'baik').length;
        const rusak = units.filter(u => u.condition !== 'baik').length;
        
        // ✅ TAMBAHKAN: Hitung jumlah unit yang dipinjam dan aktif
        const dipinjam = units.filter(u => u.status === 'dipinjam').length;
        const active = units.filter(u => u.status === 'active').length;

        return {
          ...it,
          total_units: total,
          condition_summary: { baik, rusak },
          // ✅ TAMBAHKAN: Simpan ringkasan status
          status_summary: { dipinjam, active }
        };
      });
      setItems(processed);
    }
    setLoading(false);
  }, [search, categoryId, locationId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return { items, loading, error, refetch: fetchItems };
}