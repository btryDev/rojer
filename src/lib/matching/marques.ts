// Ce qu'une ligne retenue par prudence dit d'elle-même, sur TOUTES les
// surfaces (analyse du 2026-09-27, § 6.3 et étape 1 de sa recommandation).
//
// Jusqu'ici, seul l'écran des états permanents traduisait `sansReponse` et
// `effectifAConfirmer` en phrases ; le calendrier, le dossier PDF, le ZIP et
// le MCP affichaient la même ligne comme une ligne due. Une mention calculée et
// jamais montrée est un silence de plus : la traduction vit donc ici, une fois,
// et chaque surface la lit.
//
// Module pur, sans dépendance au runtime.

import { phraseEffectifAConfirmer } from "./effectif-entreprise";
import { PHRASE_SANS_REPONSE } from "./sans-reponse";
import type { ObligationApplicable, QuestionSansReponse } from "./types";

/** Les phrases « à confirmer » d'une ligne, vide si rien ne la retient par prudence. */
export function phrasesAConfirmer(
  app: Pick<ObligationApplicable, "sansReponse" | "effectifAConfirmer">,
): string[] {
  const phrases: string[] = [];
  if (app.effectifAConfirmer) {
    phrases.push(
      phraseEffectifAConfirmer(
        app.effectifAConfirmer,
        "cette obligation ne vous concerne pas",
      ),
    );
  }
  for (const q of app.sansReponse ?? []) phrases.push(PHRASE_SANS_REPONSE[q]);
  return phrases;
}

/**
 * La marque d'une ligne : ses phrases, et si l'une d'elles renvoie à
 * l'effectif de l'ENTREPRISE — la surface qui l'affiche doit alors porter le
 * lien vers cette fiche-là (`LienEffectifEntreprise`), pas vers celle de
 * l'établissement.
 */
export type MarqueAConfirmer = { phrases: string[]; effectif: boolean };

/**
 * Les marques par identifiant d'obligation. La marque tient à la typologie, pas
 * à l'équipement : toutes les lignes d'une même obligation la partagent.
 * N'y figurent que les obligations qui en portent une.
 */
export function marquesParObligation(
  applicables: readonly ObligationApplicable[],
): Map<string, MarqueAConfirmer> {
  const out = new Map<string, MarqueAConfirmer>();
  for (const app of applicables) {
    const phrases = phrasesAConfirmer(app);
    if (phrases.length > 0) {
      out.set(app.obligation.id, {
        phrases,
        effectif: Boolean(app.effectifAConfirmer),
      });
    }
  }
  return out;
}

/** Les questions de la fiche dont le silence retient au moins une ligne. */
export function questionsQuiRetiennent(
  applicables: readonly ObligationApplicable[],
): QuestionSansReponse[] {
  const out = new Set<QuestionSansReponse>();
  for (const app of applicables) for (const q of app.sansReponse ?? []) out.add(q);
  return [...out];
}
