import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { CaslAbilityFactory } from '../casl/casl-ability.factory';
import { IS_PUBLIC_KEY } from '../common/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { AuthedRequest, JwtPayload } from './auth.types';

export const ACCESS_COOKIE = 'access_token';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly casl: CaslAbilityFactory,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request & Partial<AuthedRequest>>();
    const token = this.extractToken(req);
    if (!token) throw new UnauthorizedException();

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException();
    }

    // Loaded fresh on every request, so deactivation and permission changes apply immediately.
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: { include: { permissions: true } }, sites: { select: { siteId: true } } },
    });
    if (!user || !user.isActive) throw new UnauthorizedException();

    const siteIds = user.sites.map((s) => s.siteId);
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name,
      roleId: user.roleId,
      siteIds,
    };
    req.permissions = user.role.permissions;
    req.ability = this.casl.build(user.role.permissions, { id: user.id, siteIds });
    return true;
  }

  private extractToken(req: Request): string | undefined {
    const cookie = req.cookies?.[ACCESS_COOKIE];
    if (cookie) return cookie;
    const [type, token] = req.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
