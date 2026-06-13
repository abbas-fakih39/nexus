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
  cash: 'Espèces',
  transfer: 'Virement',
};

const INK = '#000000';
const MUTE = '#444444';
const GREEN = '#047857';

/**
 * Reçu de paiement (preuve de règlement) — style ticket 80 mm, données réelles uniquement
 * (aucune donnée bancaire simulée). À générer pour une facture déjà réglée.
 * Le doc doit être créé avec `autoFirstPage: false`.
 */
export function buildPaymentReceipt(
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
  const amount = isSale
    ? num(invoice.sale?.finalAmount)
    : num(invoice.purchase?.totalAmount);

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
        doc.text(l, M, y, { width: cw * 0.5, lineBreak: false });
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

  // En-tête boutique
  const logo = logoBuffer(settings);
  if (logo) image(logo);
  center(shop.name, 'Courier-Bold', 12);
  if (shop.address) center(shop.address, 'Courier', 7.5, MUTE, 1);
  if (shop.phone) center(`Tel ${shop.phone}`, 'Courier', 7.5, MUTE, 1);
  if (shop.siret) center(`SIRET ${shop.siret}`, 'Courier', 7, MUTE, 1);
  divider();

  center(isSale ? 'REÇU DE PAIEMENT' : 'REÇU DE RÈGLEMENT', 'Courier-Bold', 10);
  center(`Facture ${invoice.number}`, 'Courier', 8, MUTE, 1);
  center(dateFr(invoice.createdAt), 'Courier', 7.5, MUTE, 1);
  divider();

  center('MONTANT RÉGLÉ', 'Courier', 8, MUTE, 1);
  center(money(amount), 'Courier-Bold', 17, INK, 3);
  if (isSale && invoice.sale) {
    row(
      'Réglé par',
      PAYMENT_LABEL[invoice.sale.paymentMethod] ?? invoice.sale.paymentMethod,
      'Courier',
      8,
      MUTE,
    );
    if (invoice.sale.clientName)
      row('Reçu de', invoice.sale.clientName, 'Courier', 8, MUTE);
  } else if (invoice.purchase?.supplier?.name) {
    row('Bénéficiaire', invoice.purchase.supplier.name, 'Courier', 8, MUTE);
  }
  divider();

  center('* PAIEMENT ACCEPTÉ *', 'Courier-Bold', 10, GREEN, 3);
  center(
    isSale ? 'Merci de votre confiance' : 'Conservez ce reçu',
    'Courier',
    7.5,
    MUTE,
    1,
  );

  // Page à la hauteur exacte
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
