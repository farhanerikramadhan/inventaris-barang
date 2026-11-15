import { useState, useCallback, useRef } from "react";
import {
  ScanLine, AlertCircle, CheckCircle2, X,
  Copy, Check, History, Trash2, Bug, FileText, Sparkles
} from "lucide-react";
import QRScanner from "../components/qr/QRScanner";

export default function Scan() {
  const [result, setResult] = useState("");
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [debugLog, setDebugLog] = useState([]);
  const [showDebug, setShowDebug] = useState(false);

  const lastResultRef = useRef({ text: "", at: 0 });

  const handleResult = useCallback((rawText) => {
    const text = String(rawText ?? "").trim();
    if (!text) {
      setError("QR tidak terbaca.");
      setDebugLog((prev) => [...prev, "❌ Teks kosong"]);
      return;
    }

    const now = Date.now();
    const last = lastResultRef.current;
    if (text === last.text && now - last.at < 1500) {
      setDebugLog((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString("id-ID")}] ⏭️ DILEWATI (duplikat): ${JSON.stringify(text)}`,
      ]);
      return;
    }
    lastResultRef.current = { text, at: now };

    setDebugLog((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString("id-ID")}] DITERIMA: ${JSON.stringify(text)}`,
    ]);

    setError("");
    setResult(text);
    setCopied(false);
    setHistory((prev) => [text, ...prev.filter((t) => t !== text)].slice(0, 20));
    setDebugLog((prev) => [...prev, `✅ Result SET: ${JSON.stringify(text)}`]);
  }, []);

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Gagal copy.");
    }
  };

  const clearResult = () => { setResult(""); setCopied(false); setError(""); };
  const clearHistory = () => setHistory([]);

  return (
    <div className="scan-page">
      <PageStyles />

      {/* HEADER */}
      <header className="scan-header">
        <div className="scan-header-left">
          <div className="scan-badge">
            <ScanLine size={22} />
          </div>
          <div>
            <h1 className="scan-title">
              Scan QR Code
              <Sparkles size={14} className="scan-title-spark" />
            </h1>
            <p className="scan-subtitle">Arahkan kamera ke QR code — hasil muncul otomatis</p>
          </div>
        </div>

        <button
          onClick={() => setShowDebug((v) => !v)}
          className={`scan-debug-toggle ${showDebug ? "is-active" : ""}`}
          title="Debug & Test"
        >
          <Bug size={13} />
          <span>Debug</span>
        </button>
      </header>

      {/* DEBUG PANEL */}
      {showDebug && (
        <div className="scan-debug-panel">
          <div className="scan-debug-top">
            <strong>🐛 Debug Panel</strong>
            <div className="scan-debug-actions">
              <button
                onClick={() => handleResult("MEJA-001")}
                className="scan-mini-btn"
                title="Test tanpa kamera"
              >
                <FileText size={11} /> Test
              </button>
              <button onClick={() => setDebugLog([])} className="scan-mini-btn">
                Clear
              </button>
            </div>
          </div>
          <div className="scan-debug-stats">
            <div>
              <span className="scan-stat-label">result</span>
              <code>{JSON.stringify(result)}</code>
            </div>
            <div>
              <span className="scan-stat-label">len</span>
              <code>{result.length}</code>
            </div>
            <div>
              <span className="scan-stat-label">history</span>
              <code>{history.length}</code>
            </div>
            <div>
              <span className="scan-stat-label">error</span>
              <code>{JSON.stringify(error)}</code>
            </div>
          </div>
          <pre className="scan-debug-log">
            {debugLog.length === 0
              ? "(belum ada log — scan QR atau klik Test)"
              : debugLog.join("\n")}
          </pre>
        </div>
      )}

      {/* SCANNER CARD */}
      <section className="scan-scanner-card">
        <QRScanner onResult={handleResult} />
      </section>

      {/* ERROR */}
      {error && (
        <div className="scan-error">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={() => setError("")}>
            <X size={12} />
          </button>
        </div>
      )}

      {/* RESULT */}
      {result ? (
        <section className="scan-result-card">
          <div className="scan-result-top">
            <div className="scan-result-icon">
              <CheckCircle2 size={20} />
            </div>
            <div className="scan-result-title-wrap">
              <p className="scan-result-eyebrow">Hasil Scan</p>
              <p className="scan-result-title">QR berhasil dibaca</p>
            </div>
            <button onClick={clearResult} className="scan-result-close" title="Tutup">
              <X size={14} />
            </button>
          </div>

          <pre className="scan-result-pre">{result}</pre>

          <div className="scan-result-actions">
            <button onClick={handleCopy} className={`scan-copy-btn ${copied ? "is-copied" : ""}`}>
              {copied ? <><Check size={14} /> Tersalin</> : <><Copy size={14} /> Salin Teks</>}
            </button>
          </div>

          <p className="scan-result-meta">{result.length} karakter</p>
        </section>
      ) : (
        !error && (
          <div className="scan-empty">
            <ScanLine size={28} className="scan-empty-icon" />
            <p>Belum ada hasil scan</p>
            <span>Arahkan kamera ke QR code untuk memulai</span>
          </div>
        )
      )}

      {/* HISTORY */}
      {history.length > 0 && (
        <section className="scan-history">
          <div className="scan-history-top">
            <div className="scan-history-title">
              <History size={14} />
              <span>Riwayat</span>
              <span className="scan-history-count">{history.length}</span>
            </div>
            <button onClick={clearHistory} className="scan-mini-btn">
              <Trash2 size={12} /> Hapus
            </button>
          </div>

          <div className="scan-history-list">
            {history.map((text, i) => (
              <button
                key={i}
                onClick={() => setResult(text)}
                className={`scan-history-item ${result === text ? "is-active" : ""}`}
              >
                <span className="scan-history-index">#{history.length - i}</span>
                <span className="scan-history-text">{text}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function PageStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800&family=JetBrains+Mono:wght@500;600;700&display=swap');

      .scan-page {
        max-width: 640px; margin: 0 auto;
        padding: 1.75rem 0 3rem; color: var(--text-main);
      }

      /* ===== HEADER ===== */
      .scan-header {
        display: flex; align-items: flex-start; justify-content: space-between;
        gap: 1rem; margin-bottom: 1.25rem;
      }
      .scan-header-left {
        display: flex; align-items: center; gap: 0.85rem;
      }
      .scan-badge {
        width: 48px; height: 48px; border-radius: 14px; flex-shrink: 0;
        background: linear-gradient(135deg, var(--gold), var(--maroon-light));
        color: white;
        display: inline-flex; align-items: center; justify-content: center;
        box-shadow:
          0 6px 20px -6px rgba(201,162,39,0.55),
          inset 0 1px 0 rgba(255,255,255,0.25);
      }
      .scan-title {
        display: flex; align-items: center; gap: 0.5rem;
        font-family: 'Playfair Display', serif; font-size: 1.7rem;
        font-weight: 800; margin: 0 0 0.25rem; line-height: 1.15;
        letter-spacing: -0.01em;
      }
      .scan-title-spark {
        color: var(--gold);
        animation: scan-twinkle 2.5s ease-in-out infinite;
      }
      @keyframes scan-twinkle {
        0%, 100% { opacity: 0.5; transform: scale(0.9) rotate(0deg); }
        50% { opacity: 1; transform: scale(1.1) rotate(15deg); }
      }
      .scan-subtitle {
        margin: 0; font-size: 0.85rem; color: var(--text-muted); line-height: 1.4;
      }

      /* ===== DEBUG TOGGLE ===== */
      .scan-debug-toggle {
        display: inline-flex; align-items: center; gap: 0.35rem;
        padding: 0.45rem 0.75rem; border-radius: 10px;
        background: var(--surface); border: 1px solid var(--border);
        color: var(--text-muted); font-size: 0.75rem;
        font-weight: 700; cursor: pointer; font-family: inherit;
        transition: all 0.2s; white-space: nowrap;
      }
      .scan-debug-toggle:hover {
        color: var(--gold);
        border-color: color-mix(in srgb, var(--gold) 40%, var(--border));
      }
      .scan-debug-toggle.is-active {
        color: var(--gold); border-color: var(--gold);
        background: var(--gold-soft);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--gold) 12%, transparent);
      }

      /* ===== DEBUG PANEL ===== */
      .scan-debug-panel {
        background: var(--surface); border: 1px solid var(--border);
        border-radius: 14px; padding: 0.85rem; margin-bottom: 1rem;
        font-size: 0.72rem;
        animation: scan-fade-in 0.3s ease-out;
      }
      .scan-debug-top {
        display: flex; justify-content: space-between; align-items: center;
        margin-bottom: 0.6rem;
      }
      .scan-debug-top > strong {
        font-size: 0.78rem; letter-spacing: 0.01em;
      }
      .scan-debug-actions { display: flex; gap: 0.35rem; }

      .scan-mini-btn {
        display: inline-flex; align-items: center; gap: 0.3rem;
        padding: 0.3rem 0.55rem; border-radius: 7px;
        background: var(--surface); border: 1px solid var(--border);
        color: var(--text-muted); font-size: 0.7rem;
        font-weight: 700; cursor: pointer; font-family: inherit;
        transition: all 0.2s;
      }
      .scan-mini-btn:hover {
        color: var(--gold); border-color: color-mix(in srgb, var(--gold) 40%, var(--border));
      }

      .scan-debug-stats {
        display: grid; grid-template-columns: 1fr 1fr; gap: 0.35rem 0.85rem;
        margin-bottom: 0.6rem;
      }
      .scan-debug-stats > div {
        display: flex; align-items: center; gap: 0.4rem; min-width: 0;
      }
      .scan-stat-label {
        font-weight: 800; font-size: 0.62rem; text-transform: uppercase;
        letter-spacing: 0.04em; color: var(--text-muted); flex-shrink: 0;
      }
      .scan-debug-stats code {
        font-family: 'JetBrains Mono', monospace;
        background: var(--background); padding: 0.1rem 0.35rem;
        border-radius: 4px; font-size: 0.7rem;
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        border: 1px solid var(--border);
      }
      .scan-debug-log {
        background: var(--background); border: 1px solid var(--border);
        border-radius: 8px; padding: 0.55rem 0.7rem;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.68rem; line-height: 1.55;
        max-height: 160px; overflow: auto; margin: 0;
        white-space: pre-wrap; word-break: break-all;
        color: var(--text-main);
      }

      /* ===== SCANNER CARD ===== */
      .scan-scanner-card {
        background: var(--surface); border: 1px solid var(--border);
        border-radius: 22px; padding: 1.1rem; margin-bottom: 1.1rem;
        box-shadow: 0 1px 3px rgba(0,0,0,0.02), 0 8px 24px -12px rgba(0,0,0,0.08);
      }

      /* ===== ERROR ===== */
      .scan-error {
        display: flex; gap: 0.5rem; align-items: center;
        padding: 0.7rem 0.9rem;
        background: rgba(239,68,68,0.08);
        border: 1px solid rgba(239,68,68,0.3);
        border-radius: 12px; color: #DC2626;
        font-size: 0.8rem; margin-bottom: 1rem;
        animation: scan-fade-in 0.3s ease-out;
      }
      .scan-error > span { flex: 1; }
      .scan-error > button {
        border: none; background: transparent; cursor: pointer;
        color: inherit; padding: 0.2rem; border-radius: 5px;
        display: inline-flex;
      }
      .scan-error > button:hover { background: rgba(220,38,38,0.1); }

      /* ===== RESULT CARD ===== */
      .scan-result-card {
        background: var(--surface); border: 1px solid var(--border);
        border-radius: 18px; padding: 1.1rem; margin-bottom: 1rem;
        animation: scan-result-in 0.45s cubic-bezier(0.34,1.56,0.64,1);
        box-shadow:
          0 1px 3px rgba(0,0,0,0.02),
          0 12px 32px -16px rgba(16,185,129,0.25);
        border-color: color-mix(in srgb, #10B981 25%, var(--border));
      }
      @keyframes scan-result-in {
        from { opacity: 0; transform: translateY(-10px) scale(0.97); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }

      .scan-result-top {
        display: flex; align-items: center; gap: 0.7rem; margin-bottom: 0.85rem;
      }
      .scan-result-icon {
        width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
        background: rgba(16,185,129,0.12); color: #10B981;
        border: 1px solid rgba(16,185,129,0.3);
        display: flex; align-items: center; justify-content: center;
      }
      .scan-result-title-wrap { flex: 1; min-width: 0; }
      .scan-result-eyebrow {
        font-size: 0.62rem; font-weight: 800; color: var(--text-muted);
        text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 0.1rem;
      }
      .scan-result-title {
        font-family: 'Playfair Display', serif; font-size: 1rem;
        font-weight: 800; margin: 0;
      }
      .scan-result-close {
        width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0;
        border: 1px solid var(--border); background: var(--surface);
        color: var(--text-muted); cursor: pointer;
        display: inline-flex; align-items: center; justify-content: center;
        transition: all 0.2s;
      }
      .scan-result-close:hover {
        color: #DC2626; border-color: rgba(220,38,38,0.35);
        background: rgba(220,38,38,0.06);
      }

      .scan-result-pre {
        background: var(--background);
        border: 1px solid var(--border);
        border-left: 3px solid var(--gold);
        border-radius: 10px;
        padding: 0.9rem 1rem;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.9rem; font-weight: 600;
        color: var(--text-main);
        white-space: pre-wrap; word-break: break-all;
        margin: 0 0 0.85rem;
        max-height: 220px; overflow: auto;
        line-height: 1.65;
      }

      .scan-result-actions { display: flex; gap: 0.5rem; margin-bottom: 0.55rem; }
      .scan-copy-btn {
        flex: 1; padding: 0.6rem 1rem; border-radius: 10px;
        font-size: 0.82rem; font-weight: 700; font-family: inherit;
        cursor: pointer; transition: all 0.2s;
        border: 1px solid var(--border);
        background: var(--surface); color: var(--text-main);
        display: flex; align-items: center; justify-content: center; gap: 0.4rem;
      }
      .scan-copy-btn:hover {
        border-color: color-mix(in srgb, var(--gold) 40%, var(--border));
        background: var(--gold-soft);
      }
      .scan-copy-btn.is-copied {
        background: rgba(16,185,129,0.1);
        border-color: rgba(16,185,129,0.35);
        color: #059669;
      }

      .scan-result-meta {
        text-align: right; font-size: 0.7rem;
        color: var(--text-muted); margin: 0;
      }

      /* ===== EMPTY ===== */
      .scan-empty {
        text-align: center; padding: 1.75rem 1rem;
        background: var(--surface);
        border: 1.5px dashed color-mix(in srgb, var(--border) 80%, var(--gold));
        border-radius: 16px; color: var(--text-muted);
        margin-bottom: 1rem;
        display: flex; flex-direction: column; align-items: center; gap: 0.4rem;
      }
      .scan-empty-icon { color: color-mix(in srgb, var(--gold) 55%, var(--text-muted)); }
      .scan-empty p { margin: 0.3rem 0 0; font-size: 0.88rem; font-weight: 700; color: var(--text-main); }
      .scan-empty span { font-size: 0.78rem; }

      /* ===== HISTORY ===== */
      .scan-history {
        background: var(--surface); border: 1px solid var(--border);
        border-radius: 16px; padding: 0.95rem;
      }
      .scan-history-top {
        display: flex; justify-content: space-between; align-items: center;
        margin-bottom: 0.7rem;
      }
      .scan-history-title {
        display: flex; align-items: center; gap: 0.45rem;
        font-size: 0.8rem; font-weight: 800;
      }
      .scan-history-title > svg { color: var(--gold); }
      .scan-history-count {
        font-size: 0.65rem; font-weight: 800; color: var(--gold);
        background: var(--gold-soft); padding: 0.1rem 0.45rem;
        border-radius: 999px; border: 1px solid color-mix(in srgb, var(--gold) 30%, transparent);
      }

      .scan-history-list {
        display: flex; flex-direction: column; gap: 0.35rem;
        max-height: 220px; overflow: auto;
      }
      .scan-history-item {
        display: flex; align-items: center; gap: 0.55rem;
        padding: 0.55rem 0.7rem; border-radius: 9px;
        background: var(--background); border: 1px solid var(--border);
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.74rem; font-weight: 600; color: var(--text-main);
        cursor: pointer; text-align: left; width: 100%;
        transition: all 0.2s;
      }
      .scan-history-item:hover {
        border-color: color-mix(in srgb, var(--gold) 35%, var(--border));
        transform: translateX(2px);
      }
      .scan-history-item.is-active {
        background: var(--gold-soft);
        border-color: var(--gold);
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--gold) 15%, transparent);
      }
      .scan-history-index {
        font-size: 0.66rem; font-weight: 800; color: var(--gold);
        background: color-mix(in srgb, var(--gold) 12%, transparent);
        padding: 0.1rem 0.4rem; border-radius: 5px;
        flex-shrink: 0;
      }
      .scan-history-text {
        flex: 1; min-width: 0;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }

      /* ===== SHARED ===== */
      @keyframes scan-fade-in {
        from { opacity: 0; transform: translateY(-6px); }
        to { opacity: 1; transform: translateY(0); }
      }

      /* ===== RESPONSIVE ===== */
      @media (max-width: 520px) {
        .scan-page { padding-top: 1.25rem; }
        .scan-title { font-size: 1.4rem; }
        .scan-badge { width: 42px; height: 42px; border-radius: 12px; }
        .scan-subtitle { font-size: 0.8rem; }
        .scan-result-pre { font-size: 0.84rem; padding: 0.8rem 0.9rem; }
        .scan-debug-stats { grid-template-columns: 1fr; }
      }
    `}</style>
  );
}