import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { 
  ArrowLeft, Archive, Eye, EyeOff, ShieldCheck, 
  CheckCircle2, Sun, Moon, Sparkles, Mail, Lock,
  ArrowRight, Loader2, AlertCircle, Fingerprint,
  Info, HelpCircle, UserPlus, KeyRound
} from "lucide-react";
import { useAuthStore } from "../stores/authStore";
import { useThemeStore } from "../stores/themeStore";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);
  const { theme, toggleTheme } = useThemeStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(null);
  const [mounted, setMounted] = useState(false);

  const successMessage = location.state?.message;

  useEffect(() => {
    document.body.classList.remove("landing-body");
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), [email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      const msg = err.message || "";
      if (msg.includes("Invalid login")) {
        setError("Email atau password salah. Silakan coba lagi.");
      } else if (msg.includes("Email not confirmed")) {
        setError("Email belum diverifikasi. Cek inbox Anda atau hubungi admin.");
      } else {
        setError(msg || "Gagal masuk. Silakan coba lagi.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`mc-login-wrapper ${mounted ? "is-mounted" : ""}`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        .mc-login-wrapper {
          --bg: #F4F2EE;
          --bg-gradient: radial-gradient(ellipse at top left, #FFFFFF 0%, #F4F2EE 50%, #EDE9E0 100%);
          --surface: #FFFFFF;
          --text: #1A1A2E;
          --text-muted: #6B7280;
          --navy: #16213E;
          --navy-deep: #0F172A;
          --gold: #C9A227;
          --gold-light: #E8C766;
          --gold-hover: #B8911F;
          --border: #E5E2D9;
          --border-focus: #C9A227;
          --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
          --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          --shadow-lg: 0 20px 40px -12px rgba(22, 33, 62, 0.18);
          --shadow-gold: 0 8px 24px -6px rgba(201, 162, 39, 0.35);
          
          font-family: 'Plus Jakarta Sans', sans-serif;
          background: var(--bg-gradient);
          min-height: 100vh;
          display: flex;
          color: var(--text);
          transition: background 0.4s ease, color 0.3s ease;
          overflow: hidden;
        }

        .dark .mc-login-wrapper {
          --bg: #0A0A0A;
          --bg-gradient: radial-gradient(ellipse at top left, #1A1A1A 0%, #0A0A0A 50%, #050505 100%);
          --surface: #171717;
          --text: #F5F5F5;
          --text-muted: #A3A3A3;
          --navy: #262626;
          --navy-deep: #171717;
          --gold: #DC2626;
          --gold-light: #EF4444;
          --gold-hover: #B91C1C;
          --border: #2A2A2A;
          --border-focus: #DC2626;
          --shadow-lg: 0 20px 40px -12px rgba(0, 0, 0, 0.6);
          --shadow-gold: 0 8px 24px -6px rgba(220, 38, 38, 0.35);
        }

        .mc-login-wrapper * { box-sizing: border-box; }
        .mc-login-wrapper a { text-decoration: none; color: inherit; }

        .mc-login-left {
          flex: 1.15;
          background: linear-gradient(150deg, #16213E 0%, #0F172A 55%, #0A0F1F 100%);
          display: none;
          position: relative;
          overflow: hidden;
          padding: 3.5rem;
          color: white;
          flex-direction: column;
          justify-content: space-between;
        }
        .dark .mc-login-left {
          background: linear-gradient(150deg, #1A1A1A 0%, #0A0A0A 55%, #000 100%);
        }
        .mc-login-left::after {
          content: '';
          position: absolute; inset: 0;
          background-image: 
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: radial-gradient(ellipse at 30% 40%, black 20%, transparent 70%);
          pointer-events: none;
        }
        .mc-login-left::before {
          content: '';
          position: absolute;
          top: -30%; left: -30%; width: 160%; height: 160%;
          background: 
            radial-gradient(circle at 30% 30%, rgba(201,162,39,0.18) 0%, transparent 45%),
            radial-gradient(circle at 70% 70%, rgba(201,162,39,0.10) 0%, transparent 50%);
          animation: aurora 12s ease-in-out infinite;
          pointer-events: none;
        }
        .dark .mc-login-left::before {
          background: 
            radial-gradient(circle at 30% 30%, rgba(220,38,38,0.22) 0%, transparent 45%),
            radial-gradient(circle at 70% 70%, rgba(220,38,38,0.12) 0%, transparent 50%);
        }
        @keyframes aurora {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.9; }
          50% { transform: translate(-4%, 4%) scale(1.08); opacity: 1; }
        }

        .mc-particle {
          position: absolute;
          width: 4px; height: 4px; border-radius: 50%;
          background: var(--gold);
          opacity: 0;
          animation: float-up linear infinite;
          box-shadow: 0 0 8px var(--gold);
        }
        @keyframes float-up {
          0% { transform: translateY(0) scale(0); opacity: 0; }
          10% { opacity: 0.6; }
          90% { opacity: 0.6; }
          100% { transform: translateY(-100vh) scale(1); opacity: 0; }
        }

        .mc-login-left-inner { 
          position: relative; z-index: 2; max-width: 500px; margin: 0 auto; width: 100%; height: 100%; 
          display: flex; flex-direction: column; justify-content: space-between; gap: 2rem;
        }
        
        .mc-login-brand { 
          display: flex; align-items: center; gap: 0.85rem; 
          font-family: 'Playfair Display', serif; font-size: 1.6rem; font-weight: 700; color: white;
          animation: fade-slide 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .mc-login-brand-icon { 
          width: 48px; height: 48px; 
          background: linear-gradient(135deg, var(--gold-light) 0%, var(--gold) 100%);
          color: #16213E; 
          border-radius: 14px; display: flex; align-items: center; justify-content: center;
          box-shadow: 0 8px 24px rgba(201,162,39,0.4), inset 0 1px 0 rgba(255,255,255,0.3);
          transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .mc-login-brand:hover .mc-login-brand-icon { transform: rotate(-8deg) scale(1.05); }
        .dark .mc-login-brand-icon { color: white; }

        .mc-login-hero-text { margin: auto 0; }
        .mc-login-hero-text h2 { 
          font-family: 'Playfair Display', serif; font-size: 2.6rem; line-height: 1.18; 
          margin-bottom: 1.25rem; letter-spacing: -0.02em;
          animation: fade-slide 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both;
        }
        .mc-login-hero-text h2 em {
          font-style: italic;
          background: linear-gradient(120deg, var(--gold-light), var(--gold));
          -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
        }
        .mc-login-hero-text p { 
          color: #94A3B8; font-size: 1.05rem; line-height: 1.7; margin-bottom: 2rem;
          animation: fade-slide 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.25s both;
        }
        
        .mc-login-feature-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .mc-login-feature-item { 
          display: flex; align-items: center; gap: 0.85rem; color: #E2E8F0; font-size: 0.95rem; font-weight: 500;
          padding: 0.85rem 1.1rem; 
          background: rgba(255,255,255,0.04); 
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.08);
          backdrop-filter: blur(8px);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          animation: fade-slide 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .mc-login-feature-item:nth-child(1) { animation-delay: 0.35s; }
        .mc-login-feature-item:nth-child(2) { animation-delay: 0.45s; }
        .mc-login-feature-item:nth-child(3) { animation-delay: 0.55s; }
        .mc-login-feature-item:hover { 
          background: rgba(255,255,255,0.08); 
          transform: translateX(6px); 
          border-color: rgba(201,162,39,0.4);
        }
        .mc-login-feature-item svg { color: var(--gold-light); flex-shrink: 0; }

        .mc-login-left-footer { 
          font-size: 0.82rem; color: #64748B; 
          display: flex; align-items: center; gap: 0.5rem;
          animation: fade-slide 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.65s both;
        }

        @keyframes fade-slide {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .mc-login-right {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          position: relative;
        }
        .mc-theme-btn-absolute {
          position: absolute; top: 1.5rem; right: 1.5rem;
          width: 42px; height: 42px; border-radius: 50%;
          background: var(--surface); border: 1px solid var(--border);
          display: flex; align-items: center; justify-content: center;
          color: var(--text); cursor: pointer; 
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          z-index: 10;
          box-shadow: var(--shadow-sm);
        }
        .mc-theme-btn-absolute:hover { 
          background: var(--gold); color: var(--surface); border-color: var(--gold);
          transform: rotate(20deg) scale(1.08);
          box-shadow: var(--shadow-gold);
        }

        .mc-login-form-container { 
          width: 100%; max-width: 440px;
          animation: form-enter 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both;
        }
        @keyframes form-enter {
          from { opacity: 0; transform: translateY(24px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .mc-back-link {
          display: inline-flex; align-items: center; gap: 0.5rem;
          font-size: 0.88rem; font-weight: 600; color: var(--text-muted);
          margin-bottom: 1.75rem; transition: all 0.2s;
        }
        .mc-back-link:hover { color: var(--gold); gap: 0.75rem; }

        .mc-form-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 24px;
          padding: 2.75rem 2.5rem;
          box-shadow: var(--shadow-lg);
          position: relative;
          transition: all 0.3s ease;
        }
        .mc-form-card::before {
          content: '';
          position: absolute; top: 0; left: 50%; transform: translateX(-50%);
          width: 60%; height: 3px;
          background: linear-gradient(90deg, transparent, var(--gold), transparent);
          border-radius: 0 0 4px 4px;
          opacity: 0.8;
        }

        .mc-form-header { text-align: center; margin-bottom: 2rem; }
        .mc-form-header-icon {
          display: inline-flex; align-items: center; justify-content: center;
          width: 64px; height: 64px; border-radius: 18px;
          background: linear-gradient(135deg, var(--bg) 0%, var(--surface) 100%);
          color: var(--gold); border: 1px solid var(--border);
          margin-bottom: 1.1rem;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.6), var(--shadow-sm);
          position: relative;
        }
        .mc-form-header-icon::after {
          content: '';
          position: absolute; inset: -4px;
          border-radius: 22px;
          border: 1px dashed var(--gold);
          opacity: 0.3;
          animation: spin-slow 20s linear infinite;
        }
        @keyframes spin-slow { to { transform: rotate(360deg); } }
        .mc-form-title { 
          font-family: 'Playfair Display', serif; font-size: 1.9rem; 
          color: var(--text); margin-bottom: 0.4rem; letter-spacing: -0.02em;
        }
        .mc-form-subtitle { font-size: 0.92rem; color: var(--text-muted); }

        .mc-success-box {
          background: #F0FDF4; border: 1px solid #BBF7D0; color: #15803D;
          padding: 0.85rem 1rem; border-radius: 12px; font-size: 0.88rem; font-weight: 500;
          margin-bottom: 1.5rem; display: flex; align-items: flex-start; gap: 0.6rem;
          animation: fade-slide 0.4s ease;
        }
        .dark .mc-success-box { background: rgba(22,101,52,0.2); border-color: #166534; color: #86EFAC; }

        .mc-error-box {
          background: #FEF2F2; border: 1px solid #FECACA; color: #B91C1C;
          padding: 0.85rem 1rem; border-radius: 12px; font-size: 0.88rem; font-weight: 500;
          margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.6rem;
          animation: shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97);
        }
        .dark .mc-error-box { background: rgba(127,29,29,0.2); border-color: #7F1D1D; color: #FCA5A5; }
        @keyframes shake {
          10%, 90% { transform: translateX(-1px); }
          20%, 80% { transform: translateX(2px); }
          30%, 50%, 70% { transform: translateX(-4px); }
          40%, 60% { transform: translateX(4px); }
        }

        .mc-form-group { margin-bottom: 1.25rem; position: relative; }
        .mc-label-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 0.5rem;
        }
        .mc-label { 
          display: block; font-size: 0.82rem; font-weight: 700; 
          color: var(--text);
          letter-spacing: 0.02em; text-transform: uppercase;
        }
        .mc-forgot-link {
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--gold);
          transition: opacity 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 0.2rem;
        }
        .mc-forgot-link:hover { opacity: 0.7; }

        .mc-input-wrapper { position: relative; }
        .mc-input-icon {
          position: absolute; left: 1rem; top: 50%; transform: translateY(-50%);
          color: var(--text-muted); pointer-events: none;
          transition: color 0.2s;
        }
        .mc-input-wrapper.is-focused .mc-input-icon { color: var(--gold); }
        .mc-input {
          width: 100%; padding: 0.9rem 1rem 0.9rem 2.9rem; border-radius: 12px;
          border: 1.5px solid var(--border); background: var(--bg);
          font-family: inherit; font-size: 0.95rem; color: var(--text);
          transition: all 0.25s ease;
        }
        .mc-input.has-toggle { padding-right: 2.9rem; }
        .mc-input:focus {
          outline: none; border-color: var(--border-focus); background: var(--surface);
          box-shadow: 0 0 0 4px rgba(201, 162, 39, 0.12);
          transform: translateY(-1px);
        }
        .dark .mc-input:focus { box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.15); }
        .mc-input::placeholder { color: var(--text-muted); opacity: 0.55; }

        .mc-input-valid {
          position: absolute; right: 1rem; top: 50%; transform: translateY(-50%);
          color: #16A34A;
        }
        .mc-toggle-pass {
          position: absolute; right: 0.9rem; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; color: var(--text-muted);
          display: flex; align-items: center; justify-content: center;
          padding: 0.35rem; border-radius: 6px;
          transition: all 0.2s;
        }
        .mc-toggle-pass:hover { color: var(--gold); background: var(--bg); }

        .mc-btn-submit {
          width: 100%; padding: 0.95rem; border-radius: 12px;
          background: linear-gradient(135deg, var(--navy) 0%, var(--navy-deep) 100%);
          color: white; font-weight: 700; font-size: 0.95rem; letter-spacing: 0.02em;
          border: none; cursor: pointer; 
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
          margin-top: 0.5rem; position: relative; overflow: hidden;
          box-shadow: 0 4px 12px -2px rgba(22, 33, 62, 0.3);
        }
        .mc-btn-submit::before {
          content: '';
          position: absolute; top: 0; left: -100%;
          width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transition: left 0.6s ease;
        }
        .mc-btn-submit:hover::before { left: 100%; }
        .mc-btn-submit:hover { 
          transform: translateY(-2px); 
          box-shadow: 0 12px 24px -6px rgba(22, 33, 62, 0.4);
          background: linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%);
        }
        .dark .mc-btn-submit { background: linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%); }
        .dark .mc-btn-submit:hover { box-shadow: 0 12px 24px -6px rgba(220, 38, 38, 0.4); }
        .mc-btn-submit:disabled { opacity: 0.75; cursor: not-allowed; transform: none; }

        .mc-btn-submit .arrow { transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .mc-btn-submit:hover .arrow { transform: translateX(4px); }

        .mc-spinner { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .mc-divider {
          display: flex; align-items: center; gap: 0.75rem;
          margin: 1.5rem 0 1rem;
          color: var(--text-muted); font-size: 0.78rem; letter-spacing: 0.05em;
          text-transform: uppercase; font-weight: 600;
        }
        .mc-divider::before, .mc-divider::after {
          content: ''; flex: 1; height: 1px; background: var(--border);
        }

        .mc-register-row {
          text-align: center; font-size: 0.88rem; color: var(--text-muted);
          display: flex; align-items: center; justify-content: center; gap: 0.4rem;
          flex-wrap: wrap;
        }
        .mc-register-link {
          color: var(--gold); font-weight: 700;
          display: inline-flex; align-items: center; gap: 0.25rem;
          padding: 0.25rem 0.5rem; border-radius: 6px;
          transition: all 0.2s;
          position: relative;
        }
        .mc-register-link::after {
          content: ''; position: absolute; bottom: 2px; left: 50%; transform: translateX(-50%);
          width: 0; height: 2px; background: var(--gold);
          transition: width 0.3s ease;
        }
        .mc-register-link:hover { background: rgba(201,162,39,0.08); }
        .mc-register-link:hover::after { width: calc(100% - 1rem); }
        .mc-register-link svg { transition: transform 0.3s; }
        .mc-register-link:hover svg { transform: translateX(2px); }

        .mc-form-footer {
          margin-top: 1.25rem; padding-top: 1.25rem; border-top: 1px solid var(--border);
          text-align: center; font-size: 0.82rem; color: var(--text-muted);
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
        }
        .mc-form-footer svg { color: var(--gold); opacity: 0.7; }

        @media (min-width: 900px) { .mc-login-left { display: flex; } }
        @media (max-width: 480px) {
          .mc-form-card { padding: 2rem 1.5rem; border-radius: 20px; }
          .mc-login-right { padding: 1rem; }
        }
      `}</style>

      {/* ==================== LEFT ==================== */}
      <div className="mc-login-left">
        {[...Array(12)].map((_, i) => (
          <span key={i} className="mc-particle" style={{
            left: `${Math.random() * 100}%`,
            bottom: `${Math.random() * 30}%`,
            animationDuration: `${8 + Math.random() * 10}s`,
            animationDelay: `${Math.random() * 8}s`,
          }} />
        ))}

        <div className="mc-login-left-inner">
          <Link to="/" className="mc-login-brand">
            <div className="mc-login-brand-icon">
              <Archive size={26} strokeWidth={2.5} />
            </div>
            Inventaris
          </Link>

          <div className="mc-login-hero-text">
            <h2>Kelola Aset Sekolah dengan <em>Presisi & Aman</em>.</h2>
            <p>
              Sistem inventaris resmi SMA Pasundan Rancaekek untuk pencatatan, 
              pemantauan, dan pelaporan sarana prasarana secara terpadu.
            </p>
            <div className="mc-login-feature-list">
              <div className="mc-login-feature-item"><CheckCircle2 size={20} /> Pencatatan Barang & Unit Fisik</div>
              <div className="mc-login-feature-item"><CheckCircle2 size={20} /> Scan QR Code & Riwayat Kondisi</div>
              <div className="mc-login-feature-item"><CheckCircle2 size={20} /> Laporan Lengkap & Multi-Level Role</div>
            </div>
          </div>

          <div className="mc-login-left-footer">
            <ShieldCheck size={14} />
            &copy; {new Date().getFullYear()} SMA Pasundan Rancaekek. All rights reserved.
          </div>
        </div>
      </div>

      {/* ==================== RIGHT ==================== */}
      <div className="mc-login-right">
        <button className="mc-theme-btn-absolute" onClick={toggleTheme} title="Ganti Tema">
          {theme === "light" ? <Moon size={19} /> : <Sun size={19} />}
        </button>

        <div className="mc-login-form-container">
          <Link to="/" className="mc-back-link">
            <ArrowLeft size={16} /> Kembali ke Beranda
          </Link>

          <div className="mc-form-card">
            <div className="mc-form-header">
              <div className="mc-form-header-icon">
                <Sparkles size={30} />
              </div>
              <h1 className="mc-form-title">Selamat Datang</h1>
              <p className="mc-form-subtitle">Masuk untuk mengelola inventaris sekolah</p>
            </div>

            {successMessage && (
              <div className="mc-success-box">
                <Info size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                {successMessage}
              </div>
            )}

            {error && (
              <div className="mc-error-box">
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mc-form-group">
                <label className="mc-label" style={{ marginBottom: "0.5rem" }}>Alamat Email</label>
                <div className={`mc-input-wrapper ${focused === "email" ? "is-focused" : ""}`}>
                  <Mail size={18} className="mc-input-icon" />
                  <input
                    type="email" required value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocused("email")}
                    onBlur={() => setFocused(null)}
                    placeholder="nama@sekolah.sch.id"
                    className="mc-input"
                    autoComplete="email"
                  />
                  {emailValid && <CheckCircle2 size={18} className="mc-input-valid" />}
                </div>
              </div>

              <div className="mc-form-group">
                <div className="mc-label-row">
                  <label className="mc-label">Password</label>
                  <Link to="/forgot-password" className="mc-forgot-link">
                    <KeyRound size={11} /> Lupa password?
                  </Link>
                </div>
                <div className={`mc-input-wrapper ${focused === "password" ? "is-focused" : ""}`}>
                  <Lock size={18} className="mc-input-icon" />
                  <input
                    type={showPass ? "text" : "password"} required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocused("password")}
                    onBlur={() => setFocused(null)}
                    placeholder="••••••••"
                    className="mc-input has-toggle"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="mc-toggle-pass"
                    aria-label="Toggle password"
                  >
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="mc-btn-submit">
                {loading ? (
                  <><Loader2 size={18} className="mc-spinner" /> Memproses...</>
                ) : (
                  <>Masuk ke Dashboard <ArrowRight size={18} className="arrow" /></>
                )}
              </button>
            </form>

            <div className="mc-divider">belum punya akun?</div>

            <div className="mc-register-row">
              Hubungi Admin Inventaris atau
              <Link to="/register" className="mc-register-link">
                <UserPlus size={13} /> Daftar
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="mc-form-footer">
              <Fingerprint size={14} />
              Dengan masuk, Anda menyetujui kebijakan sekolah.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}