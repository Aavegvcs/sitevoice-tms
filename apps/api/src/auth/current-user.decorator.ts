import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AppAbility } from '../casl/casl-ability.factory';
import { AuthUser } from './auth.types';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => ctx.switchToHttp().getRequest().user,
);

export const CurrentAbility = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AppAbility => ctx.switchToHttp().getRequest().ability,
);
