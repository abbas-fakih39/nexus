import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

// Module Achats réservé à l'owner (chaque route est @Roles('owner')).
@Controller('purchases')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PurchasesController {
  constructor(private purchases: PurchasesService) {}

  @Get()
  @Roles('owner')
  findAll(@Query('from') from?: string, @Query('to') to?: string) {
    return this.purchases.findAll({ from, to });
  }

  @Get(':id')
  @Roles('owner')
  findOne(@Param('id') id: string) {
    return this.purchases.findOne(id);
  }

  @Post()
  @Roles('owner')
  create(@CurrentUser() user: { id: string }, @Body() dto: CreatePurchaseDto) {
    return this.purchases.create(user.id, dto);
  }

  @Post(':id/cancel')
  @Roles('owner')
  cancel(@Param('id') id: string) {
    return this.purchases.cancel(id);
  }
}
