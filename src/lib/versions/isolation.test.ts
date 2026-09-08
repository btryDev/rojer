// Cloisonnement de `construireSnapshot` (ADR-005).
//
// La route `duerp/[id]/pdf/preview` raconte la fuite : l'aperçu PDF rendait
// le DUERP complet d'un autre utilisateur — raison sociale, SIRET, adresse,
// unités, risques, cotations, mesures — à qui connaissait un identifiant. Le
// prédicat `etablissement: { entreprise: { userId } }` a été ajouté dans
// `snapshot-builder.ts`, et sa docstring l'explique.
//
// Rien ne le gardait. `snapshot-builder.test.ts` simule `findFirst` par une
// fonction qui rend la fixture quel que soit le `where` : retirer le prédicat
// laissait les 2442 tests verts. Et le module ne s'appelle pas `queries.ts`,
// donc le balayage de `auth/tenancy.test.ts` ne le lit pas.
//
// Même montage que `salaries/isolation.test.ts` : le faux Prisma **évalue**
// le `where` contre deux dossiers en mémoire, chaîne de relations comprise,
// et lève sur toute clause qu'il ne sait pas interpréter.

import { beforeEach, describe, expect, it, vi } from "vitest";

const USER_A = "user-a";
const USER_B = "user-b";
const DUERP_A = "duerp-a";
const DUERP_B = "duerp-b";

const h = vi.hoisted(() => {
  type Ligne = Record<string, unknown>;

  const db = {
    entreprises: [] as Ligne[],
    etablissements: [] as Ligne[],
    duerps: [] as Ligne[],
  };

  const RELATIONS: Record<string, (l: Ligne) => Ligne | undefined> = {
    etablissement: (d) =>
      db.etablissements.find((e) => e.id === d.etablissementId),
    entreprise: (e) =>
      db.entreprises.find((en) => en.id === e.entrepriseId),
  };

  function correspond(ligne: Ligne, where: Ligne): boolean {
    for (const [cle, attendu] of Object.entries(where)) {
      const relation = RELATIONS[cle];
      if (relation) {
        const liee = relation(ligne);
        if (!liee) return false;
        if (!correspond(liee, attendu as Ligne)) return false;
        continue;
      }
      if (attendu !== null && typeof attendu === "object") {
        throw new Error(
          `Faux Prisma : filtre non géré sur « ${cle} » — ` +
            `${JSON.stringify(attendu)}. Étendre \`correspond\` plutôt que ` +
            `laisser passer une clause non évaluée.`,
        );
      }
      if (ligne[cle] !== attendu) return false;
    }
    return true;
  }

  /**
   * Le seul `include` du module : l'établissement et son entreprise, et les
   * unités. Les unités sont vides dans ces fixtures — ce fichier regarde qui
   * obtient le document, pas ce qu'il contient.
   */
  function inclure(duerp: Ligne): Ligne {
    const etablissement = RELATIONS.etablissement(duerp)!;
    return {
      ...duerp,
      etablissement: { ...etablissement, entreprise: RELATIONS.entreprise(etablissement) },
      unites: [],
    };
  }

  const prisma = {
    duerp: {
      findFirst: async ({ where }: { where: Ligne }) => {
        const trouve = db.duerps.find((d) => correspond(d, where));
        return trouve ? inclure(trouve) : null;
      },
    },
  };

  const utilisateur = { id: "user-a" };
  const requireUser = vi.fn(async () => ({ id: utilisateur.id }));

  return { db, prisma, requireUser, utilisateur };
});

vi.mock("@/lib/prisma", () => ({ prisma: h.prisma }));
vi.mock("@/lib/auth/require-user", () => ({ requireUser: h.requireUser }));

const { construireSnapshot } = await import("./snapshot-builder");

function dossier(suffixe: "a" | "b") {
  const entreprise = {
    id: `ent-${suffixe}`,
    userId: `user-${suffixe}`,
    raisonSociale: `Société ${suffixe.toUpperCase()}`,
    siret: `1234567890123${suffixe === "a" ? 4 : 5}`,
    codeNaf: "47.11B",
  };
  const etablissement = {
    id: `etab-${suffixe}`,
    entrepriseId: entreprise.id,
    codeNaf: "47.11B",
    effectifSurSite: 3,
    adresse: `${suffixe} rue du Marché`,
  };
  const duerp = {
    id: `duerp-${suffixe}`,
    etablissementId: etablissement.id,
    referentielSecteurId: "commerce",
    reponsesActivitesNonCouvertes: null,
  };
  return { entreprise, etablissement, duerp };
}

beforeEach(() => {
  const a = dossier("a");
  const b = dossier("b");
  h.db.entreprises = [a.entreprise, b.entreprise];
  h.db.etablissements = [a.etablissement, b.etablissement];
  h.db.duerps = [a.duerp, b.duerp];
  h.utilisateur.id = USER_A;
});

describe("construireSnapshot — qui obtient le document", () => {
  it("rend son propre DUERP au user connecté", async () => {
    const snap = await construireSnapshot(DUERP_A, { numero: 1, motif: null });
    expect(snap?.entreprise.raisonSociale).toBe("Société A");
  });

  it("rend null pour le DUERP d'un autre user, comme s'il n'existait pas", async () => {
    const snap = await construireSnapshot(DUERP_B, { numero: 1, motif: null });
    expect(snap).toBeNull();
  });

  it("le même identifiant devient lisible quand c'est son propriétaire qui demande", async () => {
    // Contre-épreuve : si le test précédent passait parce que DUERP_B est
    // introuvable pour tout le monde, celui-ci le dirait.
    h.utilisateur.id = USER_B;
    const snap = await construireSnapshot(DUERP_B, { numero: 1, motif: null });
    expect(snap?.entreprise.raisonSociale).toBe("Société B");
  });
});
