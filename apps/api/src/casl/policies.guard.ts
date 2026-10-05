import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppAbility } from './casl-ability.factory';

export const PERMISSION_KEY = 'requiredPermission';

/** Route-level gate: the user's role must hold this permission (for any row). */
export const RequirePermission = (action: string, subject: string) =>
  SetMetadata(PERMISSION_KEY, { action, subject });

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<{ action: string; subject: string }>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const ability: AppAbility | undefined = context.switchToHttp().getRequest().ability;
    if (!ability || !ability.can(required.action, required.subject)) {
      throw new ForbiddenException('You do not have permission to do this');
    }
    return true;
  }
}
