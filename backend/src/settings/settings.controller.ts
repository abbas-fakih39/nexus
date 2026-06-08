import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SetLogoDto } from './dto/set-logo.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
  constructor(private settings: SettingsService) {}

  // Lecture par tous (sidebar, PDF, en-têtes).
  @Get()
  get() {
    return this.settings.get();
  }

  @Patch()
  @Roles('owner')
  update(@Body() dto: UpdateSettingsDto) {
    return this.settings.update(dto);
  }

  @Post('logo')
  @Roles('owner')
  setLogo(@Body() dto: SetLogoDto) {
    return this.settings.setLogo(dto.logo);
  }
}
