import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, Archive, MapPin, History, Barcode, TrendingUp, Shield, LogIn,
  UserPlus, CheckCircle2, Sun, Moon, Users, ScanLine, Package, ChevronDown,
  Quote, Sparkles, Zap, PlayCircle, Armchair, Projector, Laptop, Monitor,
  Boxes, Printer, Wrench, FlaskConical, Presentation, Fan, Speaker, Library,
  ClipboardCheck, ArrowUpRight, Phone, Mail, MapPin as MapPinIcon, Star
} from "lucide-react";
import { useThemeStore } from "../stores/themeStore";

/* ═════════════ DATA ═════════════ */
const TYPE_WORDS = ["Aset", "Meja", "Kursi", "Proyektor", "Laptop", "Lemari", "Papan Tulis"];

const CATEGORIES = [
  { icon: Armchair, label: "Meja & Kursi" },
  { icon: Projector, label: "Proyektor" },
  { icon: Laptop, label: "Laptop" },
  { icon: Monitor, label: "Komputer" },
  { icon: Presentation, label: "Papan Tulis" },
  { icon: Printer, label: "Printer" },
  { icon: FlaskConical, label: "Alat Lab" },
  { icon: Library, label: "Buku & Rak" },
  { icon: Fan, label: "Kipas & AC" },
  { icon: Speaker, label: "Sound System" },
  { icon: Wrench, label: "Peralatan" },
  { icon: Boxes, label: "Lemari Arsip" },
];

const ACTIVITIES = [
  "Meja Guru dipindah ke Ruang TU",
  "Proyektor Epson — kondisi Baik",
  "QR Kursi #0412 berhasil dipindai",
  "Laptop Lab 07 diperbarui",
  "Papan Tulis Kelas 9 — perlu perawatan",
  "12 label QR dicetak",
  "Lemari Arsip ditambahkan ke Gudang",
  "Stok opname Perpustakaan selesai",
  "Printer UKS — kondisi Baik",
  "AC Ruang Kepsek diservis",
];

const ROOMS = [
  ...Array.from({ length: 18 }, (_, i) => `Kelas ${i + 1}`),
  "Lab IPA", "Lab Komputer", "Lab Bahasa", "Perpustakaan", "Ruang Guru", "Ruang TU",
  "Ruang Kepsek", "UKS", "Aula", "Mushola", "Kantin", "Gudang", "Ruang OSIS",
  "Ruang BK", "Lab Fisika", "Ruang Seni", "Ruang Musik",
].map((name, i) => ({
  name,
  items: ((i * 37) % 23) + 4,
  cond: i % 7 === 3 ? "Perlu perawatan" : i % 11 === 5 ? "Rusak ringan" : "Baik",
}));

const FEATURES = [
  { icon: Archive, title: "Pencatatan Aset", desc: "Input data barang lengkap dengan spesifikasi, kategori, dan nomor unit fisik yang unik." },
  { icon: MapPin, title: "Pelacakan Lokasi", desc: "Ketahui posisi barang secara presisi. Pindahkan aset antar ruangan dengan mudah." },
  { icon: Barcode, title: "Label QR Code", desc: "Cetak label QR untuk setiap unit. Cukup scan untuk melihat detail dan riwayat barang." },
  { icon: History, title: "Riwayat Perubahan", desc: "Setiap perubahan kondisi dan status unit tercatat otomatis dalam log audit yang rapi." },
  { icon: TrendingUp, title: "Laporan Real-time", desc: "Pantau statistik kondisi barang melalui dashboard interaktif yang siap dianalisis." },
  { icon: Shield, title: "Keamanan Berlapis", desc: "Hak akses pengguna dikelola dengan ketat. Setiap role memiliki batasan yang jelas." },
];

const STEPS = [
  { icon: ClipboardCheck, title: "Input Data Barang", desc: "Admin memasukkan data barang lengkap dengan unit fisik, kategori, dan lokasi." },
  { icon: ScanLine, title: "Scan QR Code", desc: "Cetak label QR per unit. Scan menggunakan kamera HP untuk melihat detail secara instan." },
  { icon: TrendingUp, title: "Pantau & Laporan", desc: "Pantau kondisi aset, lacak perubahan, dan hasilkan laporan otomatis kapan saja." },
];

const FAQS = [
  { q: "Apakah sistem ini bisa dipakai di HP?", a: "Tentu. Aplikasi ini responsif dan bisa diakses lewat browser HP. Fitur scan QR juga bisa langsung menggunakan kamera belakang HP." },
  { q: "Bagaimana cara mencetak label QR per unit?", a: "Buka detail barang → klik 'Cetak QR' → pilih unit yang mau dicetak. Sistem akan generate 1 halaman A4 berisi 12 label QR siap tempel." },
  { q: "Berapa banyak pengguna yang bisa dibuat?", a: "Tidak ada batasan. Anda bisa membuat user sebanyak yang dibutuhkan dengan 3 level akses: Super Admin, Admin, dan Viewer." },
  { q: "Apakah data saya aman?", a: "Ya. Data disimpan di Supabase (PostgreSQL) yang terenkripsi dan dilindungi dengan Row Level Security (RLS). Setiap user hanya bisa mengakses data sesuai perannya." },
  { q: "Apakah ada laporan untuk kepala sekolah?", a: "Ya. Ada halaman Laporan yang bisa diakses oleh Kepala Sekolah (viewer) dengan tampilan formal dan bisa dicetak resmi dengan kop surat & tanda tangan." },
  { q: "Bagaimana cara mendapatkan akses?", a: "Hubungi Admin Inventaris sekolah melalui email atau WhatsApp. Akun akan dibuatkan dengan role yang sesuai kebutuhan Anda." },
];

/* ═════════════ HOOKS ═════════════ */
function useReveal(threshold = 0.12) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); io.disconnect(); }
    }, { threshold });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, visible];
}

function useCounter(target, duration = 2000, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let raf;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min((now - t0) / duration, 1);
      setValue(Math.round((1 - Math.pow(1 - p, 4)) * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, start]);
  return value;
}

function useTypewriter(words, speed = 90, pause = 1400) {
  const [text, setText] = useState("");
  const [wi, setWi] = useState(0);
  const [del, setDel] = useState(false);
  useEffect(() => {
    const word = words[wi];
    let t;
    if (!del && text === word) t = setTimeout(() => setDel(true), pause);
    else if (del && text === "") { setDel(false); setWi((wi + 1) % words.length); }
    else t = setTimeout(() => setText(word.slice(0, text.length + (del ? -1 : 1))), del ? speed / 2 : speed);
    return () => clearTimeout(t);
  }, [text, del, wi, words, speed, pause]);
  return text;
}

/* ═════════════ SMALL COMPONENTS ═════════════ */
function Reveal({ children, delay = 0, className = "", style = {}, as: Tag = "div" }) {
  const [ref, visible] = useReveal();
  return (
    <Tag ref={ref} className={`mc-reveal ${visible ? "is-visible" : ""} ${className}`}
      style={{ transitionDelay: `${delay}s`, ...style }}>
      {children}
    </Tag>
  );
}

function StatCounter({ value, suffix = "", label, icon: Icon, delay = 0 }) {
  const [ref, visible] = useReveal(0.3);
  const count = useCounter(value, 2200, visible);
  return (
    <div ref={ref} className={`mc-stat-big ${visible ? "is-visible" : ""}`} style={{ transitionDelay: `${delay}s` }}>
      <div className="mc-stat-big-icon"><Icon size={26} /></div>
      <h3 className="mc-stat-big-value">{count.toLocaleString("id-ID")}{suffix}</h3>
      <p>{label}</p>
    </div>
  );
}

function QRArt({ size = 21, seed = 7 }) {
  const cells = useMemo(() => {
    let s = seed;
    const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    const out = [];
    const finder = (x, y) =>
      (x < 7 && y < 7) || (x >= size - 7 && y < 7) || (x < 7 && y >= size - 7);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        if (finder(x, y)) continue;
        if (rnd() > 0.52) out.push([x, y]);
      }
    return out;
  }, [size, seed]);
  const Finder = ({ x, y }) => (
    <g transform={`translate(${x},${y})`}>
      <rect width="7" height="7" fill="currentColor" />
      <rect x="1" y="1" width="5" height="5" fill="var(--surface)" />
      <rect x="2" y="2" width="3" height="3" fill="currentColor" />
    </g>
  );
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mc-qr" shapeRendering="crispEdges">
      <Finder x={0} y={0} /><Finder x={size - 7} y={0} /><Finder x={0} y={size - 7} />
      {cells.map(([x, y], i) => (
        <rect key={i} x={x} y={y} width="1" height="1" fill="currentColor"
          className="mc-qr-cell" style={{ animationDelay: `${(i % 40) * 0.05}s` }} />
      ))}
    </svg>
  );
}

function FeatureCard({ f, i }) {
  const ref = useRef(null);
  const [rv, visible] = useReveal();
  const onMove = (e) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    el.style.setProperty("--mx", `${x}px`);
    el.style.setProperty("--my", `${y}px`);
    el.style.setProperty("--ry", `${((x / r.width) - 0.5) * 10}deg`);
    el.style.setProperty("--rx", `${-((y / r.height) - 0.5) * 10}deg`);
  };
  const onLeave = () => {
    const el = ref.current; if (!el) return;
    el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg");
  };
  return (
    <div ref={(n) => { ref.current = n; rv.current = n; }}
      className={`mc-feature-card ${visible ? "is-visible" : ""}`}
      style={{ transitionDelay: `${(i % 3) * 0.12}s` }}
      onMouseMove={onMove} onMouseLeave={onLeave}>
      <span className="mc-feature-num">0{i + 1}</span>
      <div className="mc-feature-icon"><f.icon size={28} /></div>
      <h3 className="mc-feature-title">{f.title}</h3>
      <p className="mc-feature-desc">{f.desc}</p>
      <span className="mc-feature-link">Selengkapnya <ArrowUpRight size={16} /></span>
    </div>
  );
}

/* ═════════════ MAIN ═════════════ */
export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [activeRoom, setActiveRoom] = useState(0);
  const [roomLocked, setRoomLocked] = useState(false);
  const { theme, toggleTheme } = useThemeStore();
  const typed = useTypewriter(TYPE_WORDS);

  const rootRef = useRef(null);
  const progressRef = useRef(null);
  const glowRef = useRef(null);
  const mockRef = useRef(null);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const total = document.documentElement.scrollHeight - window.innerHeight;
        if (progressRef.current) progressRef.current.style.width = `${total > 0 ? (y / total) * 100 : 0}%`;
        if (rootRef.current) rootRef.current.style.setProperty("--sy", y);
        setScrolled(y > 40);
        ticking = false;
      });
    };
    const onMouse = (e) => {
      if (glowRef.current) glowRef.current.style.transform = `translate(${e.clientX - 250}px, ${e.clientY - 250}px)`;
      if (rootRef.current) {
        rootRef.current.style.setProperty("--px", ((e.clientX / window.innerWidth) - 0.5).toFixed(3));
        rootRef.current.style.setProperty("--py", ((e.clientY / window.innerHeight) - 0.5).toFixed(3));
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("mousemove", onMouse, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", onMouse);
    };
  }, []);

  useEffect(() => {
    if (roomLocked) return;
    const t = setInterval(() => setActiveRoom((r) => (r + 1) % ROOMS.length), 1600);
    return () => clearInterval(t);
  }, [roomLocked]);

  const onMockMove = useCallback((e) => {
    const el = mockRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--ry", `${((e.clientX - r.left) / r.width - 0.5) * 14}deg`);
    el.style.setProperty("--rx", `${-((e.clientY - r.top) / r.height - 0.5) * 14}deg`);
  }, []);
  const onMockLeave = useCallback(() => {
    const el = mockRef.current; if (!el) return;
    el.style.setProperty("--ry", "-8deg"); el.style.setProperty("--rx", "4deg");
  }, []);

  const floaters = useMemo(() => {
    const icons = [Package, Boxes, Armchair, Laptop, Projector, Barcode, Archive, ScanLine, Monitor, Printer, Library, Wrench];
    return Array.from({ length: 18 }, (_, i) => ({
      Icon: icons[i % icons.length],
      left: `${(i * 53) % 100}%`,
      top: `${(i * 37 + 11) % 100}%`,
      size: 22 + ((i * 7) % 26),
      dur: 9 + ((i * 3) % 9),
      delay: -((i * 1.7) % 10),
      depth: 0.3 + ((i % 5) * 0.25),
    }));
  }, []);

  const [heroRef] = useReveal();
  const room = ROOMS[activeRoom];

  return (
    <div className="mc-landing" ref={rootRef}>
      <style>{CSS}</style>

      <div className="mc-scroll-progress" ref={progressRef} />
      <div className="mc-cursor-glow" ref={glowRef} />

      {/* ═══ NAVBAR ═══ */}
      <nav className={`mc-navbar ${scrolled ? "scrolled" : ""}`}>
        <div className="mc-nav-inner">
          <Link to="/" className="mc-brand">
            <div className="mc-brand-icon"><Archive size={22} /></div>
            Inventaris
          </Link>
          <div className="mc-nav-links">
            <a href="#fitur">Fitur</a>
            <a href="#cara-kerja">Cara Kerja</a>
            <a href="#ruang">Peta Ruang</a>
            <a href="#testimoni">Testimoni</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="mc-nav-actions">
            <button className="mc-theme-btn" onClick={toggleTheme} title="Ganti Tema">
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <Link to="/login" className="mc-btn mc-btn-primary">Masuk <ArrowRight size={16} /></Link>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <header className="mc-hero" ref={heroRef}>
        <div className="mc-hero-bg" aria-hidden="true">
          <div className="mc-hero-grid" />
          <div className="mc-orb o1" /><div className="mc-orb o2" /><div className="mc-orb o3" />
          {floaters.map((f, i) => (
            <span key={i} className="mc-floater"
              style={{
                left: f.left, top: f.top, animationDuration: `${f.dur}s`, animationDelay: `${f.delay}s`,
                "--depth": f.depth,
              }}>
              <f.Icon size={f.size} />
            </span>
          ))}
        </div>

        <div className="mc-hero-copy">
          <span className="mc-hero-label"><Sparkles size={14} /> Sistem Inventaris Sekolah Modern</span>
          <h1 className="mc-hero-title">
            Kelola <span className="mc-typed">{typed}<i className="mc-caret" /></span><br />
            dengan <em>Standar Klasik</em><br />
            dan Akurasi Modern.
          </h1>
          <p className="mc-hero-desc">
            Solusi terpadu untuk mendata, melacak, dan merawat sarana prasarana sekolah.
            Dibangun dengan antarmuka yang elegan, aman, dan mudah digunakan.
          </p>
          <div className="mc-hero-actions">
            <Link to="/login" className="mc-btn mc-btn-gold mc-btn-lg"><Zap size={18} /> Mulai Kelola <ArrowRight size={18} /></Link>
            <a href="#fitur" className="mc-btn mc-btn-outline mc-btn-lg"><PlayCircle size={18} /> Pelajari Fitur</a>
          </div>
          <div className="mc-stats">
            <div className="mc-stat-item"><h4>500+</h4><p>Total Aset</p></div>
            <div className="mc-stat-item"><h4>35</h4><p>Ruang</p></div>
            <div className="mc-stat-item"><h4>100%</h4><p>Terdata</p></div>
          </div>
        </div>

        <div className="mc-hero-visual" onMouseMove={onMockMove} onMouseLeave={onMockLeave}>
          <div className="mc-dashboard-mockup" ref={mockRef}>
            <div className="mc-mockup-header">
              <div className="mc-mockup-dots"><span /><span /><span /></div>
              <div className="mc-mockup-title"><span className="mc-live-dot" /> Scan Station · Live</div>
            </div>

            <div className="mc-scan-area">
              <div className="mc-scan-frame">
                <i className="c tl" /><i className="c tr" /><i className="c bl" /><i className="c br" />
                <QRArt seed={11} />
                <div className="mc-laser" />
              </div>

              <div className="mc-scan-result">
                <div className="mc-scan-ok"><CheckCircle2 size={16} /> Terbaca</div>
                <h5>Meja Siswa #0412</h5>
                <div className="mc-scan-row"><span>Lokasi</span><b>Kelas 9</b></div>
                <div className="mc-scan-row"><span>Kondisi</span><b className="good">Baik</b></div>
                <div className="mc-scan-row"><span>Update</span><b>2 menit lalu</b></div>
              </div>
            </div>

            <div className="mc-mockup-grid">
              <div className="mc-mockup-card"><div className="title">Total Barang</div><div className="value">1.234</div></div>
              <div className="mc-mockup-card"><div className="title">Kondisi Baik</div><div className="value" style={{ color: "#10B981" }}>89%</div></div>
              <div className="mc-mockup-card"><div className="title">Ruangan</div><div className="value">35</div></div>
            </div>

            <div className="mc-bars">
              {[48, 72, 55, 90, 64, 80, 70, 95, 60, 84, 76, 88].map((h, i) => (
                <span key={i} style={{ "--h": `${h}%`, animationDelay: `${i * 0.12}s` }} />
              ))}
            </div>
          </div>

          <div className="mc-floating-badge b1">
            <div className="mc-floating-icon green"><CheckCircle2 size={20} /></div>
            <div><div className="bt">Terverifikasi</div><div className="bs">Data Akurat</div></div>
          </div>
          <div className="mc-floating-badge b2">
            <div className="mc-floating-icon blue"><Shield size={20} /></div>
            <div><div className="bt">Aman</div><div className="bs">Role-Based Access</div></div>
          </div>
          <div className="mc-floating-badge b3">
            <div className="mc-floating-icon gold"><Package size={20} /></div>
            <div><div className="bt">+12 Unit</div><div className="bs">Baru ditambahkan</div></div>
          </div>
        </div>
      </header>

      {/* ═══ CONVEYOR / MARQUEE ═══ */}
      <section className="mc-conveyor" aria-hidden="true">
        <div className="mc-conveyor-beam" />
        <div className="mc-marquee">
          <div className="mc-marquee-track">
            {[...CATEGORIES, ...CATEGORIES, ...CATEGORIES].map((c, i) => (
              <div key={i} className="mc-chip"><c.icon size={20} /> {c.label}</div>
            ))}
          </div>
        </div>
        <div className="mc-marquee reverse">
          <div className="mc-marquee-track">
            {[...ACTIVITIES, ...ACTIVITIES, ...ACTIVITIES].map((a, i) => (
              <div key={i} className="mc-chip soft"><span className="mc-live-dot" /> {a}</div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ STATS BAR ═══ */}
      <section className="mc-stats-wrap">
        <div className="mc-stats-bar">
          <StatCounter value={1234} suffix="+" label="Total Aset" icon={Package} />
          <StatCounter value={35} label="Ruangan" icon={MapPin} delay={0.1} />
          <StatCounter value={50} suffix="+" label="Pengguna" icon={Users} delay={0.2} />
          <StatCounter value={5000} suffix="+" label="Scan QR" icon={ScanLine} delay={0.3} />
        </div>
      </section>

      {/* ═══ FITUR ═══ */}
      <section className="mc-section" id="fitur">
        <div className="mc-section-inner">
          <Reveal className="mc-section-head">
            <span className="mc-label">Fitur Utama</span>
            <h2 className="mc-title">Dirancang untuk Kemudahan Pengelolaan</h2>
            <p className="mc-desc">Dari inventarisasi awal hingga pelaporan, semuanya terintegrasi dalam satu sistem yang rapi.</p>
          </Reveal>
          <div className="mc-features-grid">
            {FEATURES.map((f, i) => <FeatureCard key={i} f={f} i={i} />)}
          </div>
        </div>
      </section>

      {/* ═══ CARA KERJA ═══ */}
      <section className="mc-section mc-section-alt" id="cara-kerja">
        <div className="mc-section-inner">
          <Reveal className="mc-section-head">
            <span className="mc-label">Cara Kerja</span>
            <h2 className="mc-title">Tiga Langkah Mudah</h2>
            <p className="mc-desc">Mulai dari pendaftaran barang hingga pelaporan, semuanya bisa dilakukan dalam hitungan menit.</p>
          </Reveal>
          <div className="mc-steps">
            <div className="mc-steps-line"><span /></div>
            {STEPS.map((s, i) => (
              <Reveal key={i} className="mc-step" delay={i * 0.18}>
                <div className="mc-step-number">{i + 1}</div>
                <div className="mc-step-card">
                  <div className="mc-step-icon"><s.icon size={26} /></div>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                  <div className="mc-step-box"><Package size={18} /></div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PETA RUANG ═══ */}
      <section className="mc-section" id="ruang">
        <div className="mc-section-inner">
          <Reveal className="mc-section-head">
            <span className="mc-label">Peta Ruang</span>
            <h2 className="mc-title">Setiap Ruang, Setiap Unit, Terpantau</h2>
            <p className="mc-desc">Arahkan kursor ke ruangan untuk melihat jumlah barang dan kondisinya secara langsung.</p>
          </Reveal>

          <div className="mc-rooms">
            <Reveal className="mc-rooms-grid">
              <div className="mc-rooms-tiles" onMouseLeave={() => setRoomLocked(false)}>
                {ROOMS.map((r, i) => (
                  <button
                    key={r.name}
                    className={`mc-room ${i === activeRoom ? "active" : ""} ${r.cond === "Baik" ? "ok" : r.cond === "Rusak ringan" ? "bad" : "warn"}`}
                    style={{ animationDelay: `${i * 0.05}s` }}
                    onMouseEnter={() => { setRoomLocked(true); setActiveRoom(i); }}
                    onClick={() => { setRoomLocked(true); setActiveRoom(i); }}
                  >
                    <Package size={16} />
                    <span>{r.name}</span>
                  </button>
                ))}
              </div>
            </Reveal>

            <Reveal className="mc-room-panel" delay={0.15}>
              <div className="mc-room-panel-top">
                <MapPin size={18} /> Ruang aktif
              </div>
              <h3 key={room.name} className="mc-room-name">{room.name}</h3>
              <div className="mc-room-metrics">
                <div><b key={`i${activeRoom}`}>{room.items}</b><span>Jenis barang</span></div>
                <div><b key={`u${activeRoom}`}>{room.items * 6}</b><span>Total unit</span></div>
              </div>
              <div className={`mc-room-cond ${room.cond === "Baik" ? "ok" : room.cond === "Rusak ringan" ? "bad" : "warn"}`}>
                <CheckCircle2 size={16} /> {room.cond}
              </div>
              <div className="mc-room-bar"><span key={`b${activeRoom}`} style={{ "--w": `${55 + ((activeRoom * 13) % 45)}%` }} /></div>
              <div className="mc-legend">
                <span className="ok">Baik</span><span className="warn">Perlu perawatan</span><span className="bad">Rusak ringan</span>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══ TESTIMONI ═══ */}
      <section className="mc-section mc-section-alt" id="testimoni">
        <div className="mc-section-inner">
          <Reveal className="mc-section-head">
            <span className="mc-label">Testimoni</span>
            <h2 className="mc-title">Apa Kata Pengguna?</h2>
          </Reveal>
          <Reveal className="mc-testimonial">
            <div className="mc-quote-badge"><Quote size={28} /></div>
            <p className="mc-testimonial-quote">
              "Sejak menggunakan sistem ini, pencatatan inventaris sekolah menjadi jauh lebih cepat.
              Dulu butuh berhari-hari, sekarang cukup hitungan jam. Fitur scan QR-nya luar biasa!"
            </p>
            <div className="mc-testimonial-stars">
              {[1, 2, 3, 4, 5].map(i => <Star key={i} size={16} fill="currentColor" />)}
            </div>
            <div className="mc-testimonial-author">
              <div className="mc-testimonial-avatar">BS</div>
              <div className="mc-testimonial-info">
                <p>Budi Santoso, S.Pd.</p>
                <p>Kepala Sarana Prasarana, SMA Pasundan Rancaekek</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="mc-section" id="faq">
        <div className="mc-section-inner">
          <Reveal className="mc-section-head">
            <span className="mc-label">FAQ</span>
            <h2 className="mc-title">Pertanyaan yang Sering Diajukan</h2>
          </Reveal>
          <div className="mc-faq">
            {FAQS.map((faq, i) => (
              <Reveal key={i} delay={i * 0.06}>
                <div className={`mc-faq-item ${openFaq === i ? "open" : ""}`} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <div className="mc-faq-q">{faq.q}<ChevronDown size={20} /></div>
                  <div className="mc-faq-a">{faq.a}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <Reveal className="mc-cta">
        <div className="mc-cta-boxes" aria-hidden="true">
          {Array.from({ length: 10 }).map((_, i) => (
            <span key={i} style={{ left: `${i * 10 + 2}%`, animationDelay: `${-i * 0.9}s`, animationDuration: `${6 + (i % 4)}s` }}>
              <Package size={22 + (i % 3) * 8} />
            </span>
          ))}
        </div>
        <h2 className="mc-cta-title">Siap Memodernisasi Inventaris Anda?</h2>
        <p className="mc-cta-desc">Bergabunglah dengan sistem yang telah dipercaya untuk mengelola aset sekolah secara profesional.</p>
        <div className="mc-cta-actions">
          <Link to="/login" className="mc-btn mc-btn-gold mc-btn-lg"><LogIn size={20} /> Masuk ke Dashboard</Link>
          <a href="mailto:admin@smappasundan.sch.id" className="mc-btn mc-btn-ghost-light mc-btn-lg"><UserPlus size={20} /> Minta Akses</a>
        </div>
      </Reveal>

      {/* ═══ FOOTER ═══ */}
      <footer className="mc-footer">
        <div className="mc-footer-inner">
          <div className="mc-footer-brand">
            <h3>Inventaris</h3>
            <p>Sistem manajemen aset sekolah yang elegan, aman, dan efisien. Dirancang untuk memudahkan pekerjaan, bukan mempersulitnya.</p>

            <div className="mc-footer-contact">
              <div><MapPinIcon size={14} /> Jl. Raya Rancaekek No. 123, Kab. Bandung</div>
              <div><Phone size={14} /> (022) 1234567</div>
              <div><Mail size={14} /> info@smappasundan.sch.id</div>
            </div>

            <div className="mc-footer-social">
              <a href="#" title="Facebook">📘</a>
              <a href="#" title="Instagram">📷</a>
              <a href="#" title="Twitter">🐦</a>
            </div>
          </div>
          <div className="mc-footer-col">
            <h4>Produk</h4>
            <ul>
              <li><a href="#fitur">Fitur</a></li>
              <li><a href="#cara-kerja">Cara Kerja</a></li>
              <li><a href="#ruang">Peta Ruang</a></li>
              <li><a href="#faq">FAQ</a></li>
            </ul>
          </div>
          <div className="mc-footer-col">
            <h4>Perusahaan</h4>
            <ul>
              <li><a href="#">Tentang Kami</a></li>
              <li><a href="#">Kontak</a></li>
              <li><a href="#">Karier</a></li>
            </ul>
          </div>
          <div className="mc-footer-col">
            <h4>Bantuan</h4>
            <ul>
              <li><a href="#">Panduan</a></li>
              <li><a href="#">Kebijakan Privasi</a></li>
              <li><a href="#">Syarat Layanan</a></li>
            </ul>
          </div>
        </div>
        <div className="mc-footer-bottom">
          &copy; {new Date().getFullYear()} SMA Pasundan Rancaekek. Hak Cipta Dilindungi.
        </div>
      </footer>
    </div>
  );
}

/* ═════════════ STYLES ═════════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400;1,700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

.mc-landing {
  --bg:#F9F8F6; --surface:#FFFFFF; --text:#1A1A2E; --text-muted:#6B7280;
  --navy:#16213E; --navy-light:#2A3B5F; --gold:#D4AF37; --gold-hover:#B5952F; --gold-soft:#FDFBF7;
  --border:#E5E7EB; --maroon:#7F1D1D; --maroon-light:#B91C1C; --grid-line:rgba(22,33,62,.06);
  --shadow-sm:0 1px 2px rgba(0,0,0,.05); --shadow-md:0 4px 6px -1px rgba(0,0,0,.1);
  --shadow-lg:0 10px 15px -3px rgba(0,0,0,.1); --shadow-xl:0 20px 25px -5px rgba(0,0,0,.12);
  --ease-out:cubic-bezier(.16,1,.3,1); --ease-spring:cubic-bezier(.34,1.56,.64,1);
  --pad:clamp(1rem,4.5vw,6rem);
  --sy:0; --px:0; --py:0;

  font-family:'Plus Jakarta Sans',sans-serif; background:var(--bg); color:var(--text);
  min-height:100vh; width:100%; overflow-x:hidden; line-height:1.6;
  transition:background-color .3s ease,color .3s ease;
  position:relative;
  isolation:isolate;
  z-index:0;
}
.dark .mc-landing {
  --bg:#0A0A0A; --surface:#171717; --text:#F5F5F5; --text-muted:#A3A3A3;
  --navy:#262626; --navy-light:#404040; --gold:#B91C1C; --gold-hover:#991B1B; --gold-soft:#2A0A0A;
  --border:#262626; --maroon:#7F1D1D; --maroon-light:#DC2626; --grid-line:rgba(255,255,255,.05);
}
.mc-landing *{box-sizing:border-box}
.mc-landing a{text-decoration:none;color:inherit}
.mc-landing ul{list-style:none;padding:0;margin:0}
.mc-landing button{font-family:inherit}

/* SCROLL PROGRESS */
.mc-scroll-progress{
  position:fixed;top:0;left:0;height:3px;width:0;z-index:999;
  background:linear-gradient(90deg,var(--gold),var(--maroon-light));
  box-shadow:0 0 12px rgba(212,175,55,.6);
  pointer-events:none;
}

/* CURSOR GLOW */
.mc-cursor-glow{
  position:fixed;top:0;left:0;width:500px;height:500px;border-radius:50%;
  pointer-events:none;z-index:0;
  background:radial-gradient(circle,rgba(212,175,55,.14),transparent 70%);
  filter:blur(40px);will-change:transform;
  mix-blend-mode:multiply;
  transition:opacity .3s;
}
.dark .mc-cursor-glow{
  background:radial-gradient(circle,rgba(220,38,38,.16),transparent 70%);
  mix-blend-mode:screen;
}

/* NAVBAR */
.mc-navbar{
  position:fixed;top:0;width:100%;z-index:100;
  padding:1.25rem var(--pad);
  transition:all .4s var(--ease-out);
}
.mc-navbar.scrolled{
  background:color-mix(in srgb,var(--surface) 88%,transparent);
  backdrop-filter:blur(20px) saturate(1.5);
  -webkit-backdrop-filter:blur(20px) saturate(1.5);
  padding:.75rem var(--pad);
  box-shadow:var(--shadow-sm);
  border-bottom:1px solid var(--border);
}
.mc-nav-inner{width:100%;display:flex;align-items:center;justify-content:space-between;gap:1rem}
.mc-brand{display:flex;align-items:center;gap:.75rem;font-family:'Playfair Display',serif;font-size:1.5rem;font-weight:700;transition:transform .3s var(--ease-spring)}
.mc-brand:hover{transform:scale(1.04)}
.mc-brand-icon{width:42px;height:42px;background:linear-gradient(135deg,var(--gold),var(--maroon-light));color:#fff;border-radius:11px;
  display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(212,175,55,.35);position:relative;overflow:hidden;transition:transform .4s var(--ease-spring)}
.mc-brand-icon svg{position:relative;z-index:1}
.mc-brand-icon::before{content:'';position:absolute;inset:-50%;background:conic-gradient(from 0deg,transparent,rgba(255,255,255,.4),transparent 30%);animation:spin 4s linear infinite}
.mc-brand:hover .mc-brand-icon{transform:rotate(-8deg) scale(1.1)}
@keyframes spin{to{transform:rotate(360deg)}}
.mc-nav-links{display:flex;gap:2.25rem}
.mc-nav-links a{font-size:.95rem;font-weight:500;color:var(--text-muted);position:relative;transition:color .2s}
.mc-nav-links a::after{content:'';position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);width:0;height:2px;background:var(--gold);border-radius:2px;transition:width .3s var(--ease-out)}
.mc-nav-links a:hover{color:var(--gold)}
.mc-nav-links a:hover::after{width:100%}
.mc-nav-actions{display:flex;align-items:center;gap:1rem}
.mc-theme-btn{width:40px;height:40px;border-radius:50%;background:var(--surface);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;color:var(--text);cursor:pointer;transition:all .3s var(--ease-spring)}
.mc-theme-btn:hover{background:var(--gold);color:#fff;border-color:var(--gold);transform:rotate(20deg) scale(1.1);box-shadow:0 4px 16px rgba(212,175,55,.4)}

/* ═══════════ BUTTONS — FIX TEKS PUTIH ═══════════ */
.mc-btn{
  display:inline-flex;align-items:center;justify-content:center;gap:.5rem;
  padding:.75rem 1.5rem;border-radius:99px;font-weight:600;font-size:.9rem;
  transition:all .3s var(--ease-spring);cursor:pointer;border:none;white-space:nowrap;
  position:relative;overflow:hidden;text-decoration:none;
}
.mc-btn::before{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent);transform:translateX(-100%);transition:transform .6s ease;pointer-events:none}
.mc-btn:hover::before{transform:translateX(100%)}
.mc-btn-lg{padding:1rem 2rem;font-size:1rem}

/* ✅ PRIMARY — teks PUTIH paksa */
.mc-btn-primary,
.mc-btn-primary:hover,
.mc-btn-primary:focus,
.mc-btn-primary:active,
.mc-btn-primary:visited{
  background:var(--navy);
  color:#ffffff !important;
  box-shadow:var(--shadow-md);
}
.mc-btn-primary svg,
.mc-btn-primary svg *{
  color:#ffffff !important;
  stroke:#ffffff !important;
}
.mc-btn-primary:hover{
  background:var(--gold);
  color:#ffffff !important;
  transform:translateY(-3px) scale(1.03);
  box-shadow:0 12px 28px rgba(212,175,55,.45);
}

/* ✅ GOLD — teks PUTIH paksa */
.mc-btn-gold,
.mc-btn-gold:hover,
.mc-btn-gold:focus,
.mc-btn-gold:active,
.mc-btn-gold:visited{
  background:linear-gradient(135deg,var(--gold),var(--maroon-light),var(--gold));
  background-size:200% 200%;
  color:#ffffff !important;
  box-shadow:0 4px 15px rgba(212,175,55,.4);
  animation:gradshift 4s ease infinite;
}
.mc-btn-gold svg,
.mc-btn-gold svg *{
  color:#ffffff !important;
  stroke:#ffffff !important;
}
.mc-btn-gold:hover{
  color:#ffffff !important;
  transform:translateY(-3px) scale(1.04);
  box-shadow:0 14px 32px rgba(212,175,55,.55);
}

/* OUTLINE */
.mc-btn-outline{
  background:transparent;
  color:var(--text);
  border:1px solid var(--border);
}
.mc-btn-outline:hover{
  border-color:var(--gold);
  color:var(--gold);
  background:var(--gold-soft);
  transform:translateY(-3px);
  box-shadow:0 8px 20px rgba(212,175,55,.2);
}

/* GHOST LIGHT — CTA */
.mc-btn-ghost-light{
  background:transparent;
  color:#ffffff !important;
  border:1px solid rgba(255,255,255,.4);
}
.mc-btn-ghost-light svg{
  color:#ffffff !important;
  stroke:#ffffff !important;
}
.mc-btn-ghost-light:hover{
  background:rgba(255,255,255,.12);
  color:#ffffff !important;
  transform:translateY(-3px);
}

@keyframes gradshift{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}

/* REVEAL */
.mc-reveal{opacity:0;transform:translateY(40px) scale(.98);transition:opacity .9s var(--ease-out),transform .9s var(--ease-out)}
.mc-reveal.is-visible{opacity:1;transform:none}

/* HERO */
.mc-hero{
  position:relative;min-height:100vh;width:100%;
  padding:8.5rem var(--pad) 5rem;
  display:grid;grid-template-columns:1.05fr 1fr;
  gap:clamp(2rem,4vw,5rem);align-items:center;
  overflow:hidden;z-index:2;
}
.mc-hero-bg{position:absolute;inset:0;z-index:0;pointer-events:none}
.mc-hero-grid{
  position:absolute;inset:0;
  background-image:linear-gradient(var(--grid-line) 1px,transparent 1px),linear-gradient(90deg,var(--grid-line) 1px,transparent 1px);
  background-size:56px 56px;
  mask-image:radial-gradient(ellipse at 50% 40%,#000 30%,transparent 78%);
  -webkit-mask-image:radial-gradient(ellipse at 50% 40%,#000 30%,transparent 78%);
  animation:gridmove 20s linear infinite;
}
@keyframes gridmove{to{background-position:56px 56px}}
.mc-orb{position:absolute;border-radius:50%;filter:blur(70px);animation:orb 12s ease-in-out infinite;pointer-events:none}
.mc-orb.o1{width:420px;height:420px;top:-80px;left:-80px;background:rgba(212,175,55,.28)}
.mc-orb.o2{width:480px;height:480px;bottom:-120px;right:-80px;background:rgba(185,28,28,.2);animation-delay:-4s}
.mc-orb.o3{width:300px;height:300px;top:40%;left:45%;background:rgba(42,59,95,.18);animation-delay:-8s}
@keyframes orb{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(40px,-30px) scale(1.2)}}
.mc-floater{
  position:absolute;color:var(--gold);opacity:.22;
  animation:floater linear infinite;
  transform:translate3d(calc(var(--px)*var(--depth)*-60px),calc(var(--py)*var(--depth)*-60px - var(--sy)*var(--depth)*.12px),0);
  pointer-events:none;z-index:0;
}
.mc-floater svg{display:block;animation:floatsway 6s ease-in-out infinite}
@keyframes floater{0%,100%{margin-top:0}50%{margin-top:-34px}}
@keyframes floatsway{0%,100%{transform:rotate(-10deg)}50%{transform:rotate(14deg)}}

.mc-hero-copy,.mc-hero-visual{position:relative;z-index:2;isolation:isolate}

/* HERO COPY */
.mc-hero-copy{max-width:100%;min-width:0}
.mc-hero-label{
  display:inline-flex;align-items:center;gap:.4rem;
  padding:.5rem 1rem;
  background:var(--gold-soft);color:var(--gold);
  border:1px solid var(--gold);
  border-radius:99px;font-size:.85rem;font-weight:700;
  margin-bottom:1.5rem;position:relative;overflow:hidden;
  opacity:0;animation:fadeup .8s var(--ease-out) .1s forwards;
}
.mc-hero-label::before{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(212,175,55,.3),transparent);transform:translateX(-100%);animation:labelshine 3s ease-in-out infinite;pointer-events:none}
@keyframes labelshine{0%,60%{transform:translateX(-100%)}100%{transform:translateX(100%)}}

.mc-hero-title{
  font-family:'Playfair Display',serif;
  font-size:clamp(2.4rem,5.2vw,5.4rem);
  line-height:1.08;margin:0 0 1.5rem;font-weight:700;
  color:var(--text);
  text-shadow:0 1px 2px rgba(0,0,0,.04);
  opacity:0;animation:fadeup .8s var(--ease-out) .2s forwards;
}
.dark .mc-hero-title{text-shadow:0 1px 4px rgba(0,0,0,.3)}
.mc-hero-title em{
  font-style:italic;
  background:linear-gradient(135deg,var(--gold),var(--maroon-light));
  background-size:200% 200%;
  -webkit-background-clip:text;background-clip:text;
  -webkit-text-fill-color:transparent;
  animation:gradshift 4s ease infinite;
}
.mc-typed{display:inline-block;color:var(--gold);min-width:2ch;border-bottom:3px solid color-mix(in srgb,var(--gold) 35%,transparent)}
.mc-caret{display:inline-block;width:3px;height:.85em;margin-left:4px;background:var(--maroon-light);vertical-align:-.05em;animation:blink .8s steps(1) infinite}
@keyframes blink{50%{opacity:0}}

.mc-hero-desc{
  font-size:clamp(1rem,1.25vw,1.25rem);
  color:var(--text-muted);margin:0 0 2.25rem;
  max-width:620px;line-height:1.75;
  opacity:0;animation:fadeup .8s var(--ease-out) .3s forwards;
}
.mc-hero-actions{
  display:flex;gap:1rem;margin-bottom:3rem;flex-wrap:wrap;
  opacity:0;animation:fadeup .8s var(--ease-out) .4s forwards;
}
.mc-stats{
  display:flex;gap:clamp(1.5rem,4vw,4rem);
  padding-top:2rem;border-top:1px solid var(--border);
  flex-wrap:wrap;
  opacity:0;animation:fadeup .8s var(--ease-out) .5s forwards;
}
.mc-stat-item h4{font-family:'Playfair Display',serif;font-size:2.4rem;color:var(--gold);margin:0 0 .15rem;font-weight:700}
.mc-stat-item p{margin:0;font-size:.8rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:1.5px;font-weight:700}
@keyframes fadeup{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}

/* HERO VISUAL */
.mc-hero-visual{
  opacity:0;animation:fadeup 1s var(--ease-out) .4s forwards;
  perspective:1400px;padding:20px;margin:-20px;min-width:0;
}
.mc-dashboard-mockup{
  --rx:4deg;--ry:-8deg;
  background:var(--surface);border-radius:22px;border:1px solid var(--border);
  box-shadow:var(--shadow-xl),0 40px 80px -20px rgba(212,175,55,.25);
  padding:1.5rem;transform:rotateX(var(--rx)) rotateY(var(--ry));
  transition:transform .25s ease-out;transform-style:preserve-3d;width:100%;
}
.mc-mockup-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;padding-bottom:1rem;border-bottom:1px solid var(--border)}
.mc-mockup-dots{display:flex;gap:6px}
.mc-mockup-dots span{width:11px;height:11px;border-radius:50%}
.mc-mockup-dots span:nth-child(1){background:#EF4444}
.mc-mockup-dots span:nth-child(2){background:#F59E0B}
.mc-mockup-dots span:nth-child(3){background:#10B981}
.mc-mockup-title{font-size:.8rem;font-weight:700;color:var(--text-muted);display:flex;align-items:center;gap:.5rem}
.mc-live-dot{width:8px;height:8px;border-radius:50%;background:#10B981;display:inline-block;flex-shrink:0;animation:pulse 1.6s ease-out infinite}
@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(16,185,129,.7)}100%{box-shadow:0 0 0 10px rgba(16,185,129,0)}}

.mc-scan-area{display:grid;grid-template-columns:1fr 1fr;gap:1.25rem;margin-bottom:1.25rem;align-items:stretch}
.mc-scan-frame{position:relative;aspect-ratio:1;background:var(--bg);border-radius:16px;padding:1.4rem;color:var(--navy);overflow:hidden;border:1px solid var(--border)}
.dark .mc-scan-frame{color:#fff}
.mc-qr{width:100%;height:100%;display:block}
.mc-qr-cell{animation:qrflick 3s ease-in-out infinite}
@keyframes qrflick{0%,90%,100%{opacity:1}95%{opacity:.25}}
.mc-scan-frame .c{position:absolute;width:22px;height:22px;border:3px solid var(--gold);z-index:2}
.mc-scan-frame .tl{top:8px;left:8px;border-right:0;border-bottom:0;border-radius:6px 0 0 0}
.mc-scan-frame .tr{top:8px;right:8px;border-left:0;border-bottom:0;border-radius:0 6px 0 0}
.mc-scan-frame .bl{bottom:8px;left:8px;border-right:0;border-top:0;border-radius:0 0 0 6px}
.mc-scan-frame .br{bottom:8px;right:8px;border-left:0;border-top:0;border-radius:0 0 6px 0}
.mc-laser{position:absolute;left:0;right:0;height:3px;top:0;z-index:3;background:linear-gradient(90deg,transparent,var(--maroon-light),var(--gold),var(--maroon-light),transparent);box-shadow:0 0 18px 4px rgba(220,38,38,.55);animation:laser 3s ease-in-out infinite}
@keyframes laser{0%{top:4%}50%{top:94%}100%{top:4%}}
.mc-scan-result{background:var(--bg);border:1px solid var(--border);border-radius:16px;padding:1.1rem;display:flex;flex-direction:column;justify-content:center;gap:.5rem;animation:resultcycle 6s ease-in-out infinite}
@keyframes resultcycle{0%,40%{opacity:.15;transform:translateX(16px) scale(.96)}55%,92%{opacity:1;transform:none}100%{opacity:.15;transform:translateX(16px) scale(.96)}}
.mc-scan-ok{display:inline-flex;align-items:center;gap:.35rem;color:#10B981;font-size:.75rem;font-weight:800;text-transform:uppercase;letter-spacing:1px}
.mc-scan-result h5{font-family:'Playfair Display',serif;font-size:1.1rem;margin:0 0 .25rem;color:var(--text)}
.mc-scan-row{display:flex;justify-content:space-between;font-size:.78rem;color:var(--text-muted);border-top:1px dashed var(--border);padding-top:.4rem}
.mc-scan-row b{color:var(--text)}
.mc-scan-row b.good{color:#10B981}

.mc-mockup-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:.75rem;margin-bottom:1rem}
.mc-mockup-card{background:var(--bg);border-radius:12px;padding:.85rem;border:1px solid var(--border);transition:all .3s var(--ease-out)}
.mc-mockup-card:hover{transform:translateY(-3px);border-color:var(--gold);box-shadow:0 8px 20px rgba(0,0,0,.08)}
.mc-mockup-card .title{font-size:.7rem;color:var(--text-muted);margin-bottom:.3rem}
.mc-mockup-card .value{font-family:'Playfair Display',serif;font-size:1.4rem;font-weight:700;color:var(--text)}
.mc-bars{display:flex;align-items:flex-end;gap:6px;height:70px;padding:.5rem .25rem 0}
.mc-bars span{flex:1;height:var(--h);border-radius:6px 6px 0 0;background:linear-gradient(180deg,var(--gold),var(--maroon-light));transform-origin:bottom;animation:barpulse 2.6s ease-in-out infinite}
@keyframes barpulse{0%,100%{transform:scaleY(1)}50%{transform:scaleY(.55)}}

/* FLOATING BADGES */
.mc-floating-badge{position:absolute;background:var(--surface);padding:.85rem 1rem;border-radius:14px;box-shadow:var(--shadow-lg);border:1px solid var(--border);display:flex;align-items:center;gap:.75rem;z-index:3;animation:float 4s ease-in-out infinite;pointer-events:none}
.mc-floating-badge .bt{font-size:.8rem;font-weight:700;color:var(--text)}
.mc-floating-badge .bs{font-size:.7rem;color:var(--text-muted)}
.mc-floating-badge.b1{top:-22px;right:-14px}
.mc-floating-badge.b2{bottom:70px;left:-34px;animation-delay:-2s}
.mc-floating-badge.b3{bottom:-24px;right:12%;animation-delay:-1s}
.mc-floating-icon{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center}
.mc-floating-icon.green{background:#D1FAE5;color:#10B981}
.mc-floating-icon.blue{background:#DBEAFE;color:#3B82F6}
.mc-floating-icon.gold{background:#FEF3C7;color:#D97706}
.dark .mc-floating-icon.green{background:rgba(16,185,129,.15)}
.dark .mc-floating-icon.blue{background:rgba(59,130,246,.15)}
.dark .mc-floating-icon.gold{background:rgba(217,119,6,.18)}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}

/* CONVEYOR / MARQUEE */
.mc-conveyor{position:relative;width:100%;padding:1.75rem 0;background:var(--surface);border-block:1px solid var(--border);overflow:hidden;display:flex;flex-direction:column;gap:1rem;z-index:2}
.mc-conveyor::before,.mc-conveyor::after{content:'';position:absolute;top:0;bottom:0;width:clamp(40px,10vw,160px);z-index:3;pointer-events:none}
.mc-conveyor::before{left:0;background:linear-gradient(90deg,var(--surface),transparent)}
.mc-conveyor::after{right:0;background:linear-gradient(-90deg,var(--surface),transparent)}
.mc-conveyor-beam{position:absolute;left:50%;top:0;bottom:0;width:2px;z-index:2;background:linear-gradient(180deg,transparent,var(--maroon-light),transparent);box-shadow:0 0 22px 6px rgba(220,38,38,.35);animation:beam 2.4s ease-in-out infinite}
@keyframes beam{0%,100%{opacity:.35}50%{opacity:1}}
.mc-marquee{width:100%;overflow:hidden}
.mc-marquee-track{display:flex;gap:1rem;width:max-content;animation:marquee 45s linear infinite}
.mc-marquee.reverse .mc-marquee-track{animation-direction:reverse;animation-duration:60s}
.mc-conveyor:hover .mc-marquee-track{animation-play-state:paused}
@keyframes marquee{to{transform:translateX(-33.3333%)}}
.mc-chip{display:inline-flex;align-items:center;gap:.6rem;padding:.7rem 1.3rem;border-radius:14px;background:var(--bg);border:1px solid var(--border);font-weight:600;font-size:.95rem;white-space:nowrap;transition:all .3s var(--ease-spring);color:var(--text)}
.mc-chip svg{color:var(--gold)}
.mc-chip:hover{border-color:var(--gold);transform:translateY(-4px);box-shadow:0 10px 22px rgba(212,175,55,.2)}
.mc-chip.soft{font-weight:500;font-size:.85rem;color:var(--text-muted);border-radius:99px;padding:.5rem 1.1rem}

/* STATS BAR */
.mc-stats-wrap{width:100%;padding:clamp(2.5rem,5vw,5rem) var(--pad) 0;position:relative;z-index:2}
.mc-stats-bar{width:100%;background:linear-gradient(135deg,var(--navy),var(--maroon));padding:clamp(2rem,4vw,3.5rem) 2rem;display:grid;grid-template-columns:repeat(4,1fr);gap:2rem;border-radius:28px;color:#fff;box-shadow:0 24px 50px -12px rgba(0,0,0,.35);position:relative;overflow:hidden}
.mc-stats-bar::before{content:'';position:absolute;top:-60%;right:-20%;width:600px;height:600px;border-radius:50%;background:radial-gradient(circle,rgba(212,175,55,.3),transparent 70%);filter:blur(40px);animation:orb 9s ease-in-out infinite;pointer-events:none}
.mc-stats-bar::after{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px);background-size:40px 40px;animation:gridmove 14s linear infinite;pointer-events:none}
.mc-stat-big{text-align:center;padding:1rem;position:relative;z-index:1;opacity:0;transform:translateY(24px) scale(.94);transition:all .9s var(--ease-spring)}
.mc-stat-big.is-visible{opacity:1;transform:none}
.mc-stat-big-icon{width:62px;height:62px;margin:0 auto 1rem;background:rgba(255,255,255,.15);border-radius:16px;display:flex;align-items:center;justify-content:center;transition:all .4s var(--ease-spring);backdrop-filter:blur(6px)}
.mc-stat-big:hover .mc-stat-big-icon{transform:scale(1.12) rotate(-8deg);background:rgba(212,175,55,.4)}
.mc-stat-big-value{font-family:'Playfair Display',serif;font-size:clamp(2.2rem,4vw,3.6rem);margin:0 0 .25rem;font-weight:700}
.mc-stat-big p{margin:0;font-size:.9rem;opacity:.9;text-transform:uppercase;letter-spacing:1.5px;font-weight:700}

/* SECTIONS */
.mc-section{width:100%;padding:clamp(4rem,8vw,8rem) var(--pad);position:relative;z-index:2}
.mc-section-alt{background:var(--surface);border-block:1px solid var(--border)}
.mc-section-inner{width:100%}
.mc-section-head{text-align:center;max-width:780px;margin:0 auto clamp(2.5rem,5vw,4.5rem)}
.mc-label{display:inline-block;font-size:.8rem;font-weight:800;color:var(--gold);text-transform:uppercase;letter-spacing:2.5px;margin-bottom:1rem;position:relative}
.mc-label::before,.mc-label::after{content:'';position:absolute;top:50%;width:32px;height:1px;background:var(--gold);opacity:.6}
.mc-label::before{right:calc(100% + 14px)}
.mc-label::after{left:calc(100% + 14px)}
.mc-title{font-family:'Playfair Display',serif;font-size:clamp(2rem,3.8vw,3.4rem);margin:0 0 1rem;line-height:1.15;color:var(--text)}
.mc-desc{font-size:1.1rem;color:var(--text-muted);margin:0}

/* FEATURES */
.mc-features-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(1rem,2vw,2rem);perspective:1200px}
.mc-feature-card{--mx:50%;--my:50%;--rx:0deg;--ry:0deg;position:relative;overflow:hidden;background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:2.5rem 2rem 2rem;box-shadow:var(--shadow-sm);opacity:0;transform:translateY(40px);transition:opacity .8s var(--ease-out),transform .3s ease-out,border-color .3s,box-shadow .3s}
.mc-feature-card.is-visible{opacity:1;transform:rotateX(var(--rx)) rotateY(var(--ry))}
.mc-feature-card::before{content:'';position:absolute;inset:0;background:radial-gradient(380px circle at var(--mx) var(--my),rgba(212,175,55,.18),transparent 60%);opacity:0;transition:opacity .3s;pointer-events:none}
.mc-feature-card:hover{border-color:var(--gold);box-shadow:var(--shadow-xl)}
.mc-feature-card:hover::before{opacity:1}
.mc-feature-num{position:absolute;top:1.1rem;right:1.4rem;font-family:'Playfair Display',serif;font-size:3.2rem;font-weight:900;color:var(--gold);opacity:.12;transition:all .4s var(--ease-out);pointer-events:none}
.mc-feature-card:hover .mc-feature-num{opacity:.3;transform:translateY(-4px) scale(1.1)}
.mc-feature-icon{width:62px;height:62px;border-radius:16px;background:var(--gold-soft);color:var(--gold);display:flex;align-items:center;justify-content:center;margin-bottom:1.5rem;border:1px solid var(--border);transition:all .4s var(--ease-spring);position:relative;z-index:1}
.mc-feature-card:hover .mc-feature-icon{transform:scale(1.12) rotate(-8deg);background:var(--gold);color:#fff;border-color:var(--gold)}
.mc-feature-title{font-family:'Playfair Display',serif;font-size:1.4rem;margin:0 0 .75rem;position:relative;z-index:1;color:var(--text)}
.mc-feature-desc{font-size:.98rem;color:var(--text-muted);margin:0 0 1.25rem;position:relative;z-index:1}
.mc-feature-link{display:inline-flex;align-items:center;gap:.3rem;font-weight:700;font-size:.88rem;color:var(--gold);position:relative;z-index:1;opacity:0;transform:translateX(-10px);transition:all .4s var(--ease-out)}
.mc-feature-card:hover .mc-feature-link{opacity:1;transform:none}

/* STEPS */
.mc-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(1.5rem,3vw,3rem);position:relative;padding-top:1rem}
.mc-steps-line{position:absolute;top:56px;left:16.6%;right:16.6%;height:3px;background:var(--border);border-radius:3px;overflow:hidden;z-index:0}
.mc-steps-line span{position:absolute;top:0;left:0;height:100%;width:30%;border-radius:3px;background:linear-gradient(90deg,transparent,var(--gold),var(--maroon-light),transparent);animation:travel 3.2s ease-in-out infinite}
@keyframes travel{0%{left:-30%}100%{left:100%}}
.mc-step{text-align:center;position:relative;z-index:1}
.mc-step-number{width:80px;height:80px;margin:0 auto -40px;position:relative;z-index:2;background:linear-gradient(135deg,var(--gold),var(--maroon-light));color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Playfair Display',serif;font-size:2rem;font-weight:700;box-shadow:0 10px 30px rgba(212,175,55,.4);transition:transform .4s var(--ease-spring)}
.mc-step-number::after{content:'';position:absolute;inset:-7px;border-radius:50%;border:2px dashed var(--gold);opacity:.5;animation:spin 18s linear infinite}
.mc-step:hover .mc-step-number{transform:scale(1.12) rotate(-8deg)}
.mc-step-card{background:var(--bg);border:1px solid var(--border);border-radius:22px;padding:4rem 1.75rem 2rem;position:relative;overflow:hidden;transition:all .4s var(--ease-out);height:100%}
.mc-step:hover .mc-step-card{transform:translateY(-8px);border-color:var(--gold);box-shadow:var(--shadow-xl)}
.mc-step-icon{width:54px;height:54px;border-radius:14px;margin:0 auto 1rem;background:var(--gold-soft);color:var(--gold);border:1px solid var(--border);display:flex;align-items:center;justify-content:center}
.mc-step-card h3{font-family:'Playfair Display',serif;font-size:1.5rem;margin:0 0 .6rem;color:var(--text)}
.mc-step-card p{color:var(--text-muted);font-size:.97rem;margin:0}
.mc-step-box{position:absolute;bottom:10px;left:-30px;color:var(--gold);opacity:.4;animation:slidebox 6s linear infinite}
@keyframes slidebox{0%{left:-30px}100%{left:calc(100% + 10px)}}

/* ROOMS */
.mc-rooms{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(300px,1fr);gap:clamp(1rem,2.5vw,2.5rem);align-items:stretch}
.mc-rooms-grid{width:100%}
.mc-rooms-tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:.75rem;height:100%}
.mc-room{display:flex;flex-direction:column;align-items:flex-start;justify-content:space-between;gap:.6rem;min-height:92px;padding:.9rem;border-radius:14px;border:1px solid var(--border);background:var(--surface);color:var(--text);cursor:pointer;text-align:left;font-size:.82rem;font-weight:600;animation:tilein .6s var(--ease-spring) both;transition:all .3s var(--ease-spring);position:relative;overflow:hidden}
@keyframes tilein{from{opacity:0;transform:scale(.7) translateY(20px)}to{opacity:1;transform:none}}
.mc-room svg{transition:transform .4s var(--ease-spring)}
.mc-room.ok svg{color:#10B981}
.mc-room.warn svg{color:#F59E0B}
.mc-room.bad svg{color:#EF4444}
.mc-room::after{content:'';position:absolute;left:0;bottom:0;height:3px;width:100%;background:currentColor;opacity:0;transition:opacity .3s}
.mc-room:hover{transform:translateY(-4px)}
.mc-room.active{border-color:var(--gold);background:var(--gold-soft);transform:translateY(-5px) scale(1.04);box-shadow:0 14px 28px rgba(212,175,55,.3);z-index:1}
.mc-room.active svg{transform:scale(1.4) rotate(-10deg)}
.mc-room.active::after{opacity:1;color:var(--gold)}
.mc-room-panel{background:linear-gradient(160deg,var(--navy),var(--maroon));color:#fff;border-radius:24px;padding:2rem;display:flex;flex-direction:column;gap:1.25rem;box-shadow:var(--shadow-xl);position:relative;overflow:hidden}
.mc-room-panel::before{content:'';position:absolute;top:-40%;right:-30%;width:380px;height:380px;border-radius:50%;background:radial-gradient(circle,rgba(212,175,55,.3),transparent 70%);filter:blur(30px);animation:orb 8s ease-in-out infinite;pointer-events:none}
.mc-room-panel>*{position:relative;z-index:1}
.mc-room-panel-top{display:flex;align-items:center;gap:.5rem;font-size:.8rem;font-weight:700;text-transform:uppercase;letter-spacing:2px;opacity:.8}
.mc-room-name{font-family:'Playfair Display',serif;font-size:clamp(1.8rem,2.6vw,2.6rem);margin:0;animation:swap .5s var(--ease-out)}
@keyframes swap{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.mc-room-metrics{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
.mc-room-metrics div{background:rgba(255,255,255,.1);border-radius:14px;padding:1rem;backdrop-filter:blur(6px)}
.mc-room-metrics b{display:block;font-family:'Playfair Display',serif;font-size:2.2rem;line-height:1.1;animation:swap .5s var(--ease-out)}
.mc-room-metrics span{font-size:.78rem;opacity:.8}
.mc-room-cond{display:inline-flex;align-items:center;gap:.5rem;align-self:flex-start;padding:.45rem 1rem;border-radius:99px;font-size:.85rem;font-weight:700;background:rgba(255,255,255,.14)}
.mc-room-cond.ok{color:#6EE7B7}
.mc-room-cond.warn{color:#FCD34D}
.mc-room-cond.bad{color:#FCA5A5}
.mc-room-bar{height:10px;border-radius:99px;background:rgba(255,255,255,.15);overflow:hidden}
.mc-room-bar span{display:block;height:100%;width:var(--w);border-radius:99px;background:linear-gradient(90deg,var(--gold),#fff);animation:grow 1s var(--ease-out)}
@keyframes grow{from{width:0}}
.mc-legend{display:flex;gap:1rem;flex-wrap:wrap;margin-top:auto;font-size:.75rem;opacity:.85}
.mc-legend span{display:inline-flex;align-items:center;gap:.4rem}
.mc-legend span::before{content:'';width:9px;height:9px;border-radius:50%;background:currentColor}
.mc-legend .ok{color:#6EE7B7}
.mc-legend .warn{color:#FCD34D}
.mc-legend .bad{color:#FCA5A5}

/* TESTIMONIAL */
.mc-testimonial{background:var(--bg);border-radius:28px;padding:clamp(3rem,5vw,5rem) clamp(1.5rem,4vw,4rem) clamp(2rem,4vw,3.5rem);text-align:center;width:100%;max-width:1100px;margin:0 auto;border:1px solid var(--border);box-shadow:var(--shadow-lg);position:relative}
.mc-quote-badge{position:absolute;top:-30px;left:50%;transform:translateX(-50%);width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,var(--gold),var(--maroon-light));color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 26px rgba(212,175,55,.45);animation:float 4s ease-in-out infinite}
.mc-testimonial-quote{font-family:'Playfair Display',serif;font-size:clamp(1.2rem,2.2vw,2rem);line-height:1.6;margin:0 0 1rem;font-style:italic;color:var(--text)}
.mc-testimonial-stars{display:flex;justify-content:center;gap:.25rem;color:#F59E0B;margin-bottom:1.5rem}
.mc-testimonial-author{display:flex;align-items:center;justify-content:center;gap:1rem}
.mc-testimonial-avatar{width:54px;height:54px;border-radius:50%;background:linear-gradient(135deg,var(--gold),var(--maroon-light));display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:1.2rem;box-shadow:0 4px 12px rgba(212,175,55,.3)}
.mc-testimonial-info{text-align:left}
.mc-testimonial-info p{margin:0}
.mc-testimonial-info p:first-child{font-weight:700;color:var(--text)}
.mc-testimonial-info p:last-child{font-size:.85rem;color:var(--text-muted)}

/* FAQ */
.mc-faq{width:100%;max-width:1000px;margin:0 auto}
.mc-faq-item{background:var(--surface);border:1px solid var(--border);border-radius:14px;margin-bottom:1rem;overflow:hidden;cursor:pointer;transition:all .3s var(--ease-out)}
.mc-faq-item:hover{border-color:var(--gold);transform:translateX(6px)}
.mc-faq-item.open{border-color:var(--gold);box-shadow:0 8px 24px rgba(212,175,55,.18)}
.mc-faq-q{padding:1.4rem 1.6rem;display:flex;justify-content:space-between;align-items:center;gap:1rem;font-weight:600;font-size:1.02rem;color:var(--text)}
.mc-faq-item:hover .mc-faq-q{color:var(--gold)}
.mc-faq-q svg{transition:transform .4s var(--ease-spring);flex-shrink:0}
.mc-faq-item.open .mc-faq-q svg{transform:rotate(180deg);color:var(--gold)}
.mc-faq-a{max-height:0;overflow:hidden;opacity:0;padding:0 1.6rem;color:var(--text-muted);font-size:.97rem;transition:max-height .5s var(--ease-out),padding .3s,opacity .4s}
.mc-faq-item.open .mc-faq-a{max-height:300px;opacity:1;padding:0 1.6rem 1.5rem}

/* CTA */
.mc-cta{background:linear-gradient(135deg,var(--navy),var(--maroon),var(--navy));background-size:200% 200%;animation:gradshift 10s ease infinite;border-radius:28px;padding:clamp(3.5rem,7vw,7rem) 2rem;text-align:center;color:#fff;position:relative;overflow:hidden;margin:0 var(--pad) clamp(3rem,6vw,6rem)}
.mc-cta-boxes span{position:absolute;bottom:-50px;color:#fff;opacity:.14;animation:rise linear infinite;pointer-events:none}
@keyframes rise{0%{transform:translateY(0) rotate(0)}100%{transform:translateY(-520px) rotate(360deg)}}
.mc-cta-title{font-family:'Playfair Display',serif;font-size:clamp(2rem,4.4vw,4rem);margin:0 0 1rem;position:relative;z-index:1;color:#fff}
.mc-cta-desc{color:rgba(255,255,255,.85);font-size:1.15rem;margin:0 auto 2.5rem;max-width:700px;position:relative;z-index:1}
.mc-cta-actions{display:flex;gap:1rem;justify-content:center;position:relative;z-index:1;flex-wrap:wrap}

/* FOOTER */
.mc-footer{background:var(--navy);color:rgba(255,255,255,.7);padding:4rem var(--pad) 2rem;width:100%;position:relative;z-index:2}
.mc-footer-inner{width:100%;display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:3rem;padding-bottom:3rem;border-bottom:1px solid rgba(255,255,255,.1)}
.mc-footer-brand h3{font-family:'Playfair Display',serif;font-size:1.6rem;color:#fff;margin:0 0 1rem}
.mc-footer-brand p{font-size:.92rem;max-width:380px;margin:0 0 1.5rem}
.mc-footer-contact{display:flex;flex-direction:column;gap:.5rem;margin-bottom:1.5rem;font-size:.82rem}
.mc-footer-contact > div{display:flex;align-items:center;gap:.5rem}
.mc-footer-contact svg{color:var(--gold);flex-shrink:0}
.mc-footer-social{display:flex;gap:.75rem}
.mc-footer-social a{width:38px;height:38px;border-radius:10px;background:rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;transition:all .3s var(--ease-spring);font-size:1.2rem}
.mc-footer-social a:hover{background:var(--gold);transform:translateY(-4px) scale(1.1);box-shadow:0 8px 20px rgba(212,175,55,.4)}
.mc-footer-col h4{color:#fff;margin:0 0 1rem;font-weight:600;font-size:.95rem}
.mc-footer-col ul li{margin-bottom:.75rem}
.mc-footer-col ul li a{font-size:.92rem;transition:all .2s;display:inline-block}
.mc-footer-col ul li a:hover{color:var(--gold);transform:translateX(5px)}
.mc-footer-bottom{width:100%;padding-top:2rem;text-align:center;font-size:.85rem}

/* RESPONSIVE */
@media (max-width:1100px){
  .mc-hero{grid-template-columns:1fr;text-align:center;padding-top:7.5rem;min-height:auto}
  .mc-hero-copy{order:1;z-index:3;margin:0 auto;width:100%}
  .mc-hero-visual{order:2;max-width:640px;margin:0 auto;width:100%;padding:20px 0;margin-top:2rem}
  .mc-hero-desc{margin-inline:auto}
  .mc-hero-actions,.mc-stats{justify-content:center}
  .mc-dashboard-mockup{--ry:0deg;--rx:0deg}
  .mc-features-grid{grid-template-columns:repeat(2,1fr)}
  .mc-stats-bar{grid-template-columns:repeat(2,1fr)}
  .mc-rooms{grid-template-columns:1fr}
  .mc-footer-inner{grid-template-columns:1fr 1fr}
}
@media (max-width:820px){
  .mc-nav-links{display:none}
  .mc-steps{grid-template-columns:1fr}
  .mc-steps-line{display:none}
}
@media (max-width:640px){
  .mc-features-grid,.mc-footer-inner{grid-template-columns:1fr}
  .mc-stats-bar{grid-template-columns:1fr 1fr;padding:2rem 1rem;gap:1rem}
  .mc-scan-area{grid-template-columns:1fr}
  .mc-floating-badge{display:none}
  .mc-stats{gap:1.5rem}
  .mc-label::before,.mc-label::after{display:none}
  .mc-nav-actions .mc-btn-primary{padding:.6rem 1rem;font-size:.85rem}
  .mc-cta{margin-inline:1rem}
  .mc-hero-title{font-size:2rem}
  .mc-hero-label{font-size:.75rem;padding:.4rem .8rem}
}
@media (prefers-reduced-motion:reduce){
  .mc-landing *,.mc-landing *::before,.mc-landing *::after{
    animation-duration:.001ms !important;
    animation-iteration-count:1 !important;
    transition-duration:.001ms !important;
  }
}
`;