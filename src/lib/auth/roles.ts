// Les rôles d'un membre (ADR-054 § 2). Trois, et seulement trois : la valeur
// de `Membre.role` est l'une de ces chaînes.
//
// Le plugin `organization` ne contrôle que ce qui le concerne — inviter,
// retirer, changer un rôle —, réservé au propriétaire. La lecture seule se
// fermera dans le client borné (ADR-054 § 4, lot 3).

import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, memberAc, ownerAc } from "better-auth/plugins/organization/access";

export const ROLES = ["owner", "member", "lecture"] as const;
export type Role = (typeof ROLES)[number];

export function estRole(v: unknown): v is Role {
  return typeof v === "string" && (ROLES as readonly string[]).includes(v);
}

/** Le rôle tel qu'on le dit à l'écran et dans un e-mail. */
export function libelleRole(role: string): string {
  return role === "owner" ? "propriétaire" : role === "lecture" ? "lecture seule" : "membre";
}

const ac = createAccessControl(defaultStatements);

export const ROLES_DU_PLUGIN = {
  ac,
  roles: {
    owner: ac.newRole(ownerAc.statements),
    member: ac.newRole(memberAc.statements),
    // Pour le plugin, la lecture seule ne gère rien, comme le membre.
    lecture: ac.newRole(memberAc.statements),
  },
} as const;
