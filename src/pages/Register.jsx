import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  ArrowLeft, Archive, Eye, EyeOff, ShieldCheck, 
  CheckCircle2, Sun, Moon, UserPlus, Loader2, 
  Mail, Lock, User as UserIcon, AlertCircle
} from "lucide-react";
import { supabase } from "../lib/supabase";              // ← BARU
import { useAuthStore } from "../stores/authStore";
import { useThemeStore } from "../stores/themeStore";

export default function Register() {
  const { register } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.body.classList.remove("landing-body");
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPass) {
      setError("Password dan konfirmasi tidak sama.");
      return;
    }
    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }

    setLoading(true);
    try {
      // ── 1. Register via authStore ──
      // Coba DUA format agar kompatibel dengan berbagai versi authStore
      let result;
      try {
        // Format modern: { name, email, password }
        result = await register({ name: fullName, email, password });
      } catch (e1) {
        // Fallback format lama: (email, password, name)
        result = await register(email, password, fullName);
      }

      // ── 2. LOG register_user untuk notifikasi Super Admin ──
      // Ambil user ID dari result (berbagai kemungkinan bentuk)
      const userId = 
        result?.user?.id || 
        result?.user?.user?.id || 
        result?.id || 
        null;

      if (userId) {
        try {
          await supabase.from("activity_logs").insert({
            action: "register_user",
            entity: "profiles",
            entity_id: userId,
            detail: {
              name: fullName,
              email: email,
            },
            // user_id sengaja null — user belum login (email confirmation)
          });
        } catch (logErr) {
          // Jangan gagalkan register hanya karena log error
          console.warn("Gagal log register:", logErr);
        }
      }

      setSuccess(true);
    } catch (err) {
      // Terjemahkan error Supabase
      const msg = err.message || "Pendaftaran gagal.";
      if (msg.includes("already registered") || msg.includes("already been registered")) {
        setError("Email sudah terdaftar. Silakan login atau gunakan email lain.");
      } else if (msg.includes("Password should be")) {
        setError("Password minimal 6 karakter.");
      } else if (msg.includes("Invalid email")) {
        setError("Format email tidak valid.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mc-login-wrapper">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

        .mc-login-wrapper {
          --bg: #F9F8F6;
          --surface: #FFFFFF;
          --text: #1A1A2E;
          --text-muted: #6B7280;
          --navy: #16213E;
          --gold: #D4AF37;
          --gold-hover: #B5952F;
          --border: #E5E7EB;
          --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
          --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          
          font-family: 'Plus Jakarta Sans', sans-serif;
          background-color: var(--bg);
          min-height: 100vh;
          display: flex;
          color: var(--text);
          transition: background-color 0.3s ease, color 0.3s ease;
        }

        .dark .mc-login-wrapper {
          --bg: #0A0A0A;
          --surface: #171717;
          --text: #F5F5F5;
          --text-muted: #A3A3A3;
          --navy: #262626;
          --gold: #B91C1C;
          --gold-hover: #991B1B;
          --border: #262626;
        }

        .mc-login-wrapper * { box-sizing: border-box; }
        .mc-login-wrapper a { text-decoration: none; color: inherit; }

        .mc-login-left {
          flex: 1;
          background: linear-gradient(135deg, #16213E 0%, #0F172A 100%);
          display: none;
          position: relative;
          overflow: hidden;
          padding: 4rem;
          color: white;
          flex-direction: column;
          justify-content: space-between;
        }
        .dark .mc-login-left { background: linear-gradient(135deg, #171717 0%, #0A0A0A 100%); }
        .mc-login-left::before {
          content: ''; position: absolute;
          top: -20%; left: -20%; width: 150%; height: 150%;
          background: radial-gradient(circle, rgba(212,175,55,0.15) 0%, transparent 60%);
          animation: pulse-glow 6s ease-in-out infinite;
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        .mc-login-left-inner { 
          position: relative; z-index: 2; max-width: 480px; margin: 0 auto; width: 100%; height: 100%; 
          display: flex; flex-direction: column; justify-content: space-between; 
        }
        .mc-login-brand { 
          display: flex; align-items: center; gap: 0.75rem; 
          font-family: 'Playfair Display', serif; font-size: 1.5rem; font-weight: 700; color: white; 
        }
        .mc-login-brand-icon { 
          width: 44px; height: 44px; background: var(--gold); color: #16213E; 
          border-radius: 12px; display: flex; align-items: center; justify-content: center;
        }
        .dark .mc-login-brand-icon { color: white; }

        .mc-login-hero-text h2 { 
          font-family: 'Playfair Display', serif; font-size: 2.5rem; line-height: 1.2; margin-bottom: 1.5rem; 
        }
        .mc-login-hero-text p { color: #94A3B8; font-size: 1.1rem; line-height: 1.6; margin-bottom: 2rem; }
        
        .mc-login-feature-list { display: flex; flex-direction: column; gap: 1rem; }
        .mc-login-feature-item { 
          display: flex; align-items: center; gap: 0.75rem; color: #E2E8F0; font-size: 0.95rem; 
          padding: 0.75rem 1rem; background: rgba(255,255,255,0.05); border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .mc-login-feature-item svg { color: var(--gold); flex-shrink: 0; }

        .mc-login-right {
          flex: 1; display: flex; align-items: center; justify-content: center;
          padding: 2rem; background: var(--bg); position: relative;
        }
        .mc-theme-btn-absolute {
          position: absolute; top: 1.5rem; right: 1.5rem;
          width: 40px; height: 40px; border-radius: 50%;
          background: var(--surface); border: 1px solid var(--border);
          display: flex; align-items: center; justify-content: center;
          color: var(--text); cursor: pointer; transition: all 0.2s; z-index: 10;
        }
        .mc-theme-btn-absolute:hover { background: var(--gold); color: var(--surface); border-color: var(--gold); }

        .mc-login-form-container { width: 100%; max-width: 420px; }
        .mc-back-link {
          display: inline-flex; align-items: center; gap: 0.5rem;
          font-size: 0.9rem; font-weight: 600; color: var(--text-muted);
          margin-bottom: 2rem; transition: color 0.2s;
        }
        .mc-back-link:hover { color: var(--gold); }

        .mc-form-card {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 20px; padding: 2.5rem; box-shadow: var(--shadow-lg);
        }

        .mc-form-header { text-align: center; margin-bottom: 2rem; }
        .mc-form-header-icon {
          display: inline-flex; align-items: center; justify-content: center;
          width: 56px; height: 56px; border-radius: 12px;
          background: var(--bg); color: var(--gold); border: 1px solid var(--border);
          margin-bottom: 1rem;
        }
        .mc-form-title { 
          font-family: 'Playfair Display', serif; font-size: 1.75rem; 
          color: var(--text); margin-bottom: 0.5rem; 
        }
        .mc-form-subtitle { font-size: 0.95rem; color: var(--text-muted); }

        .mc-error-box {
          background: #FEF2F2; border: 1px solid #FECACA; color: #B91C1C;
          padding: 0.75rem 1rem; border-radius: 10px; font-size: 0.9rem;
          margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem;
        }
        .dark .mc-error-box { background: rgba(127,29,29,0.2); border-color: #7F1D1D; color: #FCA5A5; }

        .mc-success-box {
          background: #F0FDF4; border: 1px solid #BBF7D0; color: #15803D;
          padding: 1rem; border-radius: 10px; font-size: 0.95rem;
          text-align: center;
        }
        .dark .mc-success-box { background: rgba(20,83,45,0.3); border-color: #166534; color: #86EFAC; }

        .mc-form-group { margin-bottom: 1.25rem; }
        .mc-label { 
          display: block; font-size: 0.85rem; font-weight: 600; 
          color: var(--text); margin-bottom: 0.5rem; 
        }
        .mc-input {
          width: 100%; padding: 0.85rem 1rem; border-radius: 10px;
          border: 1px solid var(--border); background: var(--bg);
          font-family: inherit; font-size: 0.95rem; color: var(--text);
          transition: all 0.2s ease;
        }
        .mc-input:focus {
          outline: none; border-color: var(--gold); background: var(--surface);
          box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.15);
        }
        .mc-input::placeholder { color: var(--text-muted); opacity: 0.6; }

        .mc-input-wrapper { position: relative; }
        .mc-toggle-pass {
          position: absolute; right: 1rem; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; color: var(--text-muted);
        }
        .mc-toggle-pass:hover { color: var(--gold); }

        .mc-btn-submit {
          width: 100%; padding: 0.85rem; border-radius: 10px;
          background: var(--navy); color: white; font-weight: 600; font-size: 0.95rem;
          border: none; cursor: pointer; transition: all 0.2s ease;
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
          margin-top: 0.5rem;
        }
        .dark .mc-btn-submit { background: var(--gold); }
        .mc-btn-submit:hover { transform: translateY(-1px); box-shadow: var(--shadow-md); background: var(--gold); }
        .mc-btn-submit:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }

        .mc-form-footer {
          margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border);
          text-align: center; font-size: 0.85rem; color: var(--text-muted);
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
          flex-wrap: wrap;
        }
        .mc-form-footer a { color: var(--gold); font-weight: 600; }
        .mc-form-footer a:hover { text-decoration: underline; }

        @media (min-width: 900px) {
          .mc-login-left { display: flex; }
        }
      `}</style>

      {/* ==================== LEFT ==================== */}
      <div className="mc-login-left">
        <div className="mc-login-left-inner">
          <Link to="/" className="mc-login-brand">
            <div className="mc-login-brand-icon"><Archive size={24} /></div>
            Inventaris
          </Link>

          <div className="mc-login-hero-text">
            <h2>Bergabung dengan Sistem Inventaris Modern.</h2>
            <p>Daftarkan akun Anda untuk mulai mengelola aset sekolah dengan lebih efisien, aman, dan profesional.</p>
            
            <div className="mc-login-feature-list">
              <div className="mc-login-feature-item"><CheckCircle2 size={20} /> Akses Mobile-Friendly</div>
              <div className="mc-login-feature-item"><CheckCircle2 size={20} /> Scan QR Code Instan</div>
              <div className="mc-login-feature-item"><CheckCircle2 size={20} /> Multi-Level Role</div>
            </div>
          </div>

          <div style={{ fontSize: "0.85rem", color: "#64748B" }}>
            &copy; {new Date().getFullYear()} SMA Pasundan Rancaekek.
          </div>
        </div>
      </div>

      {/* ==================== RIGHT ==================== */}
      <div className="mc-login-right">
        <button className="mc-theme-btn-absolute" onClick={toggleTheme} title="Ganti Tema">
          {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        <div className="mc-login-form-container">
          <Link to="/" className="mc-back-link">
            <ArrowLeft size={16} /> Kembali ke Beranda
          </Link>

          <div className="mc-form-card">
            {success ? (
              <>
                <div className="mc-form-header">
                  <div className="mc-form-header-icon" style={{ background: "#F0FDF4", color: "#10B981", borderColor: "#BBF7D0" }}>
                    <CheckCircle2 size={28} />
                  </div>
                  <h1 className="mc-form-title">Pendaftaran Berhasil!</h1>
                  <p className="mc-form-subtitle">Akun Anda sedang menunggu persetujuan</p>
                </div>

                <div className="mc-success-box">
                  <p style={{ fontWeight: 700, marginBottom: "8px" }}>✅ Akun Berhasil Dibuat</p>
                  <p>Silakan hubungi <b>Super Admin</b> untuk mengaktifkan akun Anda. Setelah diaktifkan, Anda bisa login menggunakan email dan password yang sudah didaftarkan.</p>
                </div>

                <Link to="/login" className="mc-btn-submit" style={{ display: "flex", marginTop: "1.5rem" }}>
                  Kembali ke Login
                </Link>
              </>
            ) : (
              <>
                <div className="mc-form-header">
                  <div className="mc-form-header-icon"><UserPlus size={28} /></div>
                  <h1 className="mc-form-title">Buat Akun Baru</h1>
                  <p className="mc-form-subtitle">Isi data diri untuk mendaftar</p>
                </div>

                {error && (
                  <div className="mc-error-box">
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    {error}
                  </div>
                )}

                <form onSubmit={handleRegister}>
                  <div className="mc-form-group">
                    <label className="mc-label">Nama Lengkap</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Budi Santoso"
                      className="mc-input"
                      disabled={loading}
                      autoComplete="name"
                    />
                  </div>
                  <div className="mc-form-group">
                    <label className="mc-label">Alamat Email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nama@sekolah.sch.id"
                      className="mc-input"
                      disabled={loading}
                      autoComplete="email"
                    />
                  </div>
                  <div className="mc-form-group">
                    <label className="mc-label">Password</label>
                    <div className="mc-input-wrapper">
                      <input
                        type={showPass ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min. 6 karakter"
                        className="mc-input"
                        disabled={loading}
                        autoComplete="new-password"
                      />
                      <button type="button" onClick={() => setShowPass(v => !v)} className="mc-toggle-pass">
                        {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div className="mc-form-group">
                    <label className="mc-label">Konfirmasi Password</label>
                    <input
                      type="password"
                      required
                      value={confirmPass}
                      onChange={(e) => setConfirmPass(e.target.value)}
                      placeholder="Ulangi password"
                      className="mc-input"
                      disabled={loading}
                      autoComplete="new-password"
                    />
                  </div>
                  <button type="submit" disabled={loading} className="mc-btn-submit">
                    {loading ? (
                      <>
                        <Loader2 size={16} className="mc-spin" style={{ animation: "spin 0.8s linear infinite" }} />
                        Memproses...
                      </>
                    ) : (
                      "Daftar Sekarang"
                    )}
                  </button>
                </form>
              </>
            )}

            <div className="mc-form-footer">
              <ShieldCheck size={16} />
              Sudah punya akun? <Link to="/login">Login di sini</Link>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}