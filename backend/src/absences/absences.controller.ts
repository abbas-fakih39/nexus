import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AbsencesService } from './absences.service';
import { CreateAbsenceDto } from './dto/create-absence.dto';
import { DecideAbsenceDto } from './dto/decide-absence.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('absences')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AbsencesController {
  constructor(private absences: AbsencesService) {}

  @Get()
  @Roles('owner')
  findAll(
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    return this.absences.findAll({ employeeId, status, type });
  }

  // Pas de @Roles : l'owner saisit (→ approuvée), l'employé demande (→ en attente).
  @Post()
  create(@Body() dto: CreateAbsenceDto, @CurrentUser() me: { id: string; role: string }) {
    return this.absences.create(dto, me);
  }

  @Patch(':id/status')
  @Roles('owner')
  decide(@Param('id') id: string, @Body() dto: DecideAbsenceDto) {
    return this.absences.decide(id, dto.status);
  }

  // Owner : supprime n'importe quelle absence. Employé : annule sa demande en attente.
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() me: { id: string; role: string }) {
    return this.absences.remove(id, me);
  }
}
