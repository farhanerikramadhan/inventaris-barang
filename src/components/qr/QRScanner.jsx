import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  Camera, CameraOff, RefreshCw, ShieldCheck, AlertCircle,
  ScanLine, Loader2, CheckCircle2, X
} from "lucide-react";

export default function QRScanner({ onResult, onError }) {
  const scannerRef = useRef(null);
  const mountedRef = useRef(false);
  const startingRef = useRef(false);

  const hasResultRef = useRef(false);
  const isStoppingRef = useRef(false);

  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [cameras, setCameras] = useState([]);
  const [cameraId, setCameraId] = useState("");

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner) {
        scanner.stop().catch(() => {}).finally(() => scanner.clear().catch(() => {}));
      }
    };
  }, []);

  const getErrorMessage = (err) => {
    const name = err?.name || "";
    const message = err?.message || "";
    if (name === "NotAllowedError" || name === "PermissionDeniedError")
      return "Akses kamera ditolak. Izinkan kamera di pengaturan browser.";
    if (name === "NotFoundError") return "Kamera tidak ditemukan.";
    if (name === "NotReadableError") return "Kamera sedang digunakan aplikasi lain.";
    if (name === "OverconstrainedError") return "Kamera tidak tersedia.";
    if (!window.isSecureContext) return "Kamera butuh HTTPS atau localhost.";
    return message || "Gagal mengakses kamera.";
  };

  const startCamera = async (selectedId = "") => {
    if (startingRef.current) return;
    startingRef.current = true;
    hasResultRef.current = false;
    isStoppingRef.current = false;
    setError("");
    setStatus("loading");

    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error("Browser tidak mendukung akses kamera.");

      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      stream.getTracks().forEach((t) => t.stop());
      if (!mountedRef.current) return;

      const devices = await Html5Qrcode.getCameras();
      if (!devices.length) throw new Error("Tidak ada kamera.");
      setCameras(devices);

      const chosen =
        selectedId ||
        cameraId ||
        devices.find((c) => /back|rear|environment/i.test(c.label))?.id ||
        devices[0].id;
      setCameraId(chosen);

      const container = document.getElementById("qr-reader");
      if (container) container.innerHTML = "";

      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        chosen,
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1 },
        (decodedText) => {
          if (hasResultRef.current || isStoppingRef.current) return;
          hasResultRef.current = true;
          isStoppingRef.current = true;

          setStatus("success");
          if (typeof onResult === "function") {
            try { onResult(decodedText); } catch (e) { console.error(e); }
          }
          scanner.stop().catch(() => {}).finally(() => {
            scanner.clear().catch(() => {});
            if (scannerRef.current === scanner) scannerRef.current = null;
            isStoppingRef.current = false;
          });
        },
        () => {}
      );

      if (!mountedRef.current) {
        await scanner.stop().catch(() => {});
        await scanner.clear().catch(() => {});
        return;
      }
      setStatus("scanning");
    } catch (err) {
      console.error("❌ QRScanner error:", err);
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner) {
        await scanner.stop().catch(() => {});
        await scanner.clear().catch(() => {});
      }
      const msg = getErrorMessage(err);
      setError(msg);
      setStatus("error");
      onError?.(msg);
    } finally {
      startingRef.current = false;
    }
  };

  const stopCamera = async () => {
    hasResultRef.current = false;
    isStoppingRef.current = false;
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (scanner) {
      try { await scanner.stop(); await scanner.clear(); }
      catch (e) { console.warn("Stop:", e); }
    }
    setStatus("idle");
  };

  const changeCamera = async (id) => {
    if (!id || id === cameraId) return;
    await stopCamera();
    setCameraId(id);
    await startCamera(id);
  };

  return (
    <div className="mc-qrs">
      <QRStyles />

      {/* VIEWPORT */}
      <div className={`mc-qrs-view ${status === "scanning" ? "is-scanning" : ""} ${status === "success" ? "is-success" : ""}`}>
        <div id="qr-reader" className="mc-qrs-reader" />

        {status !== "scanning" && (
          <div className="mc-qrs-placeholder">
            {status === "loading" ? (
              <>
                <div className="mc-qrs-icon-ring is-loading">
                  <Loader2 size={36} className="mc-qrs-spin" />
                </div>
                <p className="mc-qrs-ph-title">Mengaktifkan kamera…</p>
                <p className="mc-qrs-ph-desc">Mohon tunggu sebentar</p>
              </>
            ) : status === "error" ? (
              <>
                <div className="mc-qrs-icon-ring is-error">
                  <AlertCircle size={36} />
                </div>
                <p className="mc-qrs-ph-title">Kamera error</p>
                <p className="mc-qrs-ph-desc">{error}</p>
              </>
            ) : status === "success" ? (
              <>
                <div className="mc-qrs-icon-ring is-success">
                  <CheckCircle2 size={36} />
                </div>
                <p className="mc-qrs-ph-title">QR berhasil dibaca</p>
                <p className="mc-qrs-ph-desc">Hasil muncul di bawah</p>
              </>
            ) : (
              <>
                <div className="mc-qrs-icon-ring">
                  <Camera size={36} />
                </div>
                <p className="mc-qrs-ph-title">Kamera belum aktif</p>
                <p className="mc-qrs-ph-desc">Klik tombol di bawah untuk mulai scan</p>
              </>
            )}
          </div>
        )}

        {status === "scanning" && (
          <>
            <div className="mc-qrs-overlay">
              <div className="mc-qrs-frame">
                <span className="mc-qrs-corner tl" />
                <span className="mc-qrs-corner tr" />
                <span className="mc-qrs-corner bl" />
                <span className="mc-qrs-corner br" />
                <span className="mc-qrs-laser" />
              </div>
            </div>
            <div className="mc-qrs-hint">
              <ScanLine size={13} />
              <span>Arahkan QR ke dalam kotak</span>
            </div>
          </>
        )}
      </div>

      {/* ERROR */}
      {error && status === "error" && (
        <div className="mc-qrs-error">
          <AlertCircle size={14} />
          <span>{error}</span>
          <button onClick={() => { setError(""); setStatus("idle"); }}>
            <X size={12} />
          </button>
        </div>
      )}

      {/* CAMERA SELECTOR */}
      {cameras.length > 1 && status === "scanning" && (
        <div className="mc-qrs-select-wrap">
          <label>Kamera</label>
          <select
            value={cameraId}
            onChange={(e) => changeCamera(e.target.value)}
            className="mc-qrs-select"
          >
            {cameras.map((c, i) => (
              <option key={c.id} value={c.id}>{c.label || `Kamera ${i + 1}`}</option>
            ))}
          </select>
        </div>
      )}

      {/* BUTTON */}
      {status === "scanning" ? (
        <button onClick={stopCamera} className="mc-qrs-btn mc-qrs-btn-danger">
          <CameraOff size={18} /> Matikan Kamera
        </button>
      ) : (
        <button
          onClick={() => startCamera()}
          disabled={status === "loading"}
          className="mc-qrs-btn mc-qrs-btn-primary"
        >
          {status === "loading" ? (
            <><Loader2 size={18} className="mc-qrs-spin" /> Mengaktifkan…</>
          ) : status === "error" ? (
            <><RefreshCw size={18} /> Coba Lagi</>
          ) : (
            <><ScanLine size={18} /> Aktifkan Kamera</>
          )}
        </button>
      )}

      <div className="mc-qrs-security">
        <ShieldCheck size={12} />
        <span>Kamera hanya aktif saat diizinkan</span>
      </div>
    </div>
  );
}

function QRStyles() {
  return (
    <style>{`
      .mc-qrs { width: 100%; display: flex; flex-direction: column; gap: 0.85rem; }

      /* ===== VIEWPORT ===== */
      .mc-qrs-view {
        position: relative; width: 100%; min-height: 340px;
        border-radius: 20px; background: var(--background);
        border: 1px solid var(--border); overflow: hidden;
        transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .mc-qrs-view.is-scanning {
        background: #000;
        border-color: transparent;
        box-shadow:
          0 0 0 1.5px var(--gold),
          0 12px 40px -12px rgba(201,162,39,0.45);
      }
      .mc-qrs-view.is-success {
        box-shadow:
          0 0 0 1.5px #10B981,
          0 12px 40px -12px rgba(16,185,129,0.45);
      }

      .mc-qrs-reader { width: 100%; min-height: 340px; }
      .mc-qrs-reader video { border-radius: 19px !important; display: block; }

      /* ===== PLACEHOLDER ===== */
      .mc-qrs-placeholder {
        position: absolute; inset: 0;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        gap: 0.65rem; padding: 1.75rem; text-align: center;
        background:
          radial-gradient(circle at 50% 30%, rgba(201,162,39,0.06), transparent 60%),
          linear-gradient(135deg,
            color-mix(in srgb, var(--surface) 96%, transparent),
            color-mix(in srgb, var(--background) 96%, transparent));
        pointer-events: none;
      }
      .mc-qrs-icon-ring {
        width: 72px; height: 72px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        background: linear-gradient(135deg, var(--gold-soft), rgba(201,162,39,0.04));
        border: 1.5px solid color-mix(in srgb, var(--gold) 35%, transparent);
        color: var(--gold);
        box-shadow: 0 0 0 8px color-mix(in srgb, var(--gold) 6%, transparent);
        animation: qrs-ring-pulse 2.4s ease-in-out infinite;
      }
      .mc-qrs-icon-ring.is-loading { color: var(--gold); }
      .mc-qrs-icon-ring.is-success {
        background: rgba(16,185,129,0.1);
        border-color: rgba(16,185,129,0.35);
        color: #10B981;
        box-shadow: 0 0 0 8px rgba(16,185,129,0.08);
        animation: none;
      }
      .mc-qrs-icon-ring.is-error {
        background: rgba(239,68,68,0.1);
        border-color: rgba(239,68,68,0.35);
        color: #EF4444;
        box-shadow: 0 0 0 8px rgba(239,68,68,0.08);
        animation: none;
      }
      @keyframes qrs-ring-pulse {
        0%, 100% { box-shadow: 0 0 0 8px color-mix(in srgb, var(--gold) 6%, transparent); }
        50% { box-shadow: 0 0 0 14px color-mix(in srgb, var(--gold) 3%, transparent); }
      }

      .mc-qrs-ph-title {
        font-family: 'Playfair Display', Georgia, serif;
        font-size: 1.05rem; font-weight: 800; color: var(--text-main); margin: 0;
      }
      .mc-qrs-ph-desc {
        font-size: 0.82rem; color: var(--text-muted); max-width: 280px; margin: 0; line-height: 1.5;
      }

      /* ===== SCAN OVERLAY ===== */
      .mc-qrs-overlay {
        position: absolute; inset: 0; display: flex;
        align-items: center; justify-content: center;
        pointer-events: none; z-index: 5;
      }
      .mc-qrs-frame {
        position: relative; width: 240px; height: 240px;
        border-radius: 4px;
      }
      .mc-qrs-corner {
        position: absolute; width: 34px; height: 34px;
        border: 4px solid var(--gold);
        filter: drop-shadow(0 0 8px rgba(201,162,39,0.7));
      }
      .mc-qrs-corner.tl { top: 0; left: 0; border-right: 0; border-bottom: 0; border-radius: 14px 0 0 0; }
      .mc-qrs-corner.tr { top: 0; right: 0; border-left: 0; border-bottom: 0; border-radius: 0 14px 0 0; }
      .mc-qrs-corner.bl { bottom: 0; left: 0; border-right: 0; border-top: 0; border-radius: 0 0 0 14px; }
      .mc-qrs-corner.br { bottom: 0; right: 0; border-left: 0; border-top: 0; border-radius: 0 0 14px 0; }

      .mc-qrs-laser {
        position: absolute; left: 8%; right: 8%; height: 2px;
        background: linear-gradient(90deg,
          transparent,
          rgba(220,38,38,0.9) 15%,
          #FBBF24 50%,
          rgba(220,38,38,0.9) 85%,
          transparent);
        box-shadow: 0 0 16px 4px rgba(220,38,38,0.55);
        animation: qrs-laser 2.2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      }
      @keyframes qrs-laser {
        0%, 100% { top: 10%; opacity: 1; }
        50% { top: 88%; opacity: 1; }
      }

      .mc-qrs-hint {
        position: absolute; bottom: 14px; left: 50%; transform: translateX(-50%);
        display: inline-flex; align-items: center; gap: 0.35rem;
        padding: 0.4rem 0.8rem; border-radius: 999px;
        background: rgba(0,0,0,0.55); backdrop-filter: blur(8px);
        color: #fff; font-size: 0.72rem; font-weight: 600;
        border: 1px solid rgba(255,255,255,0.15);
        z-index: 6; white-space: nowrap;
      }

      /* ===== ERROR ===== */
      .mc-qrs-error {
        display: flex; align-items: flex-start; gap: 0.5rem;
        padding: 0.7rem 0.9rem;
        background: rgba(239,68,68,0.08);
        border: 1px solid rgba(239,68,68,0.3);
        border-radius: 12px; color: #DC2626; font-size: 0.8rem;
        animation: qrs-slide-in 0.3s ease-out;
      }
      .mc-qrs-error > span { flex: 1; line-height: 1.45; }
      .mc-qrs-error > button {
        border: none; background: transparent; color: inherit;
        cursor: pointer; padding: 0.15rem; border-radius: 5px;
        display: inline-flex;
      }
      .mc-qrs-error > button:hover { background: rgba(220,38,38,0.1); }
      @keyframes qrs-slide-in {
        from { opacity: 0; transform: translateY(-6px); }
        to { opacity: 1; transform: translateY(0); }
      }

      /* ===== SELECT ===== */
      .mc-qrs-select-wrap { display: flex; flex-direction: column; gap: 0.3rem; }
      .mc-qrs-select-wrap > label {
        font-size: 0.68rem; font-weight: 800; text-transform: uppercase;
        letter-spacing: 0.04em; color: var(--text-muted);
        padding-left: 0.2rem;
      }
      .mc-qrs-select {
        width: 100%; padding: 0.7rem 0.9rem;
        border-radius: 12px; border: 1.5px solid var(--border);
        background: var(--surface); color: var(--text-main);
        font-size: 0.82rem; font-family: inherit; cursor: pointer;
        transition: all 0.2s;
      }
      .mc-qrs-select:hover { border-color: color-mix(in srgb, var(--gold) 40%, var(--border)); }
      .mc-qrs-select:focus {
        outline: none; border-color: var(--gold);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--gold) 15%, transparent);
      }

      /* ===== BUTTON ===== */
      .mc-qrs-btn {
        width: 100%; display: inline-flex; align-items: center; justify-content: center;
        gap: 0.5rem; padding: 0.9rem 1.25rem; border-radius: 14px;
        font-size: 0.9rem; font-weight: 700; font-family: inherit;
        cursor: pointer; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        border: none; position: relative; overflow: hidden;
      }
      .mc-qrs-btn-primary {
        background: linear-gradient(135deg, var(--gold), var(--maroon-light));
        color: white;
        box-shadow:
          0 4px 16px -4px rgba(201,162,39,0.5),
          inset 0 1px 0 rgba(255,255,255,0.2);
      }
      .mc-qrs-btn-primary::before {
        content: ""; position: absolute; inset: 0;
        background: linear-gradient(135deg, rgba(255,255,255,0.15), transparent);
        opacity: 0; transition: opacity 0.25s;
      }
      .mc-qrs-btn-primary:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow:
          0 12px 28px -8px rgba(201,162,39,0.6),
          inset 0 1px 0 rgba(255,255,255,0.25);
      }
      .mc-qrs-btn-primary:hover:not(:disabled)::before { opacity: 1; }
      .mc-qrs-btn-primary:active:not(:disabled) { transform: translateY(0); }
      .mc-qrs-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

      .mc-qrs-btn-danger {
        background: linear-gradient(135deg, #EF4444, #B91C1C);
        color: white;
        box-shadow: 0 4px 16px -4px rgba(220,38,38,0.5);
      }
      .mc-qrs-btn-danger:hover {
        filter: brightness(1.08);
        transform: translateY(-2px);
        box-shadow: 0 12px 28px -8px rgba(220,38,38,0.6);
      }
      .mc-qrs-btn-danger:active { transform: translateY(0); }

      /* ===== SPINNER ===== */
      .mc-qrs-spin { animation: qrs-spin 0.8s linear infinite; }
      @keyframes qrs-spin { to { transform: rotate(360deg); } }

      /* ===== SECURITY ===== */
      .mc-qrs-security {
        display: flex; align-items: center; justify-content: center;
        gap: 0.4rem; font-size: 0.72rem; color: var(--text-muted);
        padding: 0.2rem 0;
      }
      .mc-qrs-security svg { color: #10B981; }

      /* ===== RESPONSIVE ===== */
      @media (max-width: 480px) {
        .mc-qrs-view, .mc-qrs-reader { min-height: 300px; }
        .mc-qrs-frame { width: 190px; height: 190px; }
        .mc-qrs-corner { width: 28px; height: 28px; }
        .mc-qrs-icon-ring { width: 64px; height: 64px; }
        .mc-qrs-btn { padding: 0.8rem 1rem; font-size: 0.85rem; }
      }
    `}</style>
  );
}