import { create } from "zustand";
import { supabase } from "../lib/supabase";

export const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  loading: true,

  init: async () => {
    set({ loading: true });
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await get().fetchProfile(session.user);
    } else {
      set({ user: null, profile: null, loading: false });
    }
    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await get().fetchProfile(session.user);
      } else {
        set({ user: null, profile: null, loading: false });
      }
    });
  },

  fetchProfile: async (authUser) => {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authUser.id)
      .single();
    if (error) {
      set({ user: authUser, profile: null, loading: false });
      return;
    }
    set({ user: authUser, profile, loading: false });
  },

  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_active")
      .eq("id", data.user.id)
      .single();

    if (profile && profile.is_active === false) {
      await supabase.auth.signOut();
      throw new Error("Akun Anda belum disetujui Super Admin. Silakan hubungi admin.");
    }
  },

  // ===========================
  // REGISTER (tanpa OTP)
  // ===========================
  register: async (email, password, fullName) => {
    // 1. Buat user di Supabase Auth
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    if (!data.user) throw new Error("Gagal membuat akun.");

    // 2. Insert profil (user sudah login sementara setelah signUp kalau email confirm disabled)
    const { error: profErr } = await supabase
      .from("profiles")
      .insert({
        id: data.user.id,
        full_name: fullName,
        role: "viewer",
        is_active: false,
      });

    if (profErr) {
      console.error("Gagal insert profil:", profErr.message);
    }

    // 3. Sign out agar user harus login manual setelah diaktifkan
    await supabase.auth.signOut();
    return data.user;
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null });
  },

  hasRole: (...roles) => {
    const role = get().profile?.role;
    return roles.includes(role);
  },
}));
