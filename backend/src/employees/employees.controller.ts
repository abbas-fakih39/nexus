import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmployeesController {
  constructor(private employees: EmployeesService) {}

  @Get()
  @Roles('owner')
  findAll() {
    return this.employees.findAll();
  }

  // Déclarée avant ':id' pour que « me » ne soit pas pris pour un identifiant.
  // Pas de @Roles → accessible à tout utilisateur authentifié (l'employé voit sa fiche).
  @Get('me')
  findMine(@CurrentUser() me: { id: string }) {
    return this.employees.findMine(me.id);
  }

  @Get(':id')
  @Roles('owner')
  findOne(@Param('id') id: string) {
    return this.employees.findOne(id);
  }

  @Post()
  @Roles('owner')
  create(@Body() dto: CreateEmployeeDto) {
    return this.employees.create(dto);
  }

  @Patch(':id')
  @Roles('owner')
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.employees.update(id, dto);
  }

  @Delete(':id')
  @Roles('owner')
  remove(@Param('id') id: string) {
    return this.employees.remove(id);
  }
}
