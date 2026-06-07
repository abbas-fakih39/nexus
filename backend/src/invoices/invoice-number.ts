import { InvoiceType, Prisma } from '@prisma/client';

/** Préfixe de numéro selon le type de facture. */
const PREFIX: Record<InvoiceType, string> = {
  sale: 'FV', // Facture de Vente
  purchase: 'FA', // Facture d'Achat
};

/**
 * Génère le prochain numéro de facture, séquentiel par type et par année :
 * `FV-2026-0001`, `FA-2026-0001`, … À appeler DANS une transaction Prisma.
 * Les factures annulées gardent leur numéro (jamais réutilisé).
 */
export async function nextInvoiceNumber(
  tx: Prisma.TransactionClient,
  type: InvoiceType,
): Promise<string> {
  const year = new Date().getFullYear();
  const start = `${PREFIX[type]}-${year}-`;
  const count = await tx.invoice.count({
    where: { type, number: { startsWith: start } },
  });
  return `${start}${String(count + 1).padStart(4, '0')}`;
}
