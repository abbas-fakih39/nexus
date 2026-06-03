import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const password = await bcrypt.hash('admin123', 10);

  await prisma.user.upsert({
    where: { email: 'owner@nexus.fr' },
    update: {},
    create: {
      email: 'owner@nexus.fr',
      password,
      name: 'Owner',
      role: 'owner',
    },
  });

  const settingsCount = await prisma.settings.count();
  if (settingsCount === 0) {
    await prisma.settings.create({
      data: { shopName: 'Mon Magasin' },
    });
  }

  console.log('Seed terminé : owner@nexus.fr / admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
