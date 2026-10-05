import { Ability } from '@casl/ability';
import { createPrismaAbility } from '@casl/prisma';
import { Injectable } from '@nestjs/common';
import { PermissionScope } from '@prisma/client';
import { SCOPED_SUBJECT } from './casl.catalog';

// Subjects are the catalog names plus "all"; any model instance is tagged with subject().
export type AppAbility = Ability<[string, any], any>;

export interface PermissionRow {
  action: string;
  subject: string;
  scope: PermissionScope;
}

export interface AbilityUser {
  id: string;
  siteIds: string[];
}

@Injectable()
export class CaslAbilityFactory {
  /** Turns a role's stored permission rows into a CASL ability for one user. */
  build(permissions: PermissionRow[], user: AbilityUser): AppAbility {
    const rules = permissions.map((p) => ({
      action: p.action,
      subject: p.subject,
      conditions: p.subject === SCOPED_SUBJECT ? this.conditions(p.scope, user) : undefined,
    }));
    return createPrismaAbility<[string, any], any>(rules);
  }

  /** Prisma where-fragments, so the same rule filters list queries and checks single rows. */
  private conditions(scope: PermissionScope, user: AbilityUser) {
    switch (scope) {
      case 'SITES':
        return { siteId: { in: user.siteIds } };
      case 'OWN':
        return { raisedById: user.id };
      default:
        return undefined;
    }
  }

  /** Plain rules for the browser: what the user may do at all, without row conditions. */
  toClientRules(permissions: PermissionRow[]) {
    const seen = new Set<string>();
    const out: { action: string; subject: string }[] = [];
    for (const p of permissions) {
      const key = `${p.action}:${p.subject}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push({ action: p.action, subject: p.subject });
      }
    }
    return out;
  }
}
