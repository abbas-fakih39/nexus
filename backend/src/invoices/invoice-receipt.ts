import type { Settings } from '@prisma/client';
import type { InvoiceForPdf } from './invoice-pdf';
import { logoBuffer } from './invoice-assets';

const eur = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
});
const money = (n: number) => eur.format(n);
const num = (v: unknown) => Number(v);
const dateFr = (d: Date) =>
  new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(d));

const PAYMENT_LABEL: Record<string, string> = {
  card: 'Carte bancaire',
  cash: 'Especes',
  transfer: 'Virement',
};
const STATUS_LABEL: Record<string, string> = {
  paid: 'Payee',
  pending: 'En attente',
  cancelled: 'Annulee',
};

const INK = '#000000';
const MUTE = '#444444';

/**
 * Ticket de caisse (receipt / till slip) — rouleau 80 mm, police monospace,
 * hauteur calculée dynamiquement selon le contenu. Le doc doit être créé avec
 * `autoFirstPage: false` ; cette fonction ajoute la page à la bonne taille.
 */
export function buildInvoiceReceipt(
  doc: PDFKit.PDFDocument,
  invoice: InvoiceForPdf,
  settings: Settings | null,
) {
  const isSale = invoice.type === 'sale';
  const W = 226.77; // 80 mm
  const M = 14;
  const cw = W - M * 2;
  const PAD_TOP = 14;
  const PAD_BOT = 22;

  const shop = {
    name: settings?.shopName ?? 'Ma boutique',
    address: settings?.address,
    phone: settings?.phone,
    siret: settings?.siret,
  };
  const emitter = isSale
    ? shop
    : {
        name: invoice.purchase?.supplier?.name ?? 'Fournisseur',
        address: invoice.purchase?.supplier?.address,
        phone: invoice.purchase?.supplier?.phone,
        siret: null as string | null,
      };

  type Block = { h: number; draw: (y: number) => void };
  const blocks: Block[] = [];

  const center = (
    text: string,
    font: string,
    size: number,
    color = INK,
    gap = 2,
  ) => {
    doc.font(font).fontSize(size);
    const h = doc.heightOfString(text, { width: cw, align: 'center' }) + gap;
    blocks.push({
      h,
      draw: (y) =>
        doc
          .font(font)
          .fontSize(size)
          .fillColor(color)
          .text(text, M, y, { width: cw, align: 'center' }),
    });
  };
  const left = (
    text: string,
    font: string,
    size: number,
    color = INK,
    gap = 2,
  ) => {
    doc.font(font).fontSize(size);
    const h = doc.heightOfString(text, { width: cw }) + gap;
    blocks.push({
      h,
      draw: (y) =>
        doc
          .font(font)
          .fontSize(size)
          .fillColor(color)
          .text(text, M, y, { width: cw }),
    });
  };
  const row = (
    l: string,
    r: string,
    font: string,
    size: number,
    color = INK,
    gap = 2,
  ) => {
    blocks.push({
      h: size + gap + 2,
      draw: (y) => {
        doc.font(font).fontSize(size).fillColor(color);
        doc.text(l, M, y, { width: cw * 0.6, lineBreak: false });
        doc.text(r, M, y, { width: cw, align: 'right', lineBreak: false });
      },
    });
  };
  const divider = (gap = 4) => {
    blocks.push({
      h: 6 + gap,
      draw: (y) => {
        doc.save().dash(1.5, { space: 1.5 });
        doc
          .moveTo(M, y + 3)
          .lineTo(W - M, y + 3)
          .lineWidth(0.5)
          .strokeColor('#999999')
          .stroke();
        doc.undash().restore();
      },
    });
  };
  const image = (buf: Buffer, h = 42, gap = 6) => {
    blocks.push({
      h: h + gap,
      draw: (y) => {
        try {
          doc.image(buf, M, y, { fit: [cw, h], align: 'center' });
        } catch {
          /* image illisible : on ignore */
        }
      },
    });
  };

  // ─── En-tête ───
  const logo = isSale ? logoBuffer(settings) : null;
  if (logo) image(logo);
  center(emitter.name, 'Courier-Bold', 12);
  if (emitter.address) center(emitter.address, 'Courier', 7.5, MUTE, 1);
  if (emitter.phone) center(`Tel ${emitter.phone}`, 'Courier', 7.5, MUTE, 1);
  if (isSale && shop.siret)
    center(`SIRET ${shop.siret}`, 'Courier', 7, MUTE, 1);
  divider();
  center(isSale ? 'TICKET DE CAISSE' : 'BON DE RECEPTION', 'Courier-Bold', 9);
  center(`No ${invoice.number}`, 'Courier', 8, MUTE, 1);
  center(dateFr(invoice.createdAt), 'Courier', 7.5, MUTE, 1);
  if (isSale && invoice.sale?.clientName)
    center(`Client : ${invoice.sale.clientName}`, 'Courier', 7.5, MUTE, 1);
  divider();

  // ─── Lignes ───
  for (const it of lineRows(invoice, isSale)) {
    left(it.name, 'Courier-Bold', 8);
    row(it.detail, it.total, 'Courier', 8, MUTE, 1);
  }
  divider();

  // ─── Totaux ───
  if (isSale) {
    const sub = num(invoice.sale?.totalAmount);
    const fin = num(invoice.sale?.finalAmount);
    const rem = num(invoice.sale?.discount);
    if (rem > 0) {
      row('Sous-total', money(sub), 'Courier', 8, MUTE);
      row(`Remise ${rem}%`, `- ${money(sub - fin)}`, 'Courier', 8, MUTE);
    }
    row('TOTAL', money(fin), 'Courier-Bold', 12, INK, 3);
    if (invoice.sale)
      row(
        'Reglement',
        PAYMENT_LABEL[invoice.sale.paymentMethod] ?? invoice.sale.paymentMethod,
        'Courier',
        8,
        MUTE,
      );
  } else {
    row(
      'TOTAL HT',
      money(num(invoice.purchase?.totalAmount)),
      'Courier-Bold',
      12,
      INK,
      3,
    );
  }
  if (invoice.status !== 'paid') {
    center(
      `* ${STATUS_LABEL[invoice.status]} *`,
      'Courier-Bold',
      9,
      invoice.status === 'cancelled' ? '#CC0000' : '#B45309',
      3,
    );
  }
  divider();

  // ─── Pied ───
  center(
    isSale ? 'Merci de votre visite !' : 'Document interne',
    'Courier-Bold',
    8,
    INK,
    2,
  );
  center('TVA non applicable, art. 293 B du CGI', 'Courier', 6.5, MUTE, 1);

  // ─── Page à la hauteur exacte ───
  const H = PAD_TOP + PAD_BOT + blocks.reduce((s, b) => s + b.h, 0);
  doc.addPage({
    size: [W, H],
    margins: { top: PAD_TOP, bottom: PAD_BOT, left: M, right: M },
  });
  let y = PAD_TOP;
  for (const b of blocks) {
    b.draw(y);
    y += b.h;
  }
}

function lineRows(invoice: InvoiceForPdf, isSale: boolean) {
  if (isSale) {
    return (invoice.sale?.items ?? []).map((it) => {
      const pu = num(it.unitPrice);
      const d = num(it.discount);
      const total = pu * it.quantity * (1 - d / 100);
      return {
        name: it.product?.name ?? 'Produit',
        detail: `${it.quantity} x ${money(pu)}${d > 0 ? ` (-${d}%)` : ''}`,
        total: money(total),
      };
    });
  }
  return (invoice.purchase?.items ?? []).map((it) => {
    const pu = num(it.unitCost);
    return {
      name: it.product?.name ?? 'Produit',
      detail: `${it.quantity} x ${money(pu)}`,
      total: money(pu * it.quantity),
    };
  });
}
