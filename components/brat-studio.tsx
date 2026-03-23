'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Mode = 'green' | 'white' | 'strike' | 'mirror' | 'random';

type RenderOptions = {
  text: string;
  mode: Mode;
  size?: number;
  frame?: number;
};

const SIZE = 512;
const RANDOM_PALETTE = [
  ['#111111', '#e9ff3f'],
  ['#ffffff', '#05d85d'],
  ['#0f172a', '#f97316'],
  ['#fde047', '#1f2937'],
  ['#00d1ff', '#ff006e'],
  ['#cbf000', '#111111'],
];

const modeLabels: Record<Mode, string> = {
  green: 'Hijau',
  white: 'Putih',
  strike: 'Coret',
  mirror: 'Mirror',
  random: 'Random Video',
};

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return ['BRAT'];

  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) lines.push(current);
    current = word;
  }

  if (current) lines.push(current);
  return lines;
}

function fitFontSize(ctx: CanvasRenderingContext2D, text: string, size: number) {
  let fontSize = 176;
  while (fontSize > 32) {
    ctx.font = `700 ${fontSize}px Arial Narrow, Arial, sans-serif`;
    const lines = wrapText(ctx, text, size * 0.78);
    const blockHeight = lines.length * fontSize * 0.92;
    const maxLineWidth = Math.max(...lines.map((line) => ctx.measureText(line).width));

    if (blockHeight <= size * 0.76 && maxLineWidth <= size * 0.82) {
      return { fontSize, lines };
    }

    fontSize -= 4;
  }

  ctx.font = `700 32px Arial Narrow, Arial, sans-serif`;
  return { fontSize: 32, lines: wrapText(ctx, text, size * 0.78) };
}

function drawStrike(ctx: CanvasRenderingContext2D, size: number) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(17,17,17,0.95)';
  ctx.lineWidth = size * 0.02;
  ctx.beginPath();
  ctx.moveTo(size * 0.18, size * 0.48);
  ctx.quadraticCurveTo(size * 0.5, size * 0.36, size * 0.82, size * 0.52);
  ctx.stroke();
  ctx.restore();
}

function drawScene(canvas: HTMLCanvasElement, options: RenderOptions) {
  const size = options.size ?? SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = size;
  canvas.height = size;

  const text = (options.text || 'brat').slice(0, 80);
  const frame = options.frame ?? 0;

  let background = '#8ace00';
  let foreground = '#111111';
  let strike = false;
  let mirror = false;

  if (options.mode === 'white') {
    background = '#ffffff';
  } else if (options.mode === 'strike') {
    background = '#8ace00';
    strike = true;
  } else if (options.mode === 'mirror') {
    background = '#8ace00';
    mirror = true;
  } else if (options.mode === 'random') {
    const palette = RANDOM_PALETTE[frame % RANDOM_PALETTE.length];
    foreground = palette[0];
    background = palette[1];
  }

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, size, size);

  const { fontSize, lines } = fitFontSize(ctx, text, size);
  const lineHeight = fontSize * 0.92;
  const blockHeight = lines.length * lineHeight;
  const startY = size / 2 - blockHeight / 2 + fontSize * 0.72;

  ctx.save();
  ctx.fillStyle = foreground;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `700 ${fontSize}px Arial Narrow, Arial, sans-serif`;
  ctx.filter = options.mode === 'white' || options.mode === 'strike' ? 'blur(1.1px)' : 'none';

  if (mirror) {
    ctx.translate(size, 0);
    ctx.scale(-1, 1);
  }

  lines.forEach((line, index) => {
    const jitterX = options.mode === 'random' ? Math.sin((frame + index) * 1.3) * 7 : 0;
    const jitterY = options.mode === 'random' ? Math.cos((frame + index) * 0.9) * 4 : 0;
    ctx.fillText(line, size / 2 + jitterX, startY + lineHeight * index + jitterY);
  });

  ctx.restore();

  if (strike) {
    drawStrike(ctx, size);
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Gagal membuat file.'));
        return;
      }
      resolve(blob);
    }, type, quality);
  });
}

async function shareFile(file: File, title: string) {
  if (typeof navigator === 'undefined' || !('share' in navigator)) {
    throw new Error('Browser ini belum support native share.');
  }

  const payload = { title, text: title, files: [file] };
  if ('canShare' in navigator && !navigator.canShare(payload)) {
    throw new Error('File ini tidak bisa dishare dari browser ini.');
  }

  await navigator.share(payload);
}

async function exportAnimatedWebm(text: string, fps = 8, seconds = 3) {
  const canvas = document.createElement('canvas');
  drawScene(canvas, { text, mode: 'random', size: SIZE, frame: 0 });

  const stream = canvas.captureStream(fps);
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm';

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 2_500_000,
  });

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  const stopPromise = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));
  });

  recorder.start();

  const totalFrames = fps * seconds;
  for (let frame = 0; frame < totalFrames; frame += 1) {
    drawScene(canvas, { text, mode: 'random', size: SIZE, frame });
    await new Promise((resolve) => setTimeout(resolve, 1000 / fps));
  }

  recorder.stop();
  return stopPromise;
}

export function BratStudio() {
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [text, setText] = useState('brat');
  const [mode, setMode] = useState<Mode>('green');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('PNG / WEBP bisa langsung di-download. Mode random bisa export WEBM.');

  const safeText = useMemo(() => text.trim().slice(0, mode === 'random' ? 24 : 80) || 'brat', [text, mode]);

  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    let frame = 0;
    let rafId = 0;
    let intervalId: number | null = null;

    const render = () => {
      drawScene(canvas, { text: safeText, mode, size: SIZE, frame });
      frame += 1;
    };

    render();

    if (mode === 'random') {
      intervalId = window.setInterval(render, 140);
    }

    return () => {
      if (intervalId) window.clearInterval(intervalId);
      cancelAnimationFrame(rafId);
    };
  }, [safeText, mode]);

  const handleDownload = async (type: 'png' | 'webp' | 'webm') => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    setBusy(true);
    setMessage('Sedang menyiapkan file...');

    try {
      if (type === 'webm') {
        const blob = await exportAnimatedWebm(safeText);
        downloadBlob(blob, `brat-${Date.now()}.webm`);
        setMessage('WEBM selesai dibuat. Bagus untuk mode random / animated asset.');
        return;
      }

      drawScene(canvas, { text: safeText, mode, size: SIZE, frame: 0 });
      const blob = await canvasToBlob(canvas, type === 'png' ? 'image/png' : 'image/webp', 0.96);
      downloadBlob(blob, `brat-${Date.now()}.${type}`);
      setMessage(`${type.toUpperCase()} berhasil di-download.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Terjadi error saat export.');
    } finally {
      setBusy(false);
    }
  };

  const handleShareWhatsApp = async () => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    setBusy(true);
    setMessage('Sedang menyiapkan file untuk dibagikan...');

    try {
      if (mode === 'random') {
        const webm = await exportAnimatedWebm(safeText);
        const file = new File([webm], 'brat-random.webm', { type: 'video/webm' });
        await shareFile(file, 'Brat random video');
        setMessage('File animasi dibagikan. Pilih WhatsApp dari share sheet jika tersedia.');
        return;
      }

      drawScene(canvas, { text: safeText, mode, size: SIZE, frame: 0 });
      const blob = await canvasToBlob(canvas, 'image/webp', 0.96);
      const file = new File([blob], 'brat-sticker.webp', { type: 'image/webp' });
      await shareFile(file, 'Brat sticker');
      setMessage('WEBP dibagikan. Di perangkat yang support, kamu bisa pilih WhatsApp dari share sheet.');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `${error.message} Download file dulu kalau share tidak tersedia.`
          : 'Gagal share. Coba download lalu kirim manual ke WhatsApp.'
      );
    } finally {
      setBusy(false);
    }
  };

  const isAnimated = mode === 'random';

  return (
    <main style={styles.page}>
      <section style={styles.shell}>
        <div style={styles.leftCol}>
          <div style={styles.headerRow}>
            <div>
              <p style={styles.eyebrow}>Next.js + Vercel ready</p>
              <h1 style={styles.title}>Brat Generator</h1>
              <p style={styles.subtext}>
                Clean generator dengan mode putih, hijau, coret, mirror, dan random animated.
              </p>
            </div>
          </div>

          <label htmlFor="brat-input" style={styles.label}>
            Text
          </label>
          <input
            id="brat-input"
            value={text}
            maxLength={mode === 'random' ? 24 : 80}
            onChange={(event) => setText(event.target.value)}
            placeholder="ketik text kamu"
            style={styles.input}
          />

          <div style={styles.modeGrid}>
            {(Object.keys(modeLabels) as Mode[]).map((item) => {
              const active = item === mode;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMode(item)}
                  style={{
                    ...styles.modeButton,
                    ...(active ? styles.modeButtonActive : null),
                  }}
                >
                  {modeLabels[item]}
                </button>
              );
            })}
          </div>

          <div style={styles.actionGrid}>
            <button type="button" disabled={busy} onClick={() => handleDownload('png')} style={styles.primaryButton}>
              Download PNG
            </button>
            <button type="button" disabled={busy} onClick={() => handleDownload('webp')} style={styles.secondaryButton}>
              Download WEBP
            </button>
            <button type="button" disabled={busy || !isAnimated} onClick={() => handleDownload('webm')} style={styles.secondaryButton}>
              Download WEBM
            </button>
            <button type="button" disabled={busy} onClick={handleShareWhatsApp} style={styles.whatsAppButton}>
              Share ke WhatsApp
            </button>
          </div>

          <p style={styles.helper}>{message}</p>
          <ul style={styles.notes}>
            <li>WEBP cocok untuk sticker static-ready asset.</li>
            <li>Mode random export WEBM supaya efek warna tetap hidup.</li>
            <li>Share ke WhatsApp tergantung support browser/device.</li>
          </ul>
        </div>

        <div style={styles.rightCol}>
          <div style={styles.previewCard}>
            <canvas ref={previewCanvasRef} width={SIZE} height={SIZE} style={styles.canvas} />
          </div>
        </div>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    padding: '32px 18px',
    background: 'linear-gradient(180deg, #fafaf8 0%, #f0f3ec 100%)',
  },
  shell: {
    width: '100%',
    maxWidth: 1180,
    display: 'grid',
    gridTemplateColumns: 'minmax(320px, 480px) minmax(320px, 1fr)',
    gap: 24,
  },
  leftCol: {
    background: 'rgba(255,255,255,0.88)',
    border: '1px solid #e7eadf',
    borderRadius: 28,
    padding: 24,
    boxShadow: '0 10px 30px rgba(17,17,17,0.06)',
  },
  rightCol: {
    display: 'flex',
    alignItems: 'stretch',
  },
  previewCard: {
    width: '100%',
    minHeight: 620,
    background: '#ffffff',
    border: '1px solid #e7eadf',
    borderRadius: 28,
    boxShadow: '0 10px 30px rgba(17,17,17,0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  canvas: {
    width: 'min(100%, 512px)',
    height: 'auto',
    borderRadius: 24,
    background: '#eef2e8',
    display: 'block',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 20,
  },
  eyebrow: {
    margin: 0,
    fontSize: 12,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: '#4f7b27',
    fontWeight: 700,
  },
  title: {
    margin: '8px 0 10px',
    fontSize: 'clamp(32px, 4vw, 52px)',
    lineHeight: 1,
  },
  subtext: {
    margin: 0,
    color: '#4a4a4a',
    lineHeight: 1.6,
  },
  label: {
    display: 'block',
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 10,
  },
  input: {
    width: '100%',
    border: '1px solid #dce3d2',
    borderRadius: 18,
    background: '#ffffff',
    padding: '16px 18px',
    fontSize: 18,
    outline: 'none',
    marginBottom: 18,
  },
  modeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 12,
    marginBottom: 18,
  },
  modeButton: {
    border: '1px solid #dce3d2',
    background: '#ffffff',
    color: '#101010',
    padding: '14px 16px',
    borderRadius: 18,
    cursor: 'pointer',
    fontWeight: 700,
  },
  modeButtonActive: {
    background: '#dffc77',
    borderColor: '#b9da42',
  },
  actionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 12,
    marginBottom: 16,
  },
  primaryButton: {
    border: 'none',
    background: '#111111',
    color: '#ffffff',
    padding: '14px 16px',
    borderRadius: 18,
    cursor: 'pointer',
    fontWeight: 700,
  },
  secondaryButton: {
    border: '1px solid #dce3d2',
    background: '#ffffff',
    color: '#101010',
    padding: '14px 16px',
    borderRadius: 18,
    cursor: 'pointer',
    fontWeight: 700,
  },
  whatsAppButton: {
    border: 'none',
    background: '#22c55e',
    color: '#ffffff',
    padding: '14px 16px',
    borderRadius: 18,
    cursor: 'pointer',
    fontWeight: 700,
  },
  helper: {
    margin: '0 0 14px',
    color: '#3f3f3f',
    lineHeight: 1.6,
  },
  notes: {
    margin: 0,
    paddingLeft: 18,
    color: '#5a5a5a',
    lineHeight: 1.7,
  },
};
