import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { SalariesService } from './salaries.service';
import { CreateSalaryPaymentDto } from './dto/create-salary-payment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('salary-payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalariesController {
  constructor(private salaries: SalariesService) {}

  @Get()
  @Roles('owner')
  findAll() {
    return this.salaries.findAll();
  }

  @Post()
  @Roles('owner')
  create(@Body() dto: CreateSalaryPaymentDto) {
    return this.salaries.create(dto);
  }
}
