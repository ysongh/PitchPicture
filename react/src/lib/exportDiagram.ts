// Export the currently-rendered Mermaid diagram as SVG or PNG.
//
// SVG: serialize the rendered <svg> and trigger a download.
// PNG: rasterize the SVG into a <canvas> at 2× and download as PNG.
//
// Both paths read from the same SVG element that DiagramView mounts into
// `.pp-canvas .diagram svg` — no DiagramView API changes needed.

export type ExportFormat = 'png' | 'svg';

function findSvg(): SVGSVGElement | null {
  return document.querySelector<SVGSVGElement>('.pp-canvas .diagram svg');
}

function slugify(s: string): string {
  const cleaned = s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 60);
  return cleaned || 'pitch';
}

function trigger(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the download a tick before revoking; Safari can otherwise cancel.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function serialize(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  if (!clone.getAttribute('xmlns')) {
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }
  if (!clone.getAttribute('xmlns:xlink')) {
    clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  }
  return new XMLSerializer().serializeToString(clone);
}

function dimensions(svg: SVGSVGElement): { w: number; h: number } {
  const vb = svg.viewBox.baseVal;
  if (vb && vb.width && vb.height) return { w: vb.width, h: vb.height };
  const rect = svg.getBoundingClientRect();
  return { w: rect.width || 800, h: rect.height || 600 };
}

export async function exportDiagram(
  format: ExportFormat,
  title: string | null | undefined
): Promise<void> {
  const svg = findSvg();
  if (!svg) throw new Error('Diagram not ready yet.');

  const name = slugify(title || 'pitch');
  const xml = serialize(svg);

  if (format === 'svg') {
    trigger(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }), `${name}.svg`);
    return;
  }

  // PNG: rasterize via canvas at 2× for retina.
  const { w, h } = dimensions(svg);
  const scale = 2;

  const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const img = await loadImage(svgUrl);

    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(w * scale);
    canvas.height = Math.ceil(h * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported in this browser.');

    // Match the visible diagram background so dark-mode renders stay legible.
    const bg =
      getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#ffffff';
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    await new Promise<void>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to encode PNG.'));
          return;
        }
        trigger(blob, `${name}.png`);
        resolve();
      }, 'image/png');
    });
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to rasterize diagram.'));
    img.src = src;
  });
}
