import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

jest.mock('bcrypt');
const mockedHash = bcrypt.hash as jest.Mock;
const mockedCompare = bcrypt.compare as jest.Mock;

describe('AuthService', () => {
  let service: AuthService;
  let users: { findByEmail: jest.Mock; create: jest.Mock; findById: jest.Mock };
  let jwt: { sign: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    users = { findByEmail: jest.fn(), create: jest.fn(), findById: jest.fn() };
    jwt = { sign: jest.fn().mockReturnValue('jwt-token') };
    service = new AuthService(users as never, jwt as never);
  });

  describe('register', () => {
    const dto = {
      email: 'owner@nexus.fr',
      password: 'secret123',
      name: 'Karim',
    };

    it('refuse un email déjà utilisé', async () => {
      users.findByEmail.mockResolvedValue({ id: 'u1' });
      await expect(service.register(dto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(users.create).not.toHaveBeenCalled();
    });

    it('hache le mot de passe, crée un owner et renvoie un token', async () => {
      users.findByEmail.mockResolvedValue(null);
      mockedHash.mockResolvedValue('hashed-pw');
      users.create.mockResolvedValue({
        id: 'u1',
        email: dto.email,
        role: 'owner',
      });

      const result = await service.register(dto);

      expect(mockedHash).toHaveBeenCalledWith('secret123', 10);
      expect(users.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: dto.email,
          password: 'hashed-pw',
          name: 'Karim',
          role: 'owner',
        }),
      );
      expect(jwt.sign).toHaveBeenCalledWith({
        sub: 'u1',
        email: dto.email,
        role: 'owner',
      });
      expect(result).toEqual({ token: 'jwt-token' });
    });
  });

  describe('login', () => {
    const dto = { email: 'a@b.fr', password: 'secret123' };
    const activeUser = {
      id: 'u1',
      email: dto.email,
      password: 'hash',
      role: 'employee',
      isActive: true,
    };

    it('échoue si l’email est inconnu', async () => {
      users.findByEmail.mockResolvedValue(null);
      await expect(service.login(dto)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('échoue si le mot de passe est invalide', async () => {
      users.findByEmail.mockResolvedValue(activeUser);
      mockedCompare.mockResolvedValue(false);
      await expect(service.login(dto)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('échoue si le compte est désactivé', async () => {
      users.findByEmail.mockResolvedValue({ ...activeUser, isActive: false });
      mockedCompare.mockResolvedValue(true);
      await expect(service.login(dto)).rejects.toThrow(
        'Compte désactivé. Contactez le gérant.',
      );
    });

    it('renvoie un token quand les identifiants sont valides', async () => {
      users.findByEmail.mockResolvedValue(activeUser);
      mockedCompare.mockResolvedValue(true);
      const result = await service.login(dto);
      expect(jwt.sign).toHaveBeenCalledWith({
        sub: 'u1',
        email: dto.email,
        role: 'employee',
      });
      expect(result).toEqual({ token: 'jwt-token' });
    });
  });

  describe('me', () => {
    it('échoue si l’utilisateur n’existe pas', async () => {
      users.findById.mockResolvedValue(null);
      await expect(service.me('u1')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('renvoie le profil sans le mot de passe', async () => {
      users.findById.mockResolvedValue({
        id: 'u1',
        email: 'a@b.fr',
        name: 'Karim',
        role: 'owner',
        password: 'hash',
      });
      const result = await service.me('u1');
      expect(result).not.toHaveProperty('password');
      expect(result).toMatchObject({
        id: 'u1',
        email: 'a@b.fr',
        role: 'owner',
      });
    });
  });
});
