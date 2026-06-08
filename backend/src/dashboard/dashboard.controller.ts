import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private dash: DashboardService) {}

  @Get('stats')
  @Roles('owner')
  stats(@Query('period') period = '30d') {
    return this.dash.stats(period);
  }

  @Get('revenue-series')
  @Roles('owner')
  revenueSeries(@Query('days') days?: string) {
    return this.dash.revenueSeries(Number(days) || 30);
  }

  @Get('top-products')
  @Roles('owner')
  topProducts(@Query('period') period = '30d') {
    return this.dash.topProducts(period);
  }

  @Get('category-breakdown')
  @Roles('owner')
  categoryBreakdown(@Query('period') period = '30d') {
    return this.dash.categoryBreakdown(period);
  }

  // Accessibles aussi à l'employé (son espace).
  @Get('low-stock')
  lowStock() {
    return this.dash.lowStock();
  }

  @Get('recent-sales')
  recentSales() {
    return this.dash.recentSales();
  }
}
