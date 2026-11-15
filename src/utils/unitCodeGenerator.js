import { supabase } from "../lib/supabase";

function cleanLetters(text) {
  if (!text) return "";
  return text.replace(/[^A-Za-z]/g, "").toUpperCase();
}

function cleanNumbers(text) {
  if (!text) return "";
  return text.replace(/[^0-9]/g, "");
}

/**
 * Generate Kode Unik Format: {2 HURUF BARANG}{ANGKA LOKASI}{NO URUT 3 DIGIT}
 * Contoh: ME115001
 */
export function buildUnitCode(itemName, locationName, unitNumber) {
  const namePart = cleanLetters(itemName).substring(0, 2).padEnd(2, "X");
  const locPart = cleanNumbers(locationName);
  const numPart = String(unitNumber).padStart(3, "0");
  return `${namePart}${locPart}${numPart}`;
}

/**
 * Cari nomor urut yang KOSONG (slot terendah yang belum dipakai)
 * @param {Array<number>} usedNumbers - Array nomor urut yang sudah dipakai
 * @param {number} count - Berapa slot kosong yang dibutuhkan
 * @returns {Array<number>} Array nomor urut kosong
 */
export function findEmptySlots(usedNumbers, count) {
  const usedSet = new Set(usedNumbers);
  const result = [];
  let candidate = 1;
  while (result.length < count) {
    if (!usedSet.has(candidate)) {
      result.push(candidate);
    }
    candidate++;
  }
  return result;
}
