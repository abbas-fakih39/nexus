import 'dotenv/config';
import { PrismaClient, MovementType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

type SeedProduct = {
  name: string;
  sku: string;
  barcode?: string;
  cat: string;
  sup: string;
  price: number;
  costPrice: number;
  stock: number;
  alertThreshold: number;
  unit: string;
};

async function main() {
  // --- Compte owner ---
  const password = await bcrypt.hash('admin123', 10);
  const owner = await prisma.user.upsert({
    where: { email: 'owner@nexus.fr' },
    update: {},
    create: {
      email: 'owner@nexus.fr',
      password,
      name: 'Karim Amrani',
      role: 'owner',
    },
  });

  // --- Paramètres du magasin (boutique de sport) ---
  const settingsData = {
    shopName: 'Amrani Sport',
    address: '14 rue du Stade, 75011 Paris',
    phone: '+33 1 84 80 12 12',
    email: 'contact@amrani-sport.fr',
    siret: '894 217 330 00018',
  };
  const existingSettings = await prisma.settings.findFirst();
  if (existingSettings) {
    await prisma.settings.update({
      where: { id: existingSettings.id },
      data: settingsData,
    });
  } else {
    await prisma.settings.create({ data: settingsData });
  }

  // --- Catégories (idempotent : name unique) ---
  const categoryNames = [
    'Chaussures',
    'Vêtements',
    'Football',
    'Fitness & Musculation',
    'Randonnée',
    'Cyclisme',
    'Natation',
  ];
  const categories: Record<string, string> = {};
  for (const name of categoryNames) {
    const c = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    categories[name] = c.id;
  }

  // --- Données de démo : une seule fois ---
  const productCount = await prisma.product.count();
  if (productCount > 0) {
    console.log('Seed : produits déjà présents, démo non recréée.');
    console.log('Connexion : owner@nexus.fr / admin123');
    return;
  }

  // Fournisseurs (marques)
  const [nike, adidas, decathlon, puma] = await Promise.all([
    prisma.supplier.create({
      data: { name: 'Nike France', email: 'pro@nike.fr', phone: '+33 1 40 00 10 10' },
    }),
    prisma.supplier.create({
      data: { name: 'Adidas Distribution', email: 'b2b@adidas.fr', phone: '+33 1 40 00 20 20' },
    }),
    prisma.supplier.create({
      data: { name: 'Décathlon Pro', email: 'pro@decathlon.fr', phone: '+33 3 20 00 30 30' },
    }),
    prisma.supplier.create({
      data: { name: 'Puma France', email: 'pro@puma.fr', phone: '+33 1 40 00 40 40' },
    }),
  ]);

  // Produits (stock varié : normal, faible et rupture pour illustrer les badges)
  const products: SeedProduct[] = [
    { name: 'Chaussures de foot Phantom GX', sku: 'CHF-PHGX-42', barcode: '3600010000017', cat: 'Football', sup: nike.id, price: 89.99, costPrice: 52, stock: 24, alertThreshold: 10, unit: 'paire' },
    { name: 'Crampons Predator Elite', sku: 'CRP-PRED-43', barcode: '3600010000024', cat: 'Football', sup: adidas.id, price: 129.99, costPrice: 78, stock: 8, alertThreshold: 10, unit: 'paire' },
    { name: 'Maillot domicile PSG 2026', sku: 'MAI-PSG-L', cat: 'Vêtements', sup: nike.id, price: 89.99, costPrice: 45, stock: 0, alertThreshold: 6, unit: 'pièce' },
    { name: 'Ballon de foot Ligue 1 (T5)', sku: 'BAL-L1-T5', barcode: '3600010000048', cat: 'Football', sup: decathlon.id, price: 29.99, costPrice: 14, stock: 60, alertThreshold: 15, unit: 'pièce' },
    { name: 'Chaussures running Pegasus 40', sku: 'RUN-PEG40-42', cat: 'Chaussures', sup: nike.id, price: 119.99, costPrice: 70, stock: 18, alertThreshold: 8, unit: 'paire' },
    { name: 'Short training Domyos', sku: 'SHO-DOM-M', cat: 'Fitness & Musculation', sup: decathlon.id, price: 9.99, costPrice: 4, stock: 120, alertThreshold: 20, unit: 'pièce' },
    { name: 'Haltères 10 kg (paire)', sku: 'HAL-10KG', barcode: '3600010000079', cat: 'Fitness & Musculation', sup: decathlon.id, price: 39.99, costPrice: 22, stock: 5, alertThreshold: 6, unit: 'paire' },
    { name: 'Veste imperméable Quechua MH500', sku: 'VES-MH500-L', cat: 'Randonnée', sup: decathlon.id, price: 49.99, costPrice: 27, stock: 32, alertThreshold: 10, unit: 'pièce' },
    { name: 'Casque vélo Rockrider ST', sku: 'CAS-RR-M', cat: 'Cyclisme', sup: decathlon.id, price: 24.99, costPrice: 12, stock: 14, alertThreshold: 8, unit: 'pièce' },
    { name: 'Lunettes de natation Speedo', sku: 'LUN-NAT-SP', cat: 'Natation', sup: decathlon.id, price: 12.99, costPrice: 6, stock: 3, alertThreshold: 10, unit: 'pièce' },
    { name: 'Chaussettes sport (lot de 3)', sku: 'CHA-LOT3', barcode: '3600010000109', cat: 'Vêtements', sup: puma.id, price: 7.99, costPrice: 3, stock: 200, alertThreshold: 30, unit: 'lot' },
    { name: 'Gants de gardien Predator', sku: 'GAN-PRED-9', cat: 'Football', sup: adidas.id, price: 34.99, costPrice: 19, stock: 0, alertThreshold: 5, unit: 'paire' },
  ];

  // Index des produits créés (par SKU) pour les achats de démo ci-dessous.
  const bySku: Record<string, string> = {};
  for (const p of products) {
    const product = await prisma.product.create({
      data: {
        name: p.name,
        sku: p.sku,
        barcode: p.barcode ?? null,
        price: p.price,
        costPrice: p.costPrice,
        stock: p.stock,
        alertThreshold: p.alertThreshold,
        unit: p.unit,
        categoryId: categories[p.cat],
        supplierId: p.sup,
      },
    });
    bySku[p.sku] = product.id;
    // Mouvement d'entrée pour le stock initial (cohérent avec la logique produits).
    if (p.stock > 0) {
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          type: MovementType.in,
          quantity: p.stock,
          reason: 'Stock initial',
        },
      });
    }
  }

  // --- Achats fournisseurs de démo ---
  // Réappro de produits à stock sain (on évite les ruptures/faibles qui illustrent les badges).
  // Reproduit la logique du service : incrément du stock + mouvement `Achat` + CMUP.
  const round2 = (n: number) => Math.round(n * 100) / 100;
  type SeedPurchaseItem = { sku: string; quantity: number; unitCost: number };
  async function seedPurchase(
    supplierId: string,
    notes: string,
    items: SeedPurchaseItem[],
  ) {
    const total = items.reduce((s, it) => s + it.unitCost * it.quantity, 0);
    const purchase = await prisma.purchase.create({
      data: {
        supplierId,
        notes,
        totalAmount: round2(total),
        createdById: owner.id,
        items: {
          create: items.map((it) => ({
            productId: bySku[it.sku],
            quantity: it.quantity,
            unitCost: it.unitCost,
          })),
        },
      },
    });
    for (const it of items) {
      const product = await prisma.product.findUnique({
        where: { id: bySku[it.sku] },
      });
      if (!product) continue;
      // CMUP (cohérent avec PurchasesService).
      const newStock = product.stock + it.quantity;
      const newCost =
        product.stock <= 0
          ? it.unitCost
          : round2(
              (product.stock * Number(product.costPrice) +
                it.quantity * it.unitCost) /
                newStock,
            );
      await prisma.product.update({
        where: { id: bySku[it.sku] },
        data: { stock: { increment: it.quantity }, costPrice: newCost },
      });
      await prisma.stockMovement.create({
        data: {
          productId: bySku[it.sku],
          type: MovementType.in,
          quantity: it.quantity,
          reason: 'Achat',
          sourceId: purchase.id,
        },
      });
    }
  }

  await seedPurchase(nike.id, 'Réassort running & football', [
    { sku: 'RUN-PEG40-42', quantity: 10, unitCost: 68 },
    { sku: 'CHF-PHGX-42', quantity: 12, unitCost: 50 },
  ]);
  await seedPurchase(decathlon.id, 'Réassort textile & accessoires', [
    { sku: 'SHO-DOM-M', quantity: 50, unitCost: 3.8 },
    { sku: 'BAL-L1-T5', quantity: 20, unitCost: 13 },
  ]);

  console.log(`Seed terminé : ${products.length} produits de démo (magasin de sport).`);
  console.log('Achats de démo : 2 réassorts fournisseurs.');
  console.log('Connexion : owner@nexus.fr / admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
