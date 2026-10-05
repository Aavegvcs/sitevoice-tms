import { AppAbility, PermissionRow } from '../casl/casl-ability.factory';

export interface JwtPayload {
  sub: string;
  role: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  roleId: string;
  siteIds: string[];
}

/** Express request after JwtAuthGuard has run. */
export interface AuthedRequest {
  user: AuthUser;
  ability: AppAbility;
  permissions: PermissionRow[];
}
