import type { Prisma, Settings } from '@prisma/client';

/** Facture avec toutes ses relations (sortie de InvoicesService.findOne). */
export type InvoiceForPdf = Prisma.InvoiceGetPayload<{
  include: {
    sale: {
      include: {
        items: { include: { product: true } };
        soldBy: { select: { name: true } };
      };
    };
    purchase: {
      include: {
        items: { include: { product: true } };
        supplier: true;
        createdBy: { select: { name: true } };
      };
    };
  };
}>;

const C = {
  ink: '#16201B',
  mute: '#6B7B73',
  accent: '#059669',
  light: '#F4F7F5',
  border: '#E3E9E5',
  danger: '#DC2626',
  warn: '#B45309',
};

const PAYMENT_LABEL: Record<string, string> = {
  card: 'Carte bancaire',
  cash: 'Espèces',
  transfer: 'Virement',
};
const STATUS = {
  paid: { label: 'Payée', color: C.accent },
  pending: { label: 'En attente', color: C.warn },
  cancelled: { label: 'Annulée', color: C.danger },
};

const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const money = (n: number) => eur.format(n);
const num = (v: unknown) => Number(v as number);
const dateFr = (d: Date) =>
  new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d));

const LEFT = 50;
const RIGHT = 545;

interface Party {
  name: string;
  address?: string | null;
  siret?: string | null;
  phone?: string | null;
  email?: string | null;
}
interface Col {
  t: string;
  x: number;
  w: number;
  a: 'left' | 'right';
}

/** Construit la facture dans le document fourni. Le doc doit être terminé (doc.end()) par l'appelant. */
export function buildInvoicePdf(
  doc: PDFKit.PDFDocument,
  invoice: InvoiceForPdf,
  settings: Settings | null,
) {
  const isSale = invoice.type === 'sale';
  const shop: Party = {
    name: settings?.shopName ?? 'Ma boutique',
    address: settings?.address,
    siret: settings?.siret,
    phone: settings?.phone,
    email: settings?.email,
  };

  let issuer: Party;
  let recipient: Party;
  if (isSale) {
    issuer = shop;
    recipient = { name: invoice.sale?.clientName || 'Client comptoir' };
  } else {
    const s = invoice.purchase?.supplier;
    issuer = { name: s?.name ?? 'Fournisseur', address: s?.address, phone: s?.phone, email: s?.email };
    recipient = shop;
  }

  // ─── En-tête : émetteur (gauche) + méta facture (droite) ───
  const top = 50;
  doc.font('Helvetica-Bold').fontSize(17).fillColor(C.ink).text(issuer.name, LEFT, top, { width: 300 });
  doc.font('Helvetica').fontSize(9).fillColor(C.mute);
  for (const line of partyLines(issuer)) doc.text(line, LEFT, doc.y + 1, { width: 300 });
  const leftBottom = doc.y;

  const metaX = 330;
  const metaW = RIGHT - metaX;
  doc.font('Helvetica-Bold').fontSize(24).fillColor(C.accent).text('FACTURE', metaX, top, { width: metaW, align: 'right' });
  doc.font('Helvetica-Bold').fontSize(11).fillColor(C.ink).text(`N° ${invoice.number}`, metaX, doc.y + 5, { width: metaW, align: 'right' });
  doc.font('Helvetica').fontSize(9).fillColor(C.mute).text(`Date d'émission : ${dateFr(invoice.createdAt)}`, metaX, doc.y + 3, { width: metaW, align: 'right' });

  // Pastille de statut
  const st = STATUS[invoice.status];
  doc.font('Helvetica-Bold').fontSize(9);
  const pillW = doc.widthOfString(st.label) + 18;
  const pillX = RIGHT - pillW;
  const pillY = doc.y + 6;
  doc.roundedRect(pillX, pillY, pillW, 17, 8.5).fill(st.color);
  doc.fillColor('#FFFFFF').text(st.label, pillX, pillY + 4.5, { width: pillW, align: 'center' });
  const rightBottom = pillY + 17;

  // ─── Destinataire ───
  let y = Math.max(leftBottom, rightBottom) + 28;
  doc.moveTo(LEFT, y).lineTo(RIGHT, y).lineWidth(1).strokeColor(C.border).stroke();
  y += 18;
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.mute).text('FACTURÉ À', LEFT, y, { characterSpacing: 0.5 });
  doc.font('Helvetica-Bold').fontSize(12.5).fillColor(C.ink).text(recipient.name, LEFT, doc.y + 3, { width: 280 });
  doc.font('Helvetica').fontSize(9).fillColor(C.mute);
  for (const line of partyLines(recipient)) doc.text(line, LEFT, doc.y + 1, { width: 280 });
  y = doc.y + 26;

  // ─── Tableau des lignes ───
  const cols: Col[] = isSale
    ? [
        { t: 'Désignation', x: LEFT, w: 215, a: 'left' },
        { t: 'Qté', x: 265, w: 45, a: 'right' },
        { t: 'P.U. HT', x: 310, w: 75, a: 'right' },
        { t: 'Remise', x: 385, w: 60, a: 'right' },
        { t: 'Montant HT', x: 445, w: 100, a: 'right' },
      ]
    : [
        { t: 'Désignation', x: LEFT, w: 300, a: 'left' },
        { t: 'Qté', x: 350, w: 55, a: 'right' },
        { t: 'P.U. HT', x: 405, w: 70, a: 'right' },
        { t: 'Montant HT', x: 475, w: 70, a: 'right' },
      ];

  // En-tête du tableau
  doc.rect(LEFT, y, RIGHT - LEFT, 22).fill(C.light);
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.mute);
  for (const c of cols) doc.text(c.t.toUpperCase(), c.x + (c.a === 'left' ? 8 : 0), y + 7, { width: c.w - 8, align: c.a });
  y += 22;

  const rows = lineRows(invoice, isSale);
  for (const r of rows) {
    doc.font('Helvetica').fontSize(9.5).fillColor(C.ink);
    const nameH = doc.heightOfString(r.name, { width: cols[0].w - 16 });
    const rowH = Math.max(nameH + 12, 26);

    // saut de page si besoin
    if (y + rowH > doc.page.height - 110) {
      doc.addPage();
      y = 50;
    }

    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(C.ink).text(r.name, cols[0].x + 8, y + 6, { width: cols[0].w - 16 });
    const cells = isSale ? [r.qty, r.pu, r.remise, r.total] : [r.qty, r.pu, r.total];
    doc.font('Helvetica').fontSize(9.5).fillColor(C.ink);
    cells.forEach((val, i) => {
      const c = cols[i + 1];
      doc.text(val, c.x, y + 6, { width: c.w - 6, align: 'right' });
    });
    y += rowH;
    doc.moveTo(LEFT, y).lineTo(RIGHT, y).lineWidth(0.5).strokeColor(C.border).stroke();
  }

  // ─── Totaux ───
  y += 16;
  const boxX = 330;
  const boxW = RIGHT - boxX;
  const totalRows: { label: string; value: string; strong?: boolean }[] = [];
  if (isSale) {
    const subtotal = num(invoice.sale?.totalAmount);
    const final = num(invoice.sale?.finalAmount);
    const remise = num(invoice.sale?.discount);
    totalRows.push({ label: 'Sous-total HT', value: money(subtotal) });
    if (remise > 0) totalRows.push({ label: `Remise globale (${remise} %)`, value: `- ${money(subtotal - final)}` });
    totalRows.push({ label: 'Total à payer', value: money(final), strong: true });
  } else {
    totalRows.push({ label: 'Total HT', value: money(num(invoice.purchase?.totalAmount)), strong: true });
  }

  for (const tr of totalRows) {
    if (tr.strong) {
      doc.rect(boxX, y, boxW, 26).fill(C.accent);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#FFFFFF');
      doc.text(tr.label, boxX + 12, y + 8, { width: boxW * 0.55 });
      doc.text(tr.value, boxX, y + 8, { width: boxW - 12, align: 'right' });
      y += 26;
    } else {
      doc.font('Helvetica').fontSize(9.5).fillColor(C.mute);
      doc.text(tr.label, boxX + 12, y + 4, { width: boxW * 0.6 });
      doc.fillColor(C.ink).text(tr.value, boxX, y + 4, { width: boxW - 12, align: 'right' });
      y += 18;
    }
  }

  // ─── Règlement / établi par / notes ───
  y += 22;
  const handler = isSale ? invoice.sale?.soldBy?.name : invoice.purchase?.createdBy?.name;
  doc.font('Helvetica').fontSize(9).fillColor(C.mute);
  if (isSale && invoice.sale) {
    doc.text(`Mode de règlement : ${PAYMENT_LABEL[invoice.sale.paymentMethod] ?? invoice.sale.paymentMethod}`, LEFT, y);
  }
  if (handler) doc.text(`Établi par : ${handler}`, LEFT, doc.y + 2);
  if (!isSale && invoice.purchase?.notes) doc.text(`Notes : ${invoice.purchase.notes}`, LEFT, doc.y + 2, { width: RIGHT - LEFT });

  // ─── Pied de page (mentions légales) ───
  const footY = doc.page.height - 86;
  doc.moveTo(LEFT, footY).lineTo(RIGHT, footY).lineWidth(0.5).strokeColor(C.border).stroke();
  doc.font('Helvetica').fontSize(8).fillColor(C.mute);
  const legal: string[] = ['TVA non applicable, art. 293 B du CGI.'];
  if (shop.siret) legal.push(`${shop.name} — SIRET ${shop.siret}`);
  doc.text(legal.join('   ·   '), LEFT, footY + 9, { width: RIGHT - LEFT, align: 'center', lineBreak: false });
  doc.fillColor(C.accent).text('Merci de votre confiance.', LEFT, footY + 23, { width: RIGHT - LEFT, align: 'center', lineBreak: false });

  // ─── Filigrane « ANNULÉE » ───
  if (invoice.status === 'cancelled') {
    doc.save();
    doc.rotate(-30, { origin: [doc.page.width / 2, doc.page.height / 2] });
    doc.fillColor(C.danger).fillOpacity(0.1).font('Helvetica-Bold').fontSize(120);
    doc.text('ANNULÉE', 0, doc.page.height / 2 - 70, { width: doc.page.width, align: 'center' });
    doc.restore();
  }
}

/* ---------- helpers ---------- */

function partyLines(p: Party): string[] {
  return [p.address, p.siret ? `SIRET ${p.siret}` : '', p.phone, p.email].filter(Boolean) as string[];
}

function lineRows(invoice: InvoiceForPdf, isSale: boolean) {
  if (isSale) {
    return (invoice.sale?.items ?? []).map((it) => {
      const pu = num(it.unitPrice);
      const remise = num(it.discount);
      const total = pu * it.quantity * (1 - remise / 100);
      return {
        name: it.product?.name ?? 'Produit',
        qty: `${it.quantity}`,
        pu: money(pu),
        remise: remise > 0 ? `${remise} %` : '—',
        total: money(total),
      };
    });
  }
  return (invoice.purchase?.items ?? []).map((it) => {
    const pu = num(it.unitCost);
    return {
      name: it.product?.name ?? 'Produit',
      qty: `${it.quantity}`,
      pu: money(pu),
      remise: '—',
      total: money(pu * it.quantity),
    };
  });
}
