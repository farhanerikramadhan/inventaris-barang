import { supabase } from "../lib/supabase";

/**
 * Generate kode barang format: INV-YYYY-XXXX
 */
export async function generateItemCode() {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  const { data, error } = await supabase
    .from("items")
    .select("code")
    .like("code", `${prefix}%`)
    .order("code", { ascending: false })
    .limit(1);

  if (error) throw error;

  let nextNum = 1;
  if (data && data.length > 0) {
    const lastCode = data[0].code;
    const lastNum = parseInt(lastCode.replace(prefix, ""), 10);
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
  }

  return `${prefix}${String(nextNum).padStart(4, "0")}`;
}