import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private users: UsersService,
    private jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) throw new BadRequestException('Cet email est déjà utilisé');

    const password = await bcrypt.hash(dto.password, 10);
    const user = await this.users.create({
      email: dto.email,
      password,
      name: dto.name,
      role: 'owner',
    });

    const token = this.signToken(user.id, user.email, user.role);
    return { token };
  }

  async login(dto: LoginDto) {
    const user = await this.users.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Identifiants invalides');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Identifiants invalides');

    if (!user.isActive)
      throw new UnauthorizedException('Compte désactivé. Contactez le gérant.');

    const token = this.signToken(user.id, user.email, user.role);
    return { token };
  }

  async me(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException();
    const { password: _, ...result } = user;
    return result;
  }

  private signToken(id: string, email: string, role: string) {
    return this.jwt.sign({ sub: id, email, role });
  }
}
