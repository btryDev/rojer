import { describe, expect, it } from "vitest";
import {
  fonctions,
  lectureAvantAppartenance,
  lecturesAvantAppartenance,
} from "./tenancy-sonde";

/**
 * Un identifiant ne dit pas s'il existe chez un autre client.
 *
 * ## Pourquoi ce test existe
 *
 * L'audit du 2026-10-13 a relevé le même motif à une dizaine d'endroits :
 * l'action lit l'objet par son seul `id` (`findUnique({ where: { id } })`),
 * PUIS vérifie son établissement (`assertEtablissementOwnership`). Rien ne
 * s'écrit hors périmètre — `tenancy-ecritures.test.ts` le garde —, mais la
 * réponse diffère : un id absent rend « Plan introuvable » (ou rien, ou une
 * erreur 500), un id d'un autre client rend le 404 du contrôle. L'écart suffit
 * à sonder l'existence d'un document chez autrui. Corrigé d'abord pour les
 * permis de feu (`permisDuCompte`), puis pour les plans de prévention, les
 * équipements et les rapports. Ce fichier garde la classe.
 *
 * ## La règle
 *
 * **Dans une fonction, aucune lecture unitaire (`findUnique`, `findFirst`)
 * dont le `where` ne porte pas le compte (`userId`) ne précède le premier
 * contrôle d'appartenance.** Lire borné au compte — `etablissement: {
 * entreprise: { userId } }` dans le `where` — fait de l'absent et de
 * l'étranger un seul cas ; contrôler d'abord, puis lire, aussi.
 *
 * Un contrôle d'appartenance, c'est l'appel d'un helper `require…`/`assert…`
 * de `scope.ts` (relevés, pas recopiés), de `portee(`, ou d'une fonction du
 * même fichier qui en établit un. Une lecture nue faite par une fonction du
 * même fichier compte à l'endroit où elle est appelée : `resoudreAppareil`
 * lisait pour `modifierEquipement`, qui contrôlait ensuite.
 *
 * ## Ce qu'elle ne voit pas
 *
 * - un `where` qui n'est pas un littéral (`where: scope`) : non jugé ;
 * - une lecture nue suivie d'une COMPARAISON à la main
 *   (`point.carnet.etablissementId !== etablissementId`) plutôt que d'un
 *   helper : elle n'est pas un contrôle reconnu. Elle n'est un oracle que si
 *   les deux branches répondent différemment — à relire au cas par cas ;
 * - un helper d'un AUTRE module qui lirait nu pour nous ;
 * - les parcours publics, par conception : `/acces/[token]` et
 *   `/verifier/[signatureId]` lisent un jeton ou une signature par leur
 *   identifiant, sans contrôle de compte qui suive — la règle ne s'y déclenche
 *   pas, et c'est voulu : leur garantie est que la réponse ne révèle rien
 *   au-delà de la preuve, pas une appartenance.
 *
 * ## Exemptions
 *
 * Aucune aujourd'hui. Une exemption se nommerait ici, `fichier:fonction`, avec
 * sa raison — jamais par une heuristique qui s'accorderait toute seule.
 */
const EXEMPTIONS = new Map<string, string>([]);

describe("une lecture par identifiant", () => {
  it("ne précède jamais le contrôle d'appartenance, sauf exemption nommée", () => {
    const { examinees, fautives } = lecturesAvantAppartenance();

    // Contre-épreuve : une sonde qui cesserait de voir les lectures rendrait
    // ce test vert et vide. Il y en a plusieurs centaines ; une borne basse
    // large, pas un compte recopié.
    expect(
      examinees,
      "Presque aucune fonction qui lit n'a été trouvée : la sonde ne voit plus.",
    ).toBeGreaterThan(100);

    const nues = fautives
      .filter((f) => !EXEMPTIONS.has(f.cle))
      .map((f) => `${f.cle} (lit ${f.lecture} avant de contrôler)`);
    expect(
      nues,
      "Ces fonctions lisent une ligne par son identifiant seul, PUIS vérifient " +
        "qu'elle est au compte : un id absent et un id d'un autre client n'y " +
        "répondent pas pareil — oracle d'existence. Lire borné au compte " +
        "(`where: { id, etablissement: { entreprise: { userId } } }`, cf. " +
        "`permisDuCompte`), absent et étranger tombant sur la même réponse.",
    ).toEqual([]);
  });

  it("chaque exemption désigne encore une fonction relevée", () => {
    const relevees = new Set(lecturesAvantAppartenance().fautives.map((f) => f.cle));
    expect([...EXEMPTIONS.keys()].filter((k) => !relevees.has(k))).toEqual([]);
  });
});

describe("la sonde elle-même", () => {
  const juge = (src: string, nom: string) => {
    const fns = fonctions(src);
    return lectureAvantAppartenance(
      new Map(fns.map((f) => [f.nom, f])),
      fns.find((f) => f.nom === nom)!,
    );
  };

  it("relève la lecture nue suivie du contrôle", () => {
    expect(
      juge(
        `export async function f(id) {
  const p = await prisma.plan.findUnique({ where: { id }, select: { etablissementId: true } });
  if (!p) return { status: "error" };
  await assertEtablissementOwnership(p.etablissementId);
}`,
        "f",
      ),
    ).toBe("plan.findUnique");
  });

  it("relève la lecture nue faite par un helper du même fichier", () => {
    expect(
      juge(
        `async function lire(id) {
  return prisma.equipement.findUnique({ where: { id } });
}
export async function f(id) {
  const e = await lire(id);
  await assertEtablissementOwnership(e.etablissementId);
}`,
        "f",
      ),
    ).toBe("lire → equipement.findUnique");
  });

  it("laisse la lecture bornée au compte, et la relecture après contrôle", () => {
    const src = `async function duCompte(id) {
  const user = await requireUser();
  const p = await prisma.plan.findFirst({ where: { id, etablissement: { entreprise: { userId: user.id } } } });
  if (!p) notFound();
  return p;
}
export async function f(id) {
  const p = await duCompte(id);
  const s = await tx.plan.findUnique({ where: { id } });
  await assertEtablissementOwnership(p.etablissementId);
}
export async function g(etablissementId, id) {
  await assertEtablissementOwnership(etablissementId);
  const s = await prisma.plan.findFirst({ where: { id, etablissementId } });
}`;
    expect(juge(src, "duCompte")).toBeNull();
    expect(juge(src, "f")).toBeNull();
    expect(juge(src, "g")).toBeNull();
  });
});
