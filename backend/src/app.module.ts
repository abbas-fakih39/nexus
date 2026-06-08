import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { EmployeesModule } from './employees/employees.module';
import { SalariesModule } from './salaries/salaries.module';
import { AbsencesModule } from './absences/absences.module';
import { TardinessModule } from './tardiness/tardiness.module';
import { OvertimeModule } from './overtime/overtime.module';
import { CategoriesModule } from './categories/categories.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { ProductsModule } from './products/products.module';
import { StockModule } from './stock/stock.module';
import { SalesModule } from './sales/sales.module';
import { PurchasesModule } from './purchases/purchases.module';
import { InvoicesModule } from './invoices/invoices.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [
    // Limite globale anti-abus : 120 requêtes / minute / IP.
    // Désactivée en environnement de test (e2e) pour ne pas fausser les suites.
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: 120 }],
      skipIf: () => process.env.NODE_ENV === 'test',
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    EmployeesModule,
    SalariesModule,
    AbsencesModule,
    TardinessModule,
    OvertimeModule,
    CategoriesModule,
    SuppliersModule,
    ProductsModule,
    StockModule,
    SalesModule,
    PurchasesModule,
    InvoicesModule,
    DashboardModule,
    SettingsModule,
  ],
  controllers: [],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
