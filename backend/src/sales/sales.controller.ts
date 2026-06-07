import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('sales')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalesController {
  constructor(private sales: SalesService) {}

  @Get()
  findAll(@Query('from') from?: string, @Query('to') to?: string) {
    return this.sales.findAll({ from, to });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sales.findOne(id);
  }

  // Les deux rôles peuvent encaisser (l'employé est le caissier).
  @Post()
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateSaleDto) {
    return this.sales.create(user.id, dto);
  }

  @Post(':id/cancel')
  @Roles('owner')
  cancel(@Param('id') id: string) {
    return this.sales.cancel(id);
  }
}
