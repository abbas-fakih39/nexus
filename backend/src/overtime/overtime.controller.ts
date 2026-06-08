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
import { OvertimeService } from './overtime.service';
import { CreateOvertimeDto } from './dto/create-overtime.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('overtime')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OvertimeController {
  constructor(private overtime: OvertimeService) {}

  @Get()
  @Roles('owner')
  findAll(@Query('employeeId') employeeId?: string) {
    return this.overtime.findAll(employeeId);
  }

  @Post()
  @Roles('owner')
  create(@Body() dto: CreateOvertimeDto) {
    return this.overtime.create(dto);
  }

  @Delete(':id')
  @Roles('owner')
  remove(@Param('id') id: string) {
    return this.overtime.remove(id);
  }
}
