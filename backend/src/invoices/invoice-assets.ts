import type { Settings } from '@prisma/client';

/**
 * Décode le logo base64 du magasin en buffer image pour PDFKit.
 * PDFKit n'accepte que PNG et JPEG → les autres formats (webp, svg) sont ignorés (null).
 */
export function logoBuffer(settings: Settings | null): Buffer | null {
  const p = settings?.logoPath;
  if (!p) return null;
  const m = /^data:image\/(png|jpe?g);base64,(.+)$/i.exec(p);
  if (!m) return null;
  try {
    return Buffer.from(m[2], 'base64');
  } catch {
    return null;
  }
}
