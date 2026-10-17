// L'aide par type d'ERP — 2026-10-17, sous-lot D du plan « mise à jour du
// référentiel ». Un fichier à part, et non `aides-regimes.ts` : le balayage de
// non-couverture lit ce module en entier, et la prose des régimes (habitation)
// n'y a pas sa place.
//
// Module pur : il se charge dans un composant client.

import { nonPorte } from "@/lib/perimetre/non-couverture";
import type { CategorieErp, TypeErp } from "@/lib/referentiels/types-communs";

/**
 * Ce que Rojer ne suit pas pour un type d'activité, dit sous le choix du type
 * — à la création (`onboarding/StepTypologie.tsx`) et sur la fiche
 * (`etablissements/EtablissementForm.tsx`), pour le type principal comme pour
 * chacun des autres types déclarés. SURFACE NOUVELLE du sous-lot D du plan
 * « mise à jour du référentiel » (découpage validé par c6 le 2026-10-17).
 *
 * C'est une ADRESSE : le `declareA` des articles qu'elle annonce cite sa
 * phrase mot pour mot, avec `AIDE_TYPE_ERP.<type>` ; `aide-type-erp.test.ts`
 * le vérifie. Chaque sujet non suivi passe par `nonPorte(…)` : le balayage de
 * `perimetre/non-couverture-balayage.ts` lit ce module.
 *
 * Le titre II du livre II ne vise que les quatre premières catégories : chaque
 * phrase le dit. Aucune ne qualifie la situation (ligne de partage 8).
 * [2026-10-17, sous-lot E : la phrase X vient du code du sport, qui vaut en
 * toutes catégories ; elle ne parle pas des « quatre premières catégories », et
 * X est dans `TYPES_AIDE_TOUTES_CATEGORIES`.]
 *
 * ~~X : EMPLACEMENT RÉSERVÉ, vide. La phrase « piscines » du type X viendra avec
 * le lot « filtre à l'accueil » (plan, § 5) ; rien n'est dit d'ici là.~~
 * [2026-10-17, sous-lot E (`lot/ref-e-sport`, rebasé sur D) : la phrase du
 * code du sport occupe X ; la phrase « piscines » du lot « filtre à l'accueil »
 * s'ajoutera à la sienne.]
 */
export const AIDE_TYPE_ERP: Partial<Record<TypeErp, string>> = {
  // M 35 : annonce, décision de c6 du 2026-10-17 — une niche, et la mise à
  // disposition de machines-outils au public est un fait d'activité que le
  // modèle ne porte pas.
  M: `Dans un magasin des quatre premières catégories qui met des machines-outils à la disposition du public, Rojer ne suit pas ${nonPorte("la surveillance directe de ces machines par un personnel compétent de l'établissement")} (règlement de sécurité, art. M 35).`,
  // T 52 § 2, T 29 § 3, T 33 § 2, T 43, T 44 : annonces (décisions de c6 du
  // 2026-10-17 ; plan, § 5).
  // X : le code du sport — R. 322-5 (affichages, dont l'affiche Signal-sports
  // de l'arrêté du 20 mai 2025), L. 212-8 (emploi d'éducateurs qualifiés),
  // L. 321-7 (assurance), A. 322-3 (information des pratiquants) : annonces,
  // décision de la propriétaire du 2026-10-17 (sous-lot E, « on n'est pas un
  // outil de gestion de salle de sport, on n'alourdit pas »). Le code du sport
  // vaut en toutes catégories : la phrase ne dit pas « quatre premières ».
  X: `Dans un établissement sportif, Rojer ne suit pas ${nonPorte("les affichages propres aux établissements sportifs (diplômes et cartes des éducateurs, textes de sécurité, attestation d'assurance, affiche Signal-sports)")}, ${nonPorte("la qualification des éducateurs employés")}, ${nonPorte("l'assurance de responsabilité civile de l'exploitant")} ni ${nonPorte("l'information des pratiquants")} (code du sport, art. R. 322-5, L. 212-8, L. 321-7, A. 322-3).`,
  // AM 18 § 1, L 28 § 2, L 31 § 6 : annonces, décisions de c6 du 2026-10-17
  // (sous-lot G, chapitre L). Les sièges et le gaz sont dans la SALLE : ils
  // sont dits ici, pas dans l'aide de la catégorie Scène, qui porte ce qui
  // touche l'espace scénique (`DESCRIPTION_CATEGORIE.SCENE`). 2026-10-17, revue
  // de G : + L 32 § 1 pour la cabine de projection (un cinéma sans scène) et
  // le faux négatif de L 13 § 5 (des éclairages de spectacle sans scène
  // déclarée ne font rien naître).
  L: `Dans une salle de réunion, de conférences, de spectacles ou à usages multiples des quatre premières catégories, Rojer ne suit pas ${nonPorte("l'entretien de l'enveloppe des sièges rembourrés, à faire suivant la fiche technique que le fabricant vous a fournie (art. AM 18 § 1), ni le bon fonctionnement des sièges qui se relèvent automatiquement (art. L 28 § 2)")}, ni ${nonPorte("les indications visibles de tous les endroits rappelant « gaz - ne rien accrocher » sur les canalisations de gaz des salles (art. L 31 § 6)")}, ni ${nonPorte("la commande d'un circuit de l'éclairage normal depuis un endroit habituellement surveillé pendant la présence du public, quand la salle a une cabine de projection (art. L 32 § 1)")}. Si votre salle a une scène, une estrade ou un plateau de spectacle, déclarez-la au parc d'équipements (« Scène / installations scéniques ») : c'est ce qui fait naître son entretien et ses vérifications. Sans scène déclarée, Rojer ne suit pas non plus ${nonPorte("la vérification annuelle par un organisme agréé du matériel d'éclairage de spectacle et d'effets scéniques monté pour une durée limitée (art. L 13 § 5)")}, même si vous en installez.`,
  T: `Dans une salle d'exposition des quatre premières catégories, Rojer ne suit pas ${nonPorte("le nettoyage quotidien des locaux et l'enlèvement des déchets chaque jour avant l'ouverture au public")} (règlement de sécurité, art. T 52 § 2), ni ${nonPorte("la présence d'une personne compétente pendant l'ouverture au public, au-delà de 200 kW de puissance utile installée ou de 200 kVA de puissance électrique mise en œuvre")} (art. T 29 § 3 et T 33 § 2), ni ${nonPorte("la demande d'autorisation, adressée par l'exposant, de présenter des machines utilisant des substances radioactives ou génératrices de rayons X")} (art. T 43), ni ${nonPorte("la déclaration préalable de l'emploi de lasers dans les salles, faite par l'exposant")} (art. T 44).`,
};

/**
 * Les types dont l'aide vaut quelle que soit la catégorie. ~~Vide~~ [2026-10-17,
 * sous-lot E : X, dont l'aide vient du code du sport, qui vaut en toutes
 * catégories] : les aides M et T disent le titre II du livre II, qui ne vise
 * que les quatre premières catégories. Une aide fondée sur un autre texte (le
 * code du sport, pour X) y entre avec sa phrase.
 */
export const TYPES_AIDE_TOUTES_CATEGORIES: ReadonlySet<TypeErp> = new Set<TypeErp>(["X"]);

const QUATRE_PREMIERES: readonly string[] = ["N1", "N2", "N3", "N4"];

/**
 * Les aides des types déclarés, dans l'ordre de la déclaration, sans doublon.
 *
 * 2026-10-17, contrôle visuel de c6 : une aide qui parle « des quatre
 * premières catégories » ne s'affiche qu'en N1 à N4 — ni en 5ᵉ, ni avant
 * qu'une catégorie soit choisie.
 */
export function aidesDesTypes(
  types: readonly (string | null | undefined)[],
  categorieErp: CategorieErp | string | null | undefined,
): { type: TypeErp; aide: string }[] {
  const quatrePremieres = Boolean(categorieErp && QUATRE_PREMIERES.includes(categorieErp));
  const vus = new Set<string>();
  const sortie: { type: TypeErp; aide: string }[] = [];
  for (const t of types) {
    if (!t || vus.has(t)) continue;
    if (!quatrePremieres && !TYPES_AIDE_TOUTES_CATEGORIES.has(t as TypeErp)) continue;
    vus.add(t);
    const aide = AIDE_TYPE_ERP[t as TypeErp];
    if (aide) sortie.push({ type: t as TypeErp, aide });
  }
  return sortie;
}

