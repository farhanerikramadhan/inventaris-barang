import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../stores/authStore";

/* ── Konfigurasi: action mana untuk role apa ── */
const NOTIF_CONFIG = {
  // Super Admin only
  register_user:    { roles: ["super_admin"], level: "info",    label: "User baru terdaftar" },
  update_user_role: { roles: ["super_admin"], level: "warning", label: "Role user berubah" },
  deactivate_user:  { roles: ["super_admin"], level: "warning", label: "User dinonaktifkan" },
  activate_user:    { roles: ["super_admin"], level: "info",    label: "User diaktifkan" },

  // Super Admin + Admin
  delete_item:     { roles: ["super_admin", "admin"], level: "danger",  label: "Barang dihapus" },
  delete_category: { roles: ["super_admin", "admin"], level: "danger",  label: "Kategori dihapus" },
  delete_location: { roles: ["super_admin", "admin"], level: "danger",  label: "Lokasi dihapus" },
  delete_unit:     { roles: ["super_admin", "admin"], level: "danger",  label: "Unit dihapus" },
  stock_out:       { roles: ["super_admin", "admin"], level: "warning", label: "Stok keluar" },
  import_csv:      { roles: ["super_admin", "admin"], level: "info",    label: "Import CSV" },
  create_item:     { roles: ["super_admin", "admin"], level: "success", label: "Barang baru dibuat" },
  add_unit:        { roles: ["super_admin", "admin"], level: "success", label: "Unit baru ditambah" },
  stock_in:        { roles: ["super_admin", "admin"], level: "success", label: "Stok masuk" },
  update_unit:     { roles: ["super_admin", "admin"], level: "info",    label: "Unit diperbarui" },
  update_item:     { roles: ["super_admin", "admin"], level: "info",    label: "Barang diperbarui" },
};

export function useNotifications() {
  const { profile } = useAuthStore();
  const storageKey = `notif_last_read_${profile?.id || "guest"}`;

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastReadAt, setLastReadAt] = useState(() => {
    const stored = localStorage.getItem(storageKey);
    return stored ? new Date(stored) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  });

  // Update storage key kalau profile berubah
  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    setLastReadAt(stored ? new Date(stored) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  }, [storageKey]);

  // ── Actions yang relevan untuk role ──
  const allowedActions = useMemo(() => {
    const role = profile?.role;
    if (!role) return [];
    return Object.entries(NOTIF_CONFIG)
      .filter(([, cfg]) => cfg.roles.includes(role))
      .map(([action]) => action);
  }, [profile?.role]);

  // ── Fetch ──
  const fetchNotifs = useCallback(async () => {
    if (!profile?.role || allowedActions.length === 0) {
      setLogs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const { data } = await supabase
      .from("activity_logs")
      .select("*")
      .in("action", allowedActions)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .limit(50);

    setLogs(data || []);
    setLoading(false);
  }, [profile?.role, allowedActions]);

  // ── Fetch + polling ──
  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifs]);

  // ── Mark all read ──
  const markAllRead = useCallback(() => {
    const now = new Date();
    localStorage.setItem(storageKey, now.toISOString());
    setLastReadAt(now);
  }, [storageKey]);

  // ── Unread count ──
  const unreadCount = useMemo(
    () => logs.filter(l => new Date(l.created_at) > lastReadAt).length,
    [logs, lastReadAt]
  );

  // ── Formatted notifications ──
  const notifications = useMemo(() => {
    return logs.map((log) => {
      const cfg = NOTIF_CONFIG[log.action] || {};
      const isUnread = new Date(log.created_at) > lastReadAt;
      return {
        id: log.id,
        action: log.action,
        level: cfg.level || "info",
        label: cfg.label || log.action,
        entity: log.entity,
        entityId: log.entity_id,
        detail: log.detail,
        createdAt: log.created_at,
        isUnread,
        message: buildMessage(log, cfg),
      };
    });
  }, [logs, lastReadAt]);

  return { notifications, unreadCount, loading, markAllRead, refetch: fetchNotifs };
}

/* ── Build pesan human-readable ── */
function buildMessage(log, cfg) {
  const d = log.detail || {};
  const entityName = d.name || d.code || d.username || d.email || "-";

  switch (log.action) {
    case "register_user":    return `User baru "${entityName}" mendaftar`;
    case "update_user_role": return `Role "${entityName}" diubah dari ${d.from_role || "?"} ke ${d.to_role || "?"}`;
    case "deactivate_user":  return `Akun "${entityName}" dinonaktifkan`;
    case "activate_user":    return `Akun "${entityName}" diaktifkan`;
    case "delete_item":      return `Barang "${entityName}" dihapus`;
    case "delete_category":  return `Kategori "${entityName}" dihapus`;
    case "delete_location":  return `Lokasi "${entityName}" dihapus`;
    case "delete_unit":      return `Unit "${d.code || entityName}" dihapus. Alasan: ${d.reason || "-"}`;
    case "stock_out":        return `${d.unit_numbers?.length || 0} unit "${entityName}" dikurangi. Alasan: ${d.reason || "-"}`;
    case "import_csv":       return `${d.count || 0} barang di-import dari CSV`;
    case "create_item":      return `Barang baru "${entityName}" dibuat${d.units_created ? ` + ${d.units_created} unit` : ""}`;
    case "add_unit":         return `${d.qty || 0} unit baru untuk "${entityName}"`;
    case "stock_in":         return `${d.unit_numbers?.length || 0} unit "${entityName}" ditambahkan`;
    case "update_unit":      return `Unit "${d.code || entityName}" diperbarui`;
    case "update_item":      return `Barang "${entityName}" diperbarui`;
    default:                 return cfg.label || log.action;
  }
}