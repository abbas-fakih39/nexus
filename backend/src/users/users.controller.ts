import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { SetActiveDto } from './dto/set-active.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private users: UsersService) {}

  @Get()
  @Roles('owner')
  list() {
    return this.users.listAccounts();
  }

  @Post()
  @Roles('owner')
  create(@Body() dto: CreateUserDto) {
    return this.users.createEmployeeAccount(dto);
  }

  @Patch(':id/active')
  @Roles('owner')
  setActive(
    @Param('id') id: string,
    @Body() dto: SetActiveDto,
    @CurrentUser() me: { id: string },
  ) {
    return this.users.setActive(id, dto.isActive, me.id);
  }

  @Delete(':id')
  @Roles('owner')
  remove(@Param('id') id: string, @CurrentUser() me: { id: string }) {
    return this.users.remove(id, me.id);
  }
}
