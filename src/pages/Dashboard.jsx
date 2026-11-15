import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Package, MapPin, Activity, TrendingUp, TrendingDown,
  Layers, ArrowRight, Clock, Box, Sparkles,
  ChevronRight, AlertTriangle, CheckCircle2, Boxes,
  Calendar, ArrowUpRight
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid,
} from "recharts";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../stores/authStore";
import RoleBadge from "../components/ui/RoleBadge";

const COLORS = ["#D4AF37", "#10B981", "#F59E0B", "#3B82F6", "#8B5CF6", "#B91C1C"];
const conditionLabels = { baik: "Baik", rusak_ringan: "Rusak Ringan", rusak_berat: "Rusak Berat" };
const conditionColors = { baik: "#10B981", rusak_ringan: "#F59E0B", rusak_berat: "#EF4444" };

export default function Dashboard() {
  const { profile } = useAuthStore();
  const [stats, setStats] = useState({ items: 0, units: 0, locations: 0, movements: 0 });
  const [byCategory, setByCategory] = useState([]);
  const [byCondition, setByCondition] = useState([]);
  const [recentItems, setRecentItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 30);
    return () => clearTimeout(t);
  }, []);

  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12 ? "Selamat Pagi"
    : currentHour < 15 ? "Selamat Siang"
    : currentHour < 18 ? "Selamat Sore"
    : "Selamat Malam";

  const totalConditionUnits = useMemo(
    () => byCondition.reduce((s, c) => s + c.value, 0),
    [byCondition]
  );
  const baikPercent = useMemo(() => {
    const baik = byCondition.find(c => c.name === "Baik")?.value || 0;
    return totalConditionUnits ? Math.round((baik / totalConditionUnits) * 100) : 0;
  }, [byCondition, totalConditionUnits]);

  useEffect(() => {
    (async () => {
      const [itemsRes, unitsRes, locsRes, movsRes] = await Promise.all([
        supabase.from("items").select("*", { count: "exact", head: true }),
        supabase.from("item_units").select("*", { count: "exact", head: true }),
        supabase.from("locations").select("*", { count: "exact", head: true }),
        supabase.from("item_movements").select("*", { count: "exact", head: true }),
      ]);

      setStats({
        items: itemsRes.count || 0,
        units: unitsRes.count || 0,
        locations: locsRes.count || 0,
        movements: movsRes.count || 0,
      });

      const { data: items } = await supabase
        .from("items")
        .select(`id, name, created_at, category:categories(name), item_units(condition)`)
        .order("created_at", { ascending: false });

      if (items) {
        const catMap = {};
        const condMap = {};

        items.forEach((it) => {
          const cName = it.category?.name || "Tanpa Kategori";
          catMap[cName] = (catMap[cName] || 0) + 1;
          (it.item_units || []).forEach(u => {
            condMap[u.condition] = (condMap[u.condition] || 0) + 1;
          });
        });

        setByCategory(
          Object.entries(catMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
        );
        setByCondition(
          Object.entries(condMap).map(([key, value]) => ({
            name: conditionLabels[key] || key,
            value,
            color: conditionColors[key],
          }))
        );

        setRecentItems(
          items.slice(0, 5).map(it => ({
            id: it.id,
            name: it.name,
            category: it.category?.name || "-",
            unitCount: it.item_units?.length || 0,
            baikCount: it.item_units?.filter(u => u.condition === 'baik').length || 0,
            createdAt: it.created_at,
          }))
        );
      }

      setLoading(false);
    })();
  }, []);

  const statCards = [
    {
      label: "Total Barang",
      value: stats.items,
      icon: Package,
      hint: "Jenis barang terdaftar",
      trend: "+12%",
      trendUp: true,
      to: "/items",
      accent: "#D4AF37",
    },
    {
      label: "Total Unit Fisik",
      value: stats.units,
      icon: Boxes,
      hint: "Unit fisik keseluruhan",
      trend: "+5%",
      trendUp: true,
      to: "/items",
      accent: "#10B981",
    },
    {
      label: "Lokasi",
      value: stats.locations,
      icon: MapPin,
      hint: "Titik penyimpanan",
      trend: "—",
      trendUp: null,
      to: "/locations",
      accent: "#8B5CF6",
    },
    {
      label: "Riwayat",
      value: stats.movements,
      icon: Activity,
      hint: "Log pergerakan barang",
      trend: "+3",
      trendUp: true,
      to: "/activity",
      accent: "#F59E0B",
    },
  ];

  return (
    <div className={`mc-dash ${mounted ? "is-mounted" : ""}`}>
      <DashboardStyles />

      {/* ========== HERO ========== */}
      <div className="mc-hero">
        <div className="mc-hero-glow-1" />
        <div className="mc-hero-glow-2" />
        <div className="mc-hero-grid" />
        <div className="mc-hero-orb mc-hero-orb-gold" />
        <div className="mc-hero-orb mc-hero-orb-maroon" />

        <div className="mc-hero-inner">
          <div className="mc-hero-text">
            <p className="mc-hero-greet">
              <Sparkles size={14} /> {greeting}
            </p>
            <h2 className="mc-hero-name">{profile?.full_name || "Pengguna"}</h2>
            <div className="mc-hero-meta">
              <span><Clock size={13} /> {new Date().toLocaleDateString("id-ID", { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
              <span className="mc-hero-dot" />
              <span><CheckCircle2 size={13} /> Sistem berjalan normal</span>
            </div>
          </div>

          <div className="mc-hero-role">
            <RoleBadge role={profile?.role} size="lg" />
          </div>
        </div>
      </div>

      {/* ========== STATS ========== */}
      <div className="mc-stats-grid">
        {statCards.map((c, i) => (
          <Link
            key={i}
            to={c.to}
            className="mc-stat-card"
            style={{
              animationDelay: `${i * 0.08}s`,
              "--stat-accent": c.accent,
            }}
          >
            <div className="mc-stat-top">
              <div className="mc-stat-icon">
                <c.icon size={24} strokeWidth={1.8} />
              </div>
              {c.trendUp !== null && (
                <span className={`mc-stat-trend ${c.trendUp ? "up" : "flat"}`}>
                  {c.trendUp ? <TrendingUp size={12} /> : null}
                  {c.trend}
                </span>
              )}
            </div>
            <p className="mc-stat-label">{c.label}</p>
            <div className="mc-stat-value-row">
              <p className="mc-stat-value">{c.value}</p>
              <ArrowUpRight size={16} className="mc-stat-arrow" />
            </div>
            <p className="mc-stat-hint">{c.hint}</p>
          </Link>
        ))}
      </div>

      {/* ========== CHARTS ========== */}
      <div className="mc-charts-grid">
        {/* Bar Chart */}
        <div className="mc-card mc-card-bar">
          <div className="mc-card-head">
            <div>
              <h3 className="mc-card-title">
                <TrendingUp size={18} /> Distribusi Kategori
              </h3>
              <p className="mc-card-sub">Jumlah barang per kategori</p>
            </div>
            <Link to="/categories" className="mc-card-link">
              Kelola <ChevronRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div className="mc-chart-skeleton" />
          ) : byCategory.length === 0 ? (
            <div className="mc-empty">Belum ada data kategori.</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={byCategory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D4AF37" stopOpacity={1} />
                    <stop offset="100%" stopColor="#B91C1C" stopOpacity={0.85} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.5} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                />
                <RechartsTooltip
                  cursor={{ fill: 'var(--gold-soft)' }}
                  contentStyle={{
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface)',
                    color: 'var(--text-main)',
                    boxShadow: '0 8px 24px -6px rgba(0,0,0,0.15)',
                  }}
                />
                <Bar dataKey="value" fill="url(#barGrad)" radius={[8, 8, 0, 0]} barSize={38} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Donut Chart */}
        <div className="mc-card">
          <div className="mc-card-head">
            <div>
              <h3 className="mc-card-title">
                <Layers size={18} /> Kondisi Unit
              </h3>
              <p className="mc-card-sub">Berdasarkan total fisik barang</p>
            </div>
          </div>

          {loading ? (
            <div className="mc-chart-skeleton" />
          ) : byCondition.length === 0 ? (
            <div className="mc-empty">Belum ada data unit.</div>
          ) : (
            <div className="mc-donut-wrap">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={byCondition}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={92}
                    paddingAngle={4}
                    stroke="none"
                  >
                    {byCondition.map((entry, i) => (
                      <Cell key={i} fill={entry.color || COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--surface)',
                      color: 'var(--text-main)',
                      boxShadow: '0 8px 24px -6px rgba(0,0,0,0.15)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="mc-donut-center">
                <p className="mc-donut-pct">{baikPercent}%</p>
                <p className="mc-donut-lbl">Kondisi Baik</p>
              </div>

              <div className="mc-donut-legend">
                {byCondition.map((c, i) => (
                  <div key={i} className="mc-legend-item">
                    <span className="mc-legend-dot" style={{ background: c.color || COLORS[i % COLORS.length] }} />
                    <span className="mc-legend-name">{c.name}</span>
                    <span className="mc-legend-val">{c.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========== RECENT ========== */}
      <div className="mc-card">
        <div className="mc-card-head">
          <div>
            <h3 className="mc-card-title">
              <Package size={18} /> Barang Terbaru
            </h3>
            <p className="mc-card-sub">5 barang terakhir ditambahkan</p>
          </div>
          <Link to="/items" className="mc-card-link">
            Lihat Semua <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="mc-recent-skeleton">
            {[1, 2, 3].map(i => <div key={i} className="mc-skel-row" />)}
          </div>
        ) : recentItems.length === 0 ? (
          <div className="mc-empty" style={{ height: 120 }}>Belum ada barang.</div>
        ) : (
          <div className="mc-recent-list">
            {recentItems.map((it) => {
              const goodPercent = it.unitCount ? Math.round((it.baikCount / it.unitCount) * 100) : 0;
              return (
                <Link to={`/items/${it.id}`} key={it.id} className="mc-recent-item">
                  <div className="mc-recent-icon">
                    <Package size={18} />
                  </div>
                  <div className="mc-recent-body">
                    <p className="mc-recent-name">{it.name}</p>
                    <p className="mc-recent-cat">{it.category}</p>
                  </div>
                  <div className="mc-recent-progress">
                    <div className="mc-recent-progress-bar">
                      <div
                        className="mc-recent-progress-fill"
                        style={{
                          width: `${goodPercent}%`,
                          background: goodPercent >= 70 ? '#10B981' : goodPercent >= 40 ? '#F59E0B' : '#EF4444'
                        }}
                      />
                    </div>
                    <p className="mc-recent-progress-lbl">{goodPercent}% baik</p>
                  </div>
                  <div className="mc-recent-units">
                    <Box size={13} />
                    <span>{it.unitCount}</span>
                  </div>
                  <ChevronRight size={16} className="mc-recent-arrow" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   Styles — Tema Landing (Gold/Maroon/Navy)
============================================================ */
function DashboardStyles() {
  return (
    <style>{`
      .mc-dash {
        color: var(--text-main);
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        width: 100%;
        padding-bottom: 2.5rem;
        position: relative;
      }

      /* Stagger animasi masuk */
      .mc-dash > * {
        opacity: 0;
        transform: translateY(14px);
        transition: opacity 0.5s var(--ease-out, cubic-bezier(0.16,1,0.3,1)),
                    transform 0.5s var(--ease-out, cubic-bezier(0.16,1,0.3,1));
      }
      .mc-dash.is-mounted > * { opacity: 1; transform: translateY(0); }
      .mc-dash.is-mounted > *:nth-child(1) { transition-delay: 0s; }
      .mc-dash.is-mounted > *:nth-child(2) { transition-delay: 0.08s; }
      .mc-dash.is-mounted > *:nth-child(3) { transition-delay: 0.16s; }
      .mc-dash.is-mounted > *:nth-child(4) { transition-delay: 0.24s; }

      /* ============ HERO — Tema Landing ============ */
      .mc-hero {
        position: relative;
        background: linear-gradient(135deg, #16213E 0%, #0F172A 55%, #7F1D1D 100%);
        border-radius: 24px;
        padding: 2.5rem;
        color: white;
        overflow: hidden;
        box-shadow: 0 20px 40px -12px rgba(22, 33, 62, 0.4);
        isolation: isolate;
      }
      .mc-hero-glow-1 {
        position: absolute; top: -50%; right: -10%;
        width: 420px; height: 420px; border-radius: 50%;
        background: radial-gradient(circle, rgba(212, 175, 55, 0.25) 0%, transparent 70%);
        filter: blur(40px);
        pointer-events: none;
        animation: hero-float 8s ease-in-out infinite;
      }
      .mc-hero-glow-2 {
        position: absolute; bottom: -60%; left: -10%;
        width: 380px; height: 380px; border-radius: 50%;
        background: radial-gradient(circle, rgba(185, 28, 28, 0.25) 0%, transparent 70%);
        filter: blur(50px);
        pointer-events: none;
        animation: hero-float 10s ease-in-out infinite reverse;
      }
      @keyframes hero-float {
        0%, 100% { transform: translate(0, 0) scale(1); }
        50% { transform: translate(-20px, 20px) scale(1.1); }
      }
      .mc-hero-grid {
        position: absolute; inset: 0;
        background-image:
          linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
        background-size: 40px 40px;
        mask-image: radial-gradient(ellipse at 70% 30%, black 20%, transparent 60%);
        -webkit-mask-image: radial-gradient(ellipse at 70% 30%, black 20%, transparent 60%);
        pointer-events: none;
      }
      .mc-hero-orb {
        position: absolute;
        border-radius: 50%;
        filter: blur(60px);
        pointer-events: none;
        opacity: 0.5;
      }
      .mc-hero-orb-gold {
        width: 300px; height: 300px;
        top: -100px; right: 10%;
        background: radial-gradient(circle, rgba(212, 175, 55, 0.4) 0%, transparent 70%);
        animation: orb-float 12s ease-in-out infinite;
      }
      .mc-hero-orb-maroon {
        width: 260px; height: 260px;
        bottom: -80px; left: 20%;
        background: radial-gradient(circle, rgba(185, 28, 28, 0.35) 0%, transparent 70%);
        animation: orb-float 10s ease-in-out infinite reverse;
      }
      @keyframes orb-float {
        0%, 100% { transform: translate(0, 0) scale(1); }
        50% { transform: translate(30px, -20px) scale(1.15); }
      }
      .mc-hero-inner {
        position: relative; z-index: 2;
        display: flex; flex-direction: column; gap: 1.5rem;
        align-items: flex-start; justify-content: space-between;
      }
      @media (min-width: 768px) {
        .mc-hero-inner { flex-direction: row; align-items: center; }
      }
      .mc-hero-text { min-width: 0; }
      .mc-hero-greet {
        display: flex; align-items: center; gap: 0.4rem;
        font-size: 0.8rem; font-weight: 700;
        letter-spacing: 0.08em; text-transform: uppercase;
        color: #FDE68A; margin-bottom: 0.6rem;
      }
      .mc-hero-name {
        font-family: 'Playfair Display', Georgia, serif;
        font-size: 2.1rem; font-weight: 800;
        letter-spacing: -0.02em; line-height: 1.15;
        color: white;
      }
      @media (min-width: 768px) { .mc-hero-name { font-size: 2.5rem; } }
      .mc-hero-meta {
        display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem;
        margin-top: 0.9rem;
        font-size: 0.82rem; color: #FDE68A;
      }
      .mc-hero-meta span {
        display: inline-flex; align-items: center; gap: 0.35rem;
      }
      .mc-hero-dot {
        width: 4px; height: 4px; border-radius: 50%; background: rgba(255,255,255,0.4);
      }
      .mc-hero-role {
        background: rgba(255,255,255,0.12);
        backdrop-filter: blur(12px);
        padding: 0.6rem 1.1rem;
        border-radius: 999px;
        border: 1px solid rgba(212, 175, 55, 0.3);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.15);
        flex-shrink: 0;
      }

      /* ============ STATS ============ */
      .mc-stats-grid {
        display: grid; gap: 1.1rem;
        grid-template-columns: repeat(1, 1fr);
      }
      @media (min-width: 640px) { .mc-stats-grid { grid-template-columns: repeat(2, 1fr); } }
      @media (min-width: 1024px) { .mc-stats-grid { grid-template-columns: repeat(4, 1fr); } }

      .mc-stat-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 18px;
        padding: 1.4rem;
        text-decoration: none; color: inherit;
        display: flex; flex-direction: column; gap: 0.55rem;
        transition: all 0.3s var(--ease-spring, cubic-bezier(0.34,1.56,0.64,1));
        position: relative;
        overflow: hidden;
        animation: stat-in 0.5s var(--ease-out, cubic-bezier(0.16,1,0.3,1)) both;
      }
      @keyframes stat-in {
        from { opacity: 0; transform: translateY(12px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .mc-stat-card::before {
        content: '';
        position: absolute; top: 0; left: 0; right: 0; height: 3px;
        background: linear-gradient(90deg, transparent, var(--stat-accent, var(--gold)), transparent);
        opacity: 0;
        transition: opacity 0.3s;
      }
      .mc-stat-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 16px 32px -12px rgba(0,0,0,0.15);
        border-color: color-mix(in srgb, var(--stat-accent, var(--gold)) 40%, var(--border));
      }
      .mc-stat-card:hover::before { opacity: 1; }

      .mc-stat-top {
        display: flex; align-items: flex-start; justify-content: space-between;
        margin-bottom: 0.25rem;
      }
      .mc-stat-icon {
        width: 46px; height: 46px;
        border-radius: 12px;
        background: color-mix(in srgb, var(--stat-accent, var(--gold)) 12%, transparent);
        color: var(--stat-accent, var(--gold));
        border: 1px solid color-mix(in srgb, var(--stat-accent, var(--gold)) 30%, transparent);
        display: flex; align-items: center; justify-content: center;
        transition: transform 0.3s var(--ease-spring, cubic-bezier(0.34,1.56,0.64,1));
      }
      .mc-stat-card:hover .mc-stat-icon { transform: scale(1.1) rotate(-4deg); }

      .mc-stat-trend {
        display: inline-flex; align-items: center; gap: 0.2rem;
        font-size: 0.68rem; font-weight: 700;
        padding: 0.25rem 0.55rem;
        border-radius: 999px;
        letter-spacing: 0.02em;
      }
      .mc-stat-trend.up { background: rgba(16,185,129,0.12); color: #059669; }
      .mc-stat-trend.flat { background: var(--background); color: var(--text-muted); }
      .dark .mc-stat-trend.up { background: rgba(16,185,129,0.18); color: #34D399; }

      .mc-stat-label {
        font-size: 0.72rem; font-weight: 700;
        letter-spacing: 0.08em; text-transform: uppercase;
        color: var(--text-muted);
      }
      .mc-stat-value-row {
        display: flex; align-items: center; justify-content: space-between;
        gap: 0.5rem;
      }
      .mc-stat-value {
        font-family: 'Playfair Display', Georgia, serif;
        font-size: 2rem; font-weight: 800;
        letter-spacing: -0.03em;
        color: var(--text-main);
        line-height: 1.1;
      }
      .mc-stat-arrow {
        color: var(--text-muted); opacity: 0;
        transition: all 0.3s;
        transform: translateX(-4px);
      }
      .mc-stat-card:hover .mc-stat-arrow {
        opacity: 1; transform: translateX(0);
        color: var(--stat-accent, var(--gold));
      }
      .mc-stat-hint {
        font-size: 0.74rem; color: var(--text-muted);
      }

      /* ============ CHARTS ============ */
      .mc-charts-grid {
        display: grid; gap: 1.25rem;
        grid-template-columns: 1fr;
      }
      @media (min-width: 1024px) {
        .mc-charts-grid { grid-template-columns: 2fr 1fr; }
      }

      .mc-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 18px;
        padding: 1.5rem;
        box-shadow: 0 1px 3px rgba(0,0,0,0.03);
        transition: box-shadow 0.3s;
      }
      .mc-card:hover { box-shadow: 0 8px 24px -8px rgba(0,0,0,0.08); }

      .mc-card-head {
        display: flex; justify-content: space-between; align-items: flex-start;
        gap: 1rem; margin-bottom: 1.25rem;
      }
      .mc-card-title {
        font-family: 'Playfair Display', Georgia, serif;
        font-size: 1.05rem; font-weight: 700;
        color: var(--text-main);
        display: flex; align-items: center; gap: 0.5rem;
        margin-bottom: 0.25rem;
      }
      .mc-card-title svg { color: var(--gold); }
      .mc-card-sub {
        font-size: 0.78rem; color: var(--text-muted);
      }
      .mc-card-link {
        display: inline-flex; align-items: center; gap: 0.25rem;
        font-size: 0.8rem; font-weight: 600;
        color: var(--gold);
        text-decoration: none;
        padding: 0.35rem 0.6rem;
        border-radius: 8px;
        transition: all 0.2s;
      }
      .mc-card-link:hover { background: var(--gold-soft); }

      .mc-chart-skeleton {
        height: 280px; border-radius: 12px;
        background: var(--background);
        animation: pulse 1.6s ease-in-out infinite;
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      .mc-empty {
        height: 280px;
        display: flex; align-items: center; justify-content: center;
        color: var(--text-muted); font-size: 0.88rem;
      }

      /* Donut */
      .mc-donut-wrap { position: relative; }
      .mc-donut-center {
        position: absolute; top: 110px; left: 50%; transform: translate(-50%, -50%);
        text-align: center; pointer-events: none;
      }
      .mc-donut-pct {
        font-family: 'Playfair Display', Georgia, serif;
        font-size: 1.85rem; font-weight: 800;
        color: var(--text-main);
        letter-spacing: -0.03em;
        line-height: 1;
      }
      .mc-donut-lbl {
        font-size: 0.68rem; font-weight: 700;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin-top: 0.25rem;
      }
      .mc-donut-legend {
        display: flex; flex-direction: column; gap: 0.4rem;
        margin-top: 0.75rem;
      }
      .mc-legend-item {
        display: flex; align-items: center; gap: 0.5rem;
        font-size: 0.82rem;
        padding: 0.35rem 0;
      }
      .mc-legend-dot {
        width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0;
      }
      .mc-legend-name {
        flex: 1; color: var(--text-muted); font-weight: 500;
      }
      .mc-legend-val {
        font-weight: 700; color: var(--text-main);
        font-variant-numeric: tabular-nums;
      }

      /* ============ RECENT ============ */
      .mc-recent-list { display: flex; flex-direction: column; }
      .mc-recent-item {
        display: flex; align-items: center; gap: 0.9rem;
        padding: 0.9rem 0.75rem;
        border-radius: 12px;
        text-decoration: none; color: inherit;
        transition: all 0.2s;
        border-bottom: 1px solid var(--border);
      }
      .mc-recent-item:last-child { border-bottom: none; }
      .mc-recent-item:hover {
        background: var(--gold-soft);
        transform: translateX(2px);
      }
      .mc-recent-icon {
        width: 42px; height: 42px;
        border-radius: 10px;
        background: var(--background);
        border: 1px solid var(--border);
        display: flex; align-items: center; justify-content: center;
        color: var(--text-muted);
        flex-shrink: 0;
        transition: all 0.2s;
      }
      .mc-recent-item:hover .mc-recent-icon {
        color: var(--gold);
        border-color: var(--gold-soft);
        background: var(--gold-soft);
      }
      .mc-recent-body { flex: 1; min-width: 0; }
      .mc-recent-name {
        font-weight: 600; font-size: 0.92rem;
        color: var(--text-main);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .mc-recent-cat {
        font-size: 0.74rem; color: var(--text-muted);
        margin-top: 1px;
      }
      .mc-recent-progress {
        width: 110px; flex-shrink: 0;
        display: flex; flex-direction: column; gap: 0.25rem;
      }
      @media (max-width: 640px) { .mc-recent-progress { display: none; } }
      .mc-recent-progress-bar {
        height: 5px; border-radius: 3px;
        background: var(--border);
        overflow: hidden;
      }
      .mc-recent-progress-fill {
        height: 100%; border-radius: 3px;
        transition: width 0.5s ease;
      }
      .mc-recent-progress-lbl {
        font-size: 0.68rem; font-weight: 600;
        color: var(--text-muted);
      }
      .mc-recent-units {
        display: inline-flex; align-items: center; gap: 0.25rem;
        background: var(--gold-soft);
        color: var(--gold);
        border: 1px solid color-mix(in srgb, var(--gold) 30%, transparent);
        padding: 0.3rem 0.6rem;
        border-radius: 8px;
        font-size: 0.78rem; font-weight: 700;
        flex-shrink: 0;
      }
      .mc-recent-arrow {
        color: var(--text-muted);
        flex-shrink: 0;
        transition: all 0.2s;
      }
      .mc-recent-item:hover .mc-recent-arrow {
        color: var(--gold);
        transform: translateX(2px);
      }
      .mc-recent-skeleton {
        display: flex; flex-direction: column; gap: 0.75rem;
        padding: 0.5rem 0;
      }
      .mc-skel-row {
        height: 58px; border-radius: 10px;
        background: var(--background);
        animation: pulse 1.6s ease-in-out infinite;
      }

      @media (max-width: 640px) {
        .mc-hero { padding: 1.75rem; border-radius: 18px; }
        .mc-hero-name { font-size: 1.65rem; }
        .mc-stat-value { font-size: 1.65rem; }
        .mc-card { padding: 1.25rem; }
      }
    `}</style>
  );
}