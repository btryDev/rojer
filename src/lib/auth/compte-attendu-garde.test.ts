import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { fonctions, fonctionsAtteintes, modulesServerAction, type Fonction } from "./tenancy-sonde";

/**
 * Une server action SANS identifiant qui lit le compte actif compare le compte
 * de la page (`memeCompteQueLaPage`), ou dit ici pourquoi elle n'en a pas
 * besoin (audit de sécurité du 2026-11-10, point 8).
 *
 * Le compte actif est une préférence de la session, partagée par les onglets.
 * Une action qui reçoit un identifiant est protégée par lui : celui d'un autre
 * compte donne un 404. Une action qui n'en reçoit aucun agirait en silence sur
 * le compte qu'un autre onglet vient de choisir. La liste de ces actions ne se
 * tient pas à la main : ce balayage la dresse, et une action nouvelle échoue
 * tant qu'elle n'a ni contrôle ni motif.
 *
 * Reconnaît : une action exportée d'un module `"use server"` dont les
 * paramètres ne sont que l'état précédent et le `FormData`, et qui appelle —
 * elle, ou une fonction de son fichier — `requireCompte`, `getOptionalCompte`,
 * `requireCompteDOnboarding` ou `verifierProprietaire`. Le contrôle se cherche
 * dans tout ce qu'elle atteint, d'un module à l'autre.
 *
 * NE VOIT PAS : une action qui ne lit le compte actif que par une fonction
 * d'un autre module (`demarrerEssaiAction`, protégée par
 * `requireCompteDOnboarding` dans `essai.ts`), ni un identifiant posté dans le
 * `FormData` — c'est ce que disent les motifs ci-dessous.
 */

const LIT_LE_COMPTE_ACTIF = /\b(?:requireCompte|getOptionalCompte|requireCompteDOnboarding|verifierProprietaire)\(/;
const SANS_IDENTIFIANT = /^(?:_?prev\w*|formData)$/;

/** `fichier:action` → pourquoi elle n'a pas besoin du compte de la page. */
const EXEMPTEES: Record<string, string> = {
  "lib/assistance/actions.ts:demanderAssistance":
    "l'établissement posté est vérifié (404 hors du compte) ; sans lui, une demande d'aide rangée ailleurs, sans effet sur les données",
  "lib/membres/actions.ts:annulerInvitation": "l'invitation postée doit être au compte vérifié (`invitationsDuCompte`)",
  "lib/membres/actions.ts:changerRoleMembre": "le plugin refuse un membre d'un autre compte (FORBIDDEN)",
  "lib/membres/actions.ts:retirerMembre": "le plugin refuse un membre d'un autre compte (MEMBER_NOT_FOUND)",
  "lib/membres/actions.ts:choisirCompte": "le geste choisit le compte posté : il ne lit l'actif que pour la personne",
  "lib/membres/actions.ts:refuserInvitation": "l'invitation de la session ; le compte actif ne sert qu'à choisir la redirection",
};

/** Le corps de l'action et des fonctions de son fichier qu'elle appelle. */
function corpsDansLeFichier(fn: Fonction, parNom: Map<string, Fonction>): string {
  const vus = new Set([fn.nom]);
  const pile = [fn];
  let corps = "";
  while (pile.length > 0) {
    const f = pile.pop()!;
    corps += f.corps;
    for (const [nom, autre] of parNom)
      if (!vus.has(nom) && new RegExp(`\\b${nom}\\(`).test(f.corps)) {
        vus.add(nom);
        pile.push(autre);
      }
  }
  return corps;
}

function parametres(fn: Fonction): string[] {
  const sig = /\(([\s\S]*?)\)\s*(?::\s*Promise<[^\n{]*>)?\s*\{/.exec(fn.corps)?.[1] ?? "?";
  return sig.split(",").map((p) => p.trim().split(/[:=?]/)[0].trim()).filter(Boolean);
}

const releve = (() => {
  const controlees: string[] = [];
  const sansControle: string[] = [];
  for (const fichier of modulesServerAction()) {
    const fns = fonctions(readFileSync(fichier, "utf8"));
    const parNom = new Map(fns.map((f) => [f.nom, f]));
    for (const fn of fns.filter((f) => f.exportee)) {
      if (!parametres(fn).every((p) => SANS_IDENTIFIANT.test(p))) continue;
      if (!LIT_LE_COMPTE_ACTIF.test(corpsDansLeFichier(fn, parNom))) continue;
      const cle = `${relative(`${process.cwd()}/src`, fichier)}:${fn.nom}`;
      const controle = fonctionsAtteintes(fichier, fn.nom).fonctions.some(({ fn: f }) => /\bmemeCompteQueLaPage\(/.test(f.corps));
      (controle ? controlees : sansControle).push(cle);
    }
  }
  return { controlees: controlees.sort(), sansControle: sansControle.sort() };
})();

describe("le compte de la page (audit de sécurité du 2026-11-10, point 8)", () => {
  it("le balayage voit les gestes contrôlés par ce lot", () => {
    expect(releve.controlees).toEqual(
      expect.arrayContaining([
        "lib/abonnements/actions.ts:sAbonnerAction",
        "lib/abonnements/actions.ts:changerFormuleAction",
        "lib/membres/actions.ts:inviterMembre",
        "lib/membres/actions.ts:quitterCompte",
        "lib/onboarding/actions.ts:finaliserOnboarding",
      ]),
    );
  });

  it("une action sans identifiant qui lit le compte actif le compare au compte de la page, ou dit pourquoi", () => {
    expect(releve.sansControle.filter((cle) => !(cle in EXEMPTEES))).toEqual([]);
  });

  it("chaque exemption désigne une action qui existe et n'a toujours pas de contrôle", () => {
    expect(Object.keys(EXEMPTEES).filter((cle) => !releve.sansControle.includes(cle))).toEqual([]);
  });
});
