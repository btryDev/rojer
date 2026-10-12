// Les écarts entre deux déclarations de l'utilisateur (ADR-024).
//
// Ce module fait le rapprochement que personne ne faisait : le référentiel
// dit ce qu'une obligation exige, l'annuaire dit ce que l'utilisateur a
// déclaré, et les deux ne se regardaient jamais. Il rend des FAITS ; les
// règles d'affichage et de priorité vivent dans `recommandations.ts`, qui
// reste pur.
//
// Ce qu'il ne dit jamais : que le dirigeant est en faute. Un domaine sans
// prestataire déclaré signifie très probablement qu'il en a un et ne l'a pas
// saisi. Une obligation qui suppose une personne nommée sans titre déclaré
// signifie que l'outil ne sait pas qui opère — pas que personne n'est
// habilité. Même registre que `equipements/hors-referentiel.ts` : on nomme un
// état de l'outil, on ne qualifie pas la situation de l'établissement.
//
// Pourquoi passer par le moteur de matching et non par les `Verification`
// déjà en base : une obligation de périodicité `autre` — un état permanent —
// ne produit AUCUNE ligne de calendrier. L'habilitation électrique est
// précisément dans ce cas. Lire la base ne l'aurait jamais vue, et c'est
// exactement le cas qui a fait naître cet ADR.

import type { DomainePrestataire } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { determineObligationsApplicables } from "@/lib/matching";
import { LABEL_DOMAINE as LABEL_DOMAINE_OBLIGATION } from "@/lib/calendrier/labels";
import { domainesSansPrestataire } from "@/lib/prestataires/domaines";
import { obligationsConformite } from "@/lib/referentiels/conformite";
import { titresEcartesParLesFaits } from "@/lib/etablissements/faits-activite";
import {
  ceQuiManqueALaPersonne,
  estDuALEntree,
  etatDuManque,
  type PersonneLue,
  type TitreDeclareLu,
} from "@/lib/salaries/du-a-la-personne";
import type {
  DomaineObligation,
  Obligation,
} from "@/lib/referentiels/conformite/types";

/** Une personne de l'effectif, telle que le rapprochement la lit. */
export type PersonneDeclaree = PersonneLue & {
  titres: readonly TitreDeclareLu[];
};

/**
 * Pour un titre DÛ À L'ENTRÉE (ADR-043 (b)) : combien de personnes actives il
 * manque, au sens de `ceQuiManqueALaPersonne` — jamais d'une seconde règle.
 */
export type CompteParPersonne = {
  /** L'identifiant du titre attendu. */
  titre: string;
  /** Son libellé au référentiel, pour le nommer à l'écran. */
  libelleTitre: string;
  /** Personnes actives à qui il manque. Toujours ≥ 1 quand le compte existe. */
  sansLeTitre: number;
  /** Parmi elles, celles dont l'échéance est dépassée (`classerDate`, ADR-011). */
  enRetard: number;
  /** Parmi elles, celles dont la date d'entrée n'est pas renseignée : non datées. */
  nonDatees: number;
  /**
   * La plus ancienne échéance dépassée, ou `null` sans retard. C'est elle qui
   * range la carte parmi les retards du tableau de bord (décision de la
   * propriétaire du 2026-10-12 : un manque en retard compte comme un retard).
   */
  plusAncienRetard: Date | null;
};

export type Transmissions = {
  domainesSansPrestataire: Array<{ domaine: string; libelle: string }>;
  obligationsSupposantUnePersonne: Array<{
    id: string;
    libelle: string;
    /**
     * Présent quand le signal porte sur un titre dû à l'entrée et que
     * l'effectif compte au moins une personne active : il dit À COMBIEN il
     * manque. Absent, le signal garde sa forme d'avant — un titre qu'aucune
     * déclaration ne porte.
     */
    parPersonne?: CompteParPersonne[];
  }>;
  /**
   * Les titres qui manquent à au moins une personne active (ADR-043) et
   * qu'aucune transmission ci-dessus ne compte déjà — la VIP au premier chef :
   * aucune obligation d'établissement ne transmet vers elle, et sans ce champ
   * le tableau de bord la taisait quand la fiche et le badge la comptaient en
   * retard (relecture indépendante du 2026-10-12, B1). Même fonction, même
   * compte.
   */
  titresDusNonDeclares: CompteParPersonne[];
};

/**
 * Combien de titres dus à l'entrée manquent EN RETARD (ADR-043), lus sur les
 * comptes que portent les cartes du tableau de bord — pas sur une seconde
 * règle. Un même titre peut être nommé par deux transmissions : compté une
 * fois. C'est le nombre que le bandeau nomme à côté de « Dépassées », qui ne
 * le compte pas (ADR-043 § 3 (a) ; audit du 2026-10-12).
 */
export function titresDusEnRetard(t: Transmissions): number {
  const parTitre = new Map<string, number>();
  for (const c of [
    ...t.obligationsSupposantUnePersonne.flatMap((o) => o.parPersonne ?? []),
    ...t.titresDusNonDeclares,
  ]) {
    parTitre.set(c.titre, c.enRetard);
  }
  return [...parTitre.values()].reduce((n, k) => n + k, 0);
}

export const AUCUNE_TRANSMISSION: Transmissions = {
  domainesSansPrestataire: [],
  obligationsSupposantUnePersonne: [],
  titresDusNonDeclares: [],
};

/**
 * Le calcul, sans la base : la partie testable.
 *
 * ~~`titresDeclares` porte les **identifiants d'obligation** des titres saisis,
 * pas leur nombre.~~ [2026-10-12, ADR-043 : `rapprocher` reçoit l'EFFECTIF
 * — chaque personne avec ses titres — et en dérive l'ensemble des titres
 * déclarés par les personnes actives, ce que faisait le `groupBy` de
 * `chargerTransmissions`. Ce qui suit vaut pour cet ensemble dérivé, donc pour
 * les titres sous condition ; le troisième cran, plus bas, dit ce qui change
 * pour les titres dus à l'entrée.] La distinction n'est pas cosmétique :
 *
 *  - une transmission qui **nomme** le titre attendu (`titre` non nul) se tait
 *    dès que CE titre est déclaré, et pas avant. Un compte global aurait fait
 *    taire une suggestion de CACES parce qu'un cuisinier détient une
 *    attestation SST — un faux négatif muet, la famille de défauts que
 *    l'ADR-022 existe pour supprimer ;
 *  - une transmission qui ne peut pas le nommer (`titre: null`, faute de
 *    catalogue) se tait dès qu'un titre **du même domaine** est déclaré.
 *
 * ## Pourquoi le domaine, et non « n'importe quel titre »
 *
 * Cette seconde règle disait « dès qu'un titre QUELCONQUE est déclaré ». Elle
 * était juste tant que le catalogue tenait en une ligne : le seul titre
 * déclarable étant l'attestation médicale d'habilitation électrique, « un titre
 * quelconque » et « un titre d'électricité » désignaient la même chose.
 *
 * Le lot 7 a porté le catalogue à neuf lignes, et cette équivalence est tombée
 * — en éteignant le signal qu'elle devait porter. Un restaurateur qui déclare
 * une installation électrique voit « une habilitation est peut-être due,
 * personne n'est déclaré ». Il saisit alors la formation à la sécurité de sa
 * plongeuse — **le premier geste que le catalogue élargi l'invite à faire** —
 * et le signal disparaît définitivement, alors que rien n'a été dit de
 * l'habilitation. Le lot qui devait compléter le mécanisme l'aurait éteint.
 *
 * Le domaine est le bon grain parce que c'est celui de la question posée :
 * `elec-travail-habilitation-personnel` demande « quelqu'un est-il habilité en
 * ÉLECTRICITÉ ? ». Un titre de secourisme n'y répond pas ; un titre
 * d'électricité, oui — et il n'y en a qu'un au catalogue, donc le déclarer
 * signifie bien qu'on a saisi ce qu'on savait saisir dans ce domaine.
 *
 * Ce n'est pas parfait, et il faut le dire : le jour où deux titres
 * d'électricité coexisteront au catalogue, déclarer le premier fera taire une
 * transmission qui visait peut-être le second. Ce sera le moment de faire
 * nommer le titre à la transmission plutôt que de laisser `null` — c'est-à-dire
 * de résoudre la cause, le `titre: null` lui-même, plutôt que d'affiner encore
 * le repli.
 *
 * ## Le grain de ce signal a été resserré ~~deux fois, et il reste un cran~~
 * trois fois (2026-10-12, ADR-043)
 *
 * Ce n'est pas une suite de bugs, c'est **un même défaut de modèle** qui
 * réapparaît un cran plus bas à chaque correction — et qui n'était visible, à
 * chaque fois, qu'une fois le précédent corrigé. À écrire ici pour que le
 * prochain ne croie pas repartir de zéro :
 *
 *  1. **N'importe quel titre.** Le signal se taisait dès qu'un titre, quel
 *     qu'il soit, était déclaré. Juste tant que le catalogue tenait en une
 *     ligne ; faux dès qu'il en a compté onze.
 *  2. **Un titre du même domaine.** L'état ci-dessus. Il tombera le jour où
 *     deux titres coexisteront dans un domaine — le paragraphe précédent le
 *     dit et le date.
 *  3. ~~**Il ignore les personnes**, et c'est le cran qui reste.~~ [2026-10-12,
 *     ADR-043 : fermé pour les titres dus à l'entrée — voir la rature datée du
 *     paragraphe suivant.] `titresDeclares`
 *     est un ensemble d'**identifiants d'obligation** : il dit *qu'un* titre
 *     existe, jamais *combien de personnes* le détiennent ni *lesquelles*. Un
 *     restaurateur qui déclare la formation à la sécurité de sa plongeuse
 *     éteint le signal pour les cinq personnes embauchées après elle — alors
 *     que `R. 4141-20` fixe pour chacune un délai chiffré, « dans le mois qui
 *     suit l'affectation du travailleur à son emploi ».
 *
 * **Le troisième cran ne se corrige pas en affinant celui-ci.** Les deux
 * premiers étaient des questions de granularité — quel ensemble consulter. Le
 * troisième est une question de **modèle** : que veut dire « déclaré » quand
 * l'obligation est due par personne ? Trois réponses possibles, ~~et le choix
 * n'est pas fait~~ — chaque salarié actif doit détenir le titre ; chaque salarié
 * entré depuis moins d'un mois ; ou seulement ceux dont le poste l'appelle, ce
 * que le produit ne sait pas déduire et refuse de deviner (ADR-023).
 * [2026-10-12, ADR-043 (b), décision de la propriétaire : la PREMIÈRE pour les
 * titres dus à l'entrée (`estDuALEntree` — la VIP, la formation à la
 * sécurité), la TROISIÈME pour les titres sous condition. Pour les premiers,
 * le signal compte les personnes actives à qui le titre manque, par
 * `ceQuiManqueALaPersonne` — la règle de la fiche, pas une seconde —, et se
 * tait quand il ne manque à personne ; il nomme le nombre et, parmi eux, ceux
 * en retard. Pour les seconds, rien ne change : un titre déclaré suffit, le
 * produit ne sait pas qui est concerné. Un effectif vide garde aussi l'ancienne
 * forme : personne à compter, et aucun titre déclaré.]
 *
 * ~~La brique du deuxième cas existe et ne sert à rien : `Salarie.entreLe`, dont
 * le schéma écrit qu'il est le « point de départ des obligations à
 * l'embauche », a quatre usages — saisie, affichage, export RGPD. Aucun calcul.~~
 * [2026-10-12, ADR-043 : `entreLe` est lu par `ceQuiManqueALaPersonne`, donc
 * par ce signal.] Voir `docs/revues/rapport-surface-des-quatorze.md` § 4.1.
 */
export function rapprocher(
  applicables: readonly Obligation[],
  domainesPrestatairesDeclares: readonly DomainePrestataire[],
  /**
   * L'effectif de l'établissement, personnes sorties comprises ou non : seules
   * les actives comptent, ici comme dans `ceQuiManqueALaPersonne`.
   */
  effectif: readonly PersonneDeclaree[],
  /** L'horloge du retard, injectée : la fonction n'en lit aucune. */
  now: Date,
  /**
   * Les titres dont le fait d'activité est déclaré « non » (ADR-038, ADR-041).
   * Une transmission qui NOMME un de ces titres se tait : le dirigeant a
   * déclaré, dans les mots de l'article, qu'aucun salarié n'est exposé au fait
   * qui le rend dû. Le signal « suppose un titre nominatif » contredisait
   * alors la fiche du salarié (relecture du 2026-10-05). Le silence et le
   * « oui » ne changent rien : seul un refus déclaré fait taire.
   */
  titresEcartesParLesFaits: ReadonlySet<string> = new Set(),
): Transmissions {
  const domaines = domainesSansPrestataire(
    applicables,
    domainesPrestatairesDeclares,
  ).map((d) => ({
    domaine: d,
    libelle: LABEL_DOMAINE_OBLIGATION[d],
  }));

  // Seules les personnes actives : une personne sortie ne réclame rien
  // (`ceQuiManqueALaPersonne`), et ses titres ne répondent plus pour
  // l'établissement — le `groupBy` d'avant filtrait déjà `actif: true`.
  const actifs = effectif.filter((p) => p.actif);
  const titresDeclares = new Set(
    actifs.flatMap((p) => p.titres.map((t) => t.obligationId)),
  );

  // Les domaines dans lesquels au moins un titre est déclaré. Construit une
  // fois : `rapprocher` est appelée par le tableau de bord à chaque rendu.
  const domainesDesTitresDeclares = new Set<DomaineObligation>();
  const parId = new Map<string, Obligation>();
  for (const o of obligationsConformite) {
    parId.set(o.id, o);
    if (titresDeclares.has(o.id)) domainesDesTitresDeclares.add(o.domaine);
  }

  // Ce qui manque à chaque personne active, calculé une fois et par LA
  // fonction de la fiche (ADR-043 § 2.5) : le tableau de bord ne redit pas la
  // règle, il compte ce qu'elle rend.
  const manques = actifs.map((p) => ceQuiManqueALaPersonne(p, p.titres));
  const compter = (titre: Obligation): CompteParPersonne => {
    const compte: CompteParPersonne = {
      titre: titre.id,
      libelleTitre: titre.libelle,
      sansLeTitre: 0,
      enRetard: 0,
      nonDatees: 0,
      plusAncienRetard: null,
    };
    for (const m of manques.flat()) {
      if (m.obligation.id !== titre.id) continue;
      compte.sansLeTitre += 1;
      const etat = etatDuManque(m, now);
      if (etat === null) compte.nonDatees += 1;
      else if (etat === "enRetard") {
        compte.enRetard += 1;
        if (m.echeance && (!compte.plusAncienRetard || m.echeance < compte.plusAncienRetard)) {
          compte.plusAncienRetard = m.echeance;
        }
      }
    }
    return compte;
  };

  const personnes: Transmissions["obligationsSupposantUnePersonne"] = [];
  for (const o of applicables) {
    let signale = false;
    const parPersonne: CompteParPersonne[] = [];
    for (const t of o.transmet) {
      if (t.vers !== "salarie_designe") continue;
      if (t.titre === null) {
        if (!domainesDesTitresDeclares.has(o.domaine)) signale = true;
        continue;
      }
      if (titresEcartesParLesFaits.has(t.titre)) continue;
      const attendu = parId.get(t.titre);
      // Dû à l'entrée, et quelqu'un à compter : le signal compte par
      // personne. Un effectif vide retombe sur la règle d'avant — il n'y a
      // personne à qui le titre manque, et aucun titre n'est déclaré.
      if (attendu && estDuALEntree(attendu) && actifs.length > 0) {
        const compte = compter(attendu);
        if (compte.sansLeTitre > 0) {
          signale = true;
          parPersonne.push(compte);
        }
        continue;
      }
      // Sous condition (ADR-043 (b)) : un titre déclaré suffit.
      if (!titresDeclares.has(t.titre)) signale = true;
    }
    if (!signale) continue;
    personnes.push(
      parPersonne.length > 0
        ? { id: o.id, libelle: o.libelle, parPersonne }
        : { id: o.id, libelle: o.libelle },
    );
  }

  // Tout le reste de ce qui manque, compté par titre. Lu depuis les manques
  // eux-mêmes, pas depuis les transmissions : c'est ce qui fait entrer la VIP,
  // la visite intermédiaire et l'attestation de conduite.
  const dejaComptes = new Set(
    personnes.flatMap((p) => (p.parPersonne ?? []).map((c) => c.titre)),
  );
  const restants = new Map<string, Obligation>();
  for (const m of manques.flat()) {
    const id = m.obligation.id;
    // ~~`|| titresEcartesParLesFaits.has(id)`~~ (contre-relecture du
    // 2026-10-12) : un manque n'existe ici que s'il est dû à l'entrée — que
    // nul fait ne gouverne — ou APPELÉ PAR UN TITRE DÉCLARÉ. Le titre déclaré
    // l'emporte sur un « non » au fait : une autorisation de conduite sans
    // attestation n'est pas valide (R. 4323-56), quelle que soit la réponse
    // d'établissement. Le filtre faisait taire le tableau de bord quand la
    // fiche et le badge comptaient le manque.
    if (dejaComptes.has(id)) continue;
    restants.set(id, m.obligation);
  }

  return {
    domainesSansPrestataire: domaines,
    obligationsSupposantUnePersonne: personnes,
    titresDusNonDeclares: [...restants.values()].map(compter),
  };
}

/** La même lecture, branchée sur la base. Trois requêtes, aucune boucle. */
export async function chargerTransmissions(
  etablissementId: string,
  userId: string,
  /** L'horloge du tableau de bord, pour que ses cartes lisent la même. */
  now: Date,
): Promise<Transmissions> {
  const etab = await prisma.etablissement.findFirst({
    where: { id: etablissementId, entreprise: { userId } },
    include: {
      equipements: { where: { actif: true } },
      entreprise: { select: { effectif: true } },
    },
  });
  if (!etab) return AUCUNE_TRANSMISSION;

  const [prestataires, effectif] = await Promise.all([
    // `etab.id` et non le paramètre : l'appartenance vient d'être établie
    // par la lecture ci-dessus, et c'est SON identifiant qu'on propage — pas
    // celui reçu de l'appelant. La garantie ne dépend donc pas de ce que
    // l'appelant a vérifié avant.
    prisma.prestataire.findMany({
      where: { etablissementId: etab.id },
      select: { domaines: true },
    }),
    // ~~`groupBy` et non `count` : on a besoin de SAVOIR lesquels sont
    // déclarés, pas combien.~~ [2026-10-12, ADR-043 : on a besoin de savoir
    // lesquels, ET à qui. Les personnes actives avec leurs titres ; l'ensemble
    // des titres déclarés s'en dérive dans `rapprocher`.] La portée de tenancy
    // est redite sur la relation (ADR-005, même forme que `salaries/queries.ts`)
    // alors que `etab.id` vient d'être établi : la garantie ne doit pas tenir
    // à l'ordre des lectures.
    prisma.salarie.findMany({
      where: {
        etablissementId: etab.id,
        etablissement: { entreprise: { userId } },
        actif: true,
      },
      select: {
        actif: true,
        entreLe: true,
        titres: { select: { obligationId: true, delivreLe: true } },
      },
    }),
  ]);

  const applicables = determineObligationsApplicables(
    {
      id: etab.id,
      effectifSurSite: etab.effectifSurSite,
      effectifEntreprise: etab.entreprise.effectif,
      estEtablissementTravail: etab.estEtablissementTravail,
      estERP: etab.estERP,
      estIGH: etab.estIGH,
      estHabitation: etab.estHabitation,
      typeErp: etab.typeErp,
      categorieErp: etab.categorieErp,
      classeIgh: etab.classeIgh,
      familleHabitation: etab.familleHabitation,
      // Ces deux-là manquaient. La première rédaction de ce commentaire
      // parlait d'« une » divergence et la déclarait résorbée : il y en avait
      // deux autres, dans `equipements/hors-referentiel.ts` et dans la page
      // guide. Corriger un site sur trois et l'écrire au singulier était la
      // faute que ce lot corrige ailleurs.
      //
      // La cause tenait au type : les deux champs y étaient optionnels
      // « pour ne pas casser les projections existantes », donc les omettre
      // compilait. Ils sont requis depuis (`matching/types.ts`).
      personnesPresentesHabituellement: etab.personnesPresentesHabituellement,
      manipuleMatieresR422722: etab.manipuleMatieresR422722,
      comporteLocauxSommeilPublic: etab.comporteLocauxSommeilPublic,
      manutentionManuelle: etab.manutentionManuelle,
      travailSurEcran: etab.travailSurEcran,
      operationsElectriques: etab.operationsElectriques,
      conduiteEngins: etab.conduiteEngins,
      expositionCMR: etab.expositionCMR,
      epiPresents: etab.epiPresents,
    },
    etab.equipements.map((eq) => ({
      id: eq.id,
      libelle: eq.libelle,
      categorie: eq.categorie,
      caracteristiques: (eq.caracteristiques ?? null) as Record<
        string,
        unknown
      > | null,
    })),
  ).map((a) => a.obligation);

  return rapprocher(
    applicables,
    prestataires.flatMap((p) => p.domaines),
    effectif,
    now,
    // Les faits d'activité déclarés « non » (ADR-041) : lus sur
    // l'établissement, déjà chargé et déjà vérifié ci-dessus.
    titresEcartesParLesFaits(etab),
  );
}
