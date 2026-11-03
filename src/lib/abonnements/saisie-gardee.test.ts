// Toute écriture exposée par une server action passe par `verifierSaisie`
// (ADR-053 § 3) : un impayé ferme la saisie du titulaire, jamais la lecture
// ni l'export. Même balayage que `auth/tenancy-ecritures.test.ts`
// (`ecrituresExposees`), même forme d'exception que `tenancy-routes` : une
// liste FERMÉE, chaque entrée avec son motif.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { decoupe } from "@/lib/auth/tenancy-portee";
import { ecrituresExposees } from "@/lib/auth/tenancy-sonde";

/** Écritures qui restent ouvertes quand la saisie est fermée. */
const OUVERTES = new Map<string, string>([
  ["lib/auth/actions.ts:activerDoubleAuthAction", "le compte et sa sécurité (connexion, inscription, mot de passe, double authentification) : jamais fermés"],
  ["lib/auth/actions.ts:changerMotDePasseAction", "le compte et sa sécurité (connexion, inscription, mot de passe, double authentification) : jamais fermés"],
  ["lib/auth/actions.ts:confirmerDoubleAuthAction", "le compte et sa sécurité (connexion, inscription, mot de passe, double authentification) : jamais fermés"],
  ["lib/auth/actions.ts:definirMotDePasseAction", "le compte et sa sécurité (connexion, inscription, mot de passe, double authentification) : jamais fermés"],
  ["lib/auth/actions.ts:gererDoubleAuthAction", "le compte et sa sécurité (connexion, inscription, mot de passe, double authentification) : jamais fermés"],
  ["lib/auth/actions.ts:requestPasswordResetAction", "le compte et sa sécurité (connexion, inscription, mot de passe, double authentification) : jamais fermés"],
  ["lib/auth/actions.ts:signInAction", "le compte et sa sécurité (connexion, inscription, mot de passe, double authentification) : jamais fermés"],
  ["lib/auth/actions.ts:signUpAction", "le compte et sa sécurité (connexion, inscription, mot de passe, double authentification) : jamais fermés"],
  ["lib/auth/actions.ts:verifierSecondFacteurAction", "le compte et sa sécurité (connexion, inscription, mot de passe, double authentification) : jamais fermés"],
  ["lib/assistance/actions.ts:demanderAssistance", "joindre l'assistance, y compris pour une question d'abonnement"],
  ["lib/access-tokens/actions.ts:revoquerAccessToken", "retirer l'accès d'un prestataire : une mesure de sécurité"],
  ["lib/accessibilite/actions.ts:depublierRegistre", "retirer une page publique : une mesure de protection"],
  ["lib/signatures/actions.ts:poserSignatureAvecToken", "acte d'un tiers par lien vérifié, pas du titulaire"],
  ["lib/signatures/actions.ts:renvoyerCodeOtp", "acte d'un tiers par lien vérifié, pas du titulaire"],
  ["lib/entreprises/actions.ts:supprimerEntreprise", "supprimer ses données reste possible à tout moment (RGPD, règle 9)"],
  ["lib/etablissements/actions.ts:supprimerEtablissement", "supprimer ses données reste possible à tout moment (RGPD, règle 9)"],
]);

const appelle = (nom: string, corps: string) => new RegExp(`(?<![\\w$.])${nom}\\(`).test(corps);

/** Le corps de l'action, plus les fonctions du même fichier qu'elle appelle. */
function gardee(cle: string): boolean {
  const [fichier, nom] = cle.split(":");
  const fns = decoupe(readFileSync(join(process.cwd(), "src", fichier), "utf8"));
  const fn = fns.get(nom);
  if (!fn) return false;
  const appelees = [...fns.values()].filter((f) => f.nom !== nom && appelle(f.nom, fn.corps));
  return [fn, ...appelees].some((f) => appelle("verifierSaisie", f.corps));
}

describe("la saisie fermée (ADR-053 § 3)", () => {
  const ecritures = ecrituresExposees().map((e) => e.cle).sort();

  it("le balayage voit les écritures exposées", () => {
    expect(ecritures.length).toBeGreaterThan(50);
  });

  it("chaque écriture exposée appelle verifierSaisie, sauf les ouvertes nommées", () => {
    const sansGarde = ecritures.filter((c) => !OUVERTES.has(c) && !gardee(c));
    expect(
      sansGarde,
      "Appelez `await verifierSaisie()` en tête de l'action (`@/lib/abonnements/saisie`), " +
        "ou nommez-la dans OUVERTES avec son motif si elle doit rester ouverte à un compte impayé.",
    ).toEqual([]);
  });

  it("les ouvertes existent, et aucune n'appelle verifierSaisie", () => {
    expect([...OUVERTES.keys()].filter((c) => !ecritures.includes(c))).toEqual([]);
    expect([...OUVERTES.keys()].filter(gardee)).toEqual([]);
  });
});
