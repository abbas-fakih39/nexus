-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('card', 'cash', 'transfer');

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'card';
