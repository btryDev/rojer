/**
 * « Chez vous, concrètement » — personnalisation de la page Comprendre.
 *
 * Résout les règles abstraites du guide contre les données réelles de
 * l'établissement, de façon purement déterministe (zéro IA) :
 *   - le rythme de mise à jour du DUERP selon l'effectif (R. 4121-2 :
 *     au moins annuel à partir de onze salariés) ;
 *   - les obligations de vérification réellement applicables, résumées
 *     par domaine, via le moteur de matching (mode explain) ;
 *   - les trous honnêtes : équipements déclarés qui ne déclenchent rien
 *     dans la situation actuelle, absence d'équipement déclaré.
 *
 * Module pur (pas de Prisma, pas d'horloge) — testable en environnement
 * node comme le moteur de matching qu'il consomme.
 */

import { estPourInformation } from "@/lib/referentiels/conformite/initiative";
import { periodiciteEffective } from "@/lib/referentiels/conformite/rythme-retenu";
import {
  mentionRythmeRetenu,
  type MentionRythme,
} from "@/lib/referentiels/conformite/mention-rythme";
import { PHRASE_SANS_REPONSE } from "@/lib/matching/sans-reponse";
import {
  phraseEffectifAConfirmer,
  seuilEntrepriseAtteint,
} from "@/lib/matching/effectif-entreprise";
import { determineObligationsApplicables } from "@/lib/matching";
import type {
  EquipementMatching,
  EtablissementMatching,
  ObligationApplicable,
} from "@/lib/matching";
import {
  DOMAINES_OBLIGATION,
  type DomaineObligation,
} from "@/lib/referentiels/conformite/types";
import type {
  CategorieEquipement,
  Periodicite,
  Realisateur,
} from "@/lib/referentiels/types-communs";

/** Seuil légal de l'annualité de mise à jour du DUERP (R. 4121-2). */
export const SEUIL_MAJ_ANNUELLE_DUERP = 11;

export type ChezVousDomaine = {
  domaine: DomaineObligation;
  nbObligations: number;
  /** Périodicités distinctes, de la plus fréquente à la plus espacée. */
  periodicites: Periodicite[];
  /**
   * Celles de ces périodicités que Rojer RETIENT là où le texte n'en écrit
   * pas, chacune avec sa mention (ADR-039 § 5 : jamais sans marquage). Une par
   * couple rythme × origine (« annuelle » de la norme, « annuelle » par
   * défaut) ; vide quand tout le domaine est rythmé par les textes.
   */
  rythmesRetenus: { periodicite: Periodicite; mention: MentionRythme }[];
  /** Profils de réalisateur distincts requis sur le domaine. */
  realisateurs: Realisateur[];
  /** Raisons d'applicabilité (mode explain), dédupliquées. */
  raisons: string[];
  /** Libellés distincts des équipements déclencheurs. */
  equipements: string[];
  /**
   * Les obligations du domaine retenues par la seule prudence d'un seuil
   * d'entreprise, NOMMÉES, et la phrase qui dit de quoi conclure ; `null`
   * quand aucune ne l'est. La phrase vit ici, une fois par domaine, et non
   * dans chaque raison : c'est là que l'écran pose le lien vers l'effectif de
   * l'entreprise (`LienEffectifEntreprise`).
   */
  aConfirmer: { obligations: string[]; phrase: string } | null;
  /**
   * Les obligations du bloc retenues sur le silence d'une question de la
   * fiche, chacune avec ses phrases (`PHRASE_SANS_REPONSE`). Vide sinon.
   * Ajouté le 2026-09-27 : le guide ne lisait que l'effectif, et une ligne
   * retenue sur une question muette s'y lisait comme due.
   */
  sansReponse: { obligation: string; phrases: string[] }[];
};

export type ChezVous = {
  duerp: {
    /**
     * L'effectif de l'ENTREPRISE — le 1° de `R. 4121-2` vise « les entreprises
     * d'au moins onze salariés ». Jusqu'au 2026-09-26 on lisait l'effectif du
     * site : une entreprise de quinze salariés sur deux sites s'entendait dire
     * que le 1° ne s'appliquait pas. La carte des écrans du document unique et
     * l'outil MCP lisaient déjà l'entreprise.
     */
    effectif: number;
    /** L'effectif du SITE, pour l'en-tête de la section — pas pour le seuil. */
    effectifSurSite: number;
    /** true ⇔ effectif retenu pour le seuil d'entreprise ≥ 11 (C37). */
    misAJourAnnuel: boolean;
    /**
     * La phrase « à confirmer » quand `misAJourAnnuel` ne tient qu'à la
     * prudence (entreprise déclarée sous onze, site à onze ou plus) ; `null`
     * sinon.
     */
    aConfirmer: string | null;
  };
  domaines: ChezVousDomaine[];
  /**
   * Catégories d'équipement déclarées qui ne déclenchent aucune obligation
   * dans la situation actuelle (ex. « Autre », ou typologie non couverte).
   * Fait observable, sans jugement d'applicabilité : on dit « rien n'est
   * généré », jamais « rien n'est requis ».
   */
  categoriesSansObligation: CategorieEquipement[];
  aucunEquipement: boolean;
};

/** Ordre « de la plus fréquente à la plus espacée » pour l'affichage. */
const RANG_PERIODICITE: Record<Periodicite, number> = {
  hebdomadaire: 0,
  bimensuelle: 1,
  mensuelle: 2,
  six_semaines: 3,
  trimestrielle: 4,
  semestrielle: 5,
  annuelle: 6,
  biennale: 7,
  triennale: 8,
  quadriennale: 9,
  quinquennale: 10,
  decennale: 11,
  mise_en_service_uniquement: 12,
  autre: 13,
};

/**
 * Les raisons d'une obligation, telles que le bloc de son domaine les agrège.
 *
 * « CETTE OBLIGATION » NE DÉSIGNE RIEN DANS UN BLOC QUI EN COMPTE PLUSIEURS
 * (revue finale de l'intégration d, 2026-09-26). Le moteur écrit la raison
 * « à confirmer » d'une ligne pour cette ligne : « … retenue par prudence, à
 * confirmer. » suivi de `phraseEffectifAConfirmer(…, "cette obligation ne vous
 * concerne pas")`. Le guide la recopiait dans le bloc du domaine — entreprise
 * à 9, site à 12 : « Organisation de la prévention · N obligations », et une
 * raison qui disait « cette obligation » sans dire laquelle.
 *
 * La raison du moteur n'est pas réécrite ~~(elle est aussi celle que le
 * calendrier conserve)~~ [2026-09-27 : faux — le calendrier ne conserve aucune
 * raison ; il porte désormais la marque, par `matching/marques.ts`] ; le guide la NOMME, et en retire la phrase longue, que
 * le bloc porte une seule fois, avec le lien (`ChezVousDomaine.aConfirmer`).
 * Si la raison ne se termine pas par la phrase attendue — le moteur l'aurait
 * reformulée —, elle est gardée entière : on nomme sans rien perdre.
 */
function raisonsNommees(a: ObligationApplicable): string[] {
  if (!a.effectifAConfirmer) return a.raisons;
  const phrase = phraseEffectifAConfirmer(
    a.effectifAConfirmer,
    "cette obligation ne vous concerne pas",
  );
  return a.raisons.map((r) => {
    if (!r.includes(phrase)) return r;
    const sansPhrase = r.replace(phrase, "").trimEnd().replace(/\.$/, "");
    return `« ${a.obligation.libelle} » : ${sansPhrase}`;
  });
}

export function construireChezVous(
  etab: EtablissementMatching,
  equipements: EquipementMatching[],
  effectifEntreprise: number,
): ChezVous {
  const applicables = determineObligationsApplicables(etab, equipements);

  const parDomaine = new Map<
    DomaineObligation,
    {
      nb: number;
      periodicites: Set<Periodicite>;
      rythmesRetenus: Map<string, { periodicite: Periodicite; mention: MentionRythme }>;
      realisateurs: Set<Realisateur>;
      raisons: string[];
      equipements: Set<string>;
      aConfirmer: string[];
      sansReponse: { obligation: string; phrases: string[] }[];
    }
  >();

  const categoriesDeclenchantes = new Set<CategorieEquipement>();

  for (const a of applicables) {
    const d = a.obligation.domaine;
    let agg = parDomaine.get(d);
    if (!agg) {
      agg = {
        nb: 0,
        periodicites: new Set(),
        rythmesRetenus: new Map(),
        realisateurs: new Set(),
        raisons: [],
        equipements: new Set(),
        aConfirmer: [],
        sansReponse: [],
      };
      parDomaine.set(d, agg);
    }
    agg.nb += 1;
    const periodicite = periodiciteEffective(a.obligation);
    agg.periodicites.add(periodicite);
    const mention = mentionRythmeRetenu(a.obligation);
    if (mention) {
      agg.rythmesRetenus.set(`${periodicite}|${mention.court}`, {
        periodicite,
        mention,
      });
    }
    // C64 : la visite de la commission de sécurité n'apporte pas son
    // `organisme_agree` — l'acte est à l'initiative de l'administration, et
    // le champ ne le garde que faute de valeur dans l'enum Prisma.
    if (!estPourInformation(a.obligation)) {
      for (const r of a.obligation.realisateurs) agg.realisateurs.add(r);
    }
    for (const raison of raisonsNommees(a)) {
      if (!agg.raisons.includes(raison)) agg.raisons.push(raison);
    }
    if (a.effectifAConfirmer) agg.aConfirmer.push(a.obligation.libelle);
    if (a.sansReponse && a.sansReponse.length > 0) {
      agg.sansReponse.push({
        obligation: a.obligation.libelle,
        phrases: a.sansReponse.map((q) => PHRASE_SANS_REPONSE[q]),
      });
    }
    for (const eq of a.equipementsConcernes) {
      agg.equipements.add(eq.libelle);
      categoriesDeclenchantes.add(eq.categorie);
    }
  }

  // Ordre stable : celui du référentiel, pas celui de la Map.
  const domaines: ChezVousDomaine[] = DOMAINES_OBLIGATION.filter((d) =>
    parDomaine.has(d),
  ).map((d) => {
    const agg = parDomaine.get(d)!;
    return {
      domaine: d,
      nbObligations: agg.nb,
      periodicites: [...agg.periodicites].sort(
        (a, b) => RANG_PERIODICITE[a] - RANG_PERIODICITE[b],
      ),
      rythmesRetenus: [...agg.rythmesRetenus.values()].sort(
        (a, b) => RANG_PERIODICITE[a.periodicite] - RANG_PERIODICITE[b.periodicite],
      ),
      realisateurs: [...agg.realisateurs],
      raisons: agg.raisons,
      equipements: [...agg.equipements],
      sansReponse: agg.sansReponse,
      aConfirmer:
        agg.aConfirmer.length > 0
          ? {
              obligations: agg.aConfirmer,
              phrase: phraseEffectifAConfirmer(
                {
                  entreprise: effectifEntreprise,
                  site: etab.effectifSurSite,
                },
                agg.aConfirmer.length > 1
                  ? "ces obligations ne vous concernent pas"
                  : "cette obligation ne vous concerne pas",
              ),
            }
          : null,
    };
  });

  const categoriesDeclarees = new Set<CategorieEquipement>(
    equipements.map((e) => e.categorie),
  );
  const categoriesSansObligation = [...categoriesDeclarees].filter(
    (c) => !categoriesDeclenchantes.has(c),
  );

  return {
    duerp: {
      effectif: effectifEntreprise,
      effectifSurSite: etab.effectifSurSite,
      ...(() => {
        // La règle commune aux seuils d'entreprise (C37).
        const effectifs = {
          entreprise: effectifEntreprise,
          site: etab.effectifSurSite,
        };
        const s = seuilEntrepriseAtteint(SEUIL_MAJ_ANNUELLE_DUERP, effectifs);
        return {
          misAJourAnnuel: s.atteint,
          aConfirmer: s.aConfirmer ? phraseEffectifAConfirmer(effectifs) : null,
        };
      })(),
    },
    domaines,
    categoriesSansObligation,
    aucunEquipement: equipements.length === 0,
  };
}
