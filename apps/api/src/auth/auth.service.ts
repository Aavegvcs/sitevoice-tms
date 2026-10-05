import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from './auth.types';

export type SessionUser = Pick<AuthUser, 'id' | 'name' | 'email' | 'role'>;

export const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface Session {
  user: SessionUser;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  // Compared against when the email is unknown, so timing doesn't reveal which emails exist.
  private readonly dummyHash = bcrypt.hashSync('not-a-real-password', 10);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string): Promise<Session> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: { role: true },
    });
    const ok = await bcrypt.compare(password, user?.passwordHash ?? this.dummyHash);
    if (!user || !ok || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.issueSession({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name,
    });
  }

  /** Rotates the refresh token: the presented one is revoked and a new pair is issued. */
  async refresh(rawToken: string | undefined): Promise<Session> {
    if (!rawToken) throw new UnauthorizedException();
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hash(rawToken) },
      include: { user: { include: { role: true } } },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date() || !stored.user.isActive) {
      // Replay of an already-revoked token suggests theft: end every session for that user.
      if (stored?.revokedAt) {
        await this.prisma.refreshToken.updateMany({
          where: { userId: stored.userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      throw new UnauthorizedException();
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    const u = stored.user;
    return this.issueSession({ id: u.id, name: u.name, email: u.email, role: u.role.name });
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.hash(rawToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueSession(user: SessionUser): Promise<Session> {
    const accessToken = await this.jwt.signAsync({ sub: user.id, role: user.role });
    const refreshToken = randomBytes(48).toString('base64url');
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hash(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });
    return { user, accessToken, refreshToken };
  }

  private hash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
