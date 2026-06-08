import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TardinessService } from './tardiness.service';
import { CreateTardinessDto } from './dto/create-tardiness.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('tardiness')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TardinessController {
  constructor(private tardiness: TardinessService) {}

  @Get()
  @Roles('owner')
  findAll(@Query('employeeId') employeeId?: string) {
    return this.tardiness.findAll(employeeId);
  }

  @Post()
  @Roles('owner')
  create(@Body() dto: CreateTardinessDto) {
    return this.tardiness.create(dto);
  }

  @Delete(':id')
  @Roles('owner')
  remove(@Param('id') id: string) {
    return this.tardiness.remove(id);
  }
}
