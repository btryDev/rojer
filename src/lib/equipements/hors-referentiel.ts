// Les équipements pour lesquels le référentiel ne produit aucune échéance.
//
// Le calendrier se régénère à chaque mutation du parc : côté dates, le
// système se répare tout seul. Il ne se répare pas d'un cas, et c'est le
// seul qui ne se voit pas — celui où le moteur de matching ne rend rien.
// Un équipement rangé en « Autre » (aucune obligation du référentiel ne
// cible cette catégorie), ou un désenfumage déclaré par un employeur
// non-ERP (la typologie écarte toutes les règles du domaine), produit
// zéro occurrence. La page équipements affichait alors la même absence
// qu'un appareil à jour : rien.
//
// C'est la doctrine déjà tenue ailleurs dans le dépôt, appliquée à
// l'inventaire — `levage.ts` : « une périodicité trop longue est un écart
// visible et corrigeable, l'absence totale d'échéance sur une obligation
// de criticité 5 ne le serait pas » ; `QuestionTransverseRow.tsx` : un
// « non » délibéré et une question jamais lue ne doivent pas produire le
// même état. Le silence ne doit jamais ressembler à une réponse.
//
// Ce que ce module NE dit pas, et ne doit jamais dire : que l'équipement
// n'appelle aucune vérification. Il dit un fait sur l'outil — le
// référentiel de Rojer, à sa version courante, ne calcule pas d'échéance
// pour cet appareil. Le droit ne s'arrête pas au périmètre du référentiel
// (3 secteurs, 19 domaines, cf. CLAUDE.md), et l'outil ne certifie rien.
// « 9 domaines » jusqu'au 2026-09-01 : le compte datait d'avant les sept
// domaines sans équipement, et la ligne citait CLAUDE.md, qui disait 17.
// « 17 » jusqu'au 2026-09-02 : deux domaines sont entrés depuis — la
// signalisation de sécurité et le compactage des déchets — sans qu'aucun
// diff ne touche cette ligne. C'est la deuxième fois pour la même phrase,
// et le remède n'est pas de mieux surveiller : un compte recopié dans un
// commentaire se périme au lot suivant, ici comme dans CLAUDE.md.
//
// Zéro heuristique : le libellé saisi par l'utilisateur n'est jamais lu.
// Le seul signal est l'absence de l'équipement dans les déclencheurs
// rendus par le moteur — la même sortie que celle qui nourrit le
// générateur d'occurrences, donc exactement ce que le calendrier montre.

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { determineObligationsApplicables } from "@/lib/matching";
import type {
  EquipementMatching,
  EtablissementMatching,
} from "@/lib/matching";
import { obligationsConformite } from "@/lib/referentiels/conformite";
import {
  estPorteeParEquipement,
  type Obligation,
} from "@/lib/referentiels/conformite/types";
import type { CategorieEquipement } from "@/lib/referentiels/types-communs";

/**
 * Pourquoi cet appareil ne porte aucune échéance. Trois causes bien
 * distinctes, qui n'appellent pas la même phrase : les confondre reviendrait
 * à faire dire au référentiel plus que ce qu'il sait.
 */
export type MotifSansEcheance =
  /** Aucune obligation du référentiel ne cite cette catégorie — le cas de
   *  `AUTRE`, la soupape de saisie. L'outil ne sait rien de cet appareil. */
  | "categorie_hors_referentiel"
  /** La catégorie est couverte, mais aucune règle ne s'applique **ici** :
   *  la typologie de l'établissement les écarte toutes (un désenfumage chez
   *  un employeur non-ERP), ou les conditions de l'obligation ne sont pas
   *  remplies par cet appareil. */
  | "aucune_obligation_applicable"
  /** Des obligations s'appliquent, mais aucune n'est datable : toutes ont
   *  la périodicité `autre` — le texte n'écrit aucun rythme —, que le
   *  générateur n'ouvre pas en occurrence. Le parc en porte donc la trace, le
   *  calendrier non.
   *
   *  Ce motif ne dit rien de la NATURE des obligations en cause (ADR-026), et
   *  c'est le point : sur un stockage de matières dangereuses sans volume
   *  renseigné — le cas d'école de ce motif —, les règles qui restent
   *  comprennent une vérification d'étanchéité qui REVIENT et des fiches de
   *  données qui se refont à chaque produit nouveau. Les appeler
   *  « permanentes » attribuait au droit un régime qu'il ne donne pas. */
  | "aucune_echeance_datable";

/**
 * Ce qui s'affiche, par motif. Descriptif, jamais prescriptif : on nomme un
 * état de l'outil, on ne qualifie ni l'appareil ni la situation de
 * l'établissement.
 *
 * Les trois libellés diffèrent, et c'est le point. Une pastille se lit seule,
 * souvent sans la phrase qui la suit : coller « hors référentiel » sur un BAES
 * parfaitement connu du référentiel, mais qu'aucune règle ne vise chez un
 * employeur non-ERP, dirait au dirigeant d'aller chercher un autre outil. Le
 * référentiel le connaît ; c'est ici qu'il ne s'applique pas. Et le troisième
 * n'est pas non plus une absence : la règle existe, elle n'a simplement pas de
 * date à poser — d'où le mot « obligation », gardé en tête de la pastille.
 */
export const LIBELLE_SANS_ECHEANCE: Record<MotifSansEcheance, string> = {
  categorie_hors_referentiel: "Hors référentiel",
  aucune_obligation_applicable: "Aucune échéance calculée",
  aucune_echeance_datable: "Obligation sans rythme écrit",
};

/** La phrase longue, celle qui dit le fait complet. */
export const EXPLICATION_SANS_ECHEANCE: Record<MotifSansEcheance, string> = {
  categorie_hors_referentiel:
    "Aucune échéance n'est calculée pour cet équipement : sa catégorie n'est couverte par aucune obligation du référentiel. Cela ne veut pas dire qu'aucune vérification ne lui est due.",
  aucune_obligation_applicable:
    "Aucune échéance n'est calculée pour cet équipement : aucune obligation du référentiel ne s'applique à lui compte tenu de la typologie de l'établissement et de ses caractéristiques. Cela ne veut pas dire qu'aucune vérification ne lui est due.",
  aucune_echeance_datable:
    "Aucun texte n'écrit de rythme pour les obligations qui visent cet équipement : le référentiel n'en tire aucune date, il n'y a donc rien à poser sur le calendrier. Elles s'appliquent malgré tout.",
};

/**
 * Compte les appareils pour lesquels **aucune obligation** ne s'applique — le
 * cas de la catégorie inconnue du référentiel et celui de la catégorie connue
 * qu'aucune règle ne vise ici.
 *
 * `aucune_echeance_datable` en est délibérément exclu, et c'est tout l'intérêt
 * de la fonction : là, des obligations s'appliquent bel et bien, aucun texte
 * n'en écrit le rythme. Un stockage de matières dangereuses sans volume
 * renseigné relève de la rétention et des fiches de données de sécurité ; lui
 * dire que « rien ne s'applique » serait faux, et faux dans le sens qui rassure.
 * Les trois motifs ont été séparés pour cette raison — les recompter ensemble
 * dans les écrans annulait le travail.
 */
export function compterSansObligation(
  motifs: ReadonlyMap<string, MotifSansEcheance>,
): number {
  let n = 0;
  for (const motif of motifs.values()) {
    if (motif !== "aucune_echeance_datable") n += 1;
  }
  return n;
}

/** Le champ neutre du registre d'états (`CHAMP_ETAT.aPlanifier`), délibérément :
 *  ce n'est ni un retard ni une échéance. Un rouge dirait « faute », un vert
 *  dirait « à jour » — deux jugements que l'outil ne porte pas. */
export const CHAMP_SANS_ECHEANCE = "var(--board-slate-pale)";
export const ENCRE_SANS_ECHEANCE = "var(--board-slate-mid)";

/** Les catégories citées par au moins une obligation, typologie mise à part.
 *  C'est la couverture brute du référentiel — ce qui distingue « l'outil ne
 *  connaît pas cet appareil » de « il le connaît, mais pas chez vous ».
 *
 *  Les obligations portées par l'établissement (ADR-022) n'y entrent pas, et
 *  c'est voulu : elles ne se déclenchent sur aucune catégorie, donc elles ne
 *  rendent aucun équipement « couvert ». Leurs `equipementsEnContexte` sont un
 *  affichage, pas un déclencheur — les compter ici ferait passer pour couvert
 *  un appareil dont aucune obligation ne parle vraiment. */
function categoriesCouvertes(
  obligations: readonly Obligation[],
): Set<CategorieEquipement> {
  const out = new Set<CategorieEquipement>();
  for (const o of obligations) {
    if (!estPorteeParEquipement(o)) continue;
    for (const c of o.categoriesEquipement) out.add(c);
  }
  return out;
}

/**
 * Le calcul, sans la base : la partie testable et pure.
 *
 * Rend une entrée **par équipement qui ne porte aucune échéance**. Un
 * équipement absent de la Map en porte au moins une — c'est l'invariant sur
 * lequel les écrans s'appuient pour ne rien afficher dans le cas normal.
 *
 * Le calcul passe par le moteur plutôt que par la base : lire les
 * `Verification` dirait « aucune ligne en base », ce qui recouvre aussi bien
 * un référentiel muet qu'un calendrier jamais généré. Ici la réponse ne
 * dépend que du référentiel, de la typologie et du parc — elle est vraie
 * avant même la première génération.
 */
export function reperterSansEcheance(
  etab: EtablissementMatching,
  equipements: EquipementMatching[],
  obligations: readonly Obligation[] = obligationsConformite,
): Map<string, MotifSansEcheance> {
  const couvertes = categoriesCouvertes(obligations);
  const applicables = determineObligationsApplicables(etab, equipements, {
    obligations: [...obligations],
  });

  // Par équipement : combien de règles le déclenchent, et combien d'entre
  // elles savent produire une date. La périodicité `autre` marque une
  // obligation dont aucun texte n'écrit le rythme — le générateur la saute
  // (cf. generateur.ts), donc elle ne compte pas comme une échéance.
  const declenchees = new Map<string, { total: number; datables: number }>();
  for (const a of applicables) {
    const datable = a.obligation.periodicite !== "autre";
    for (const eq of a.equipementsConcernes) {
      const c = declenchees.get(eq.id) ?? { total: 0, datables: 0 };
      c.total += 1;
      if (datable) c.datables += 1;
      declenchees.set(eq.id, c);
    }
  }

  const out = new Map<string, MotifSansEcheance>();
  for (const eq of equipements) {
    const c = declenchees.get(eq.id);
    if (!c || c.total === 0) {
      out.set(
        eq.id,
        couvertes.has(eq.categorie)
          ? "aucune_obligation_applicable"
          : "categorie_hors_referentiel",
      );
      continue;
    }
    if (c.datables === 0) out.set(eq.id, "aucune_echeance_datable");
  }
  return out;
}

/**
 * La même lecture, branchée sur la base : le parc **en service** d'un
 * établissement (un équipement désactivé ne génère plus rien, cf.
 * `queries.ts`), passé au moteur avec la typologie de l'établissement.
 *
 * Une seule requête pour tout le parc — la page en affiche des dizaines.
 */
export async function equipementsSansEcheance(
  etablissementId: string,
): Promise<Map<string, MotifSansEcheance>> {
  const user = await requireUser();
  const etab = await prisma.etablissement.findFirst({
    where: { id: etablissementId, entreprise: { userId: user.id } },
    include: {
      equipements: { where: { actif: true } },
      entreprise: { select: { effectif: true } },
    },
  });
  if (!etab) return new Map();

  return reperterSansEcheance(
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
      personnesPresentesHabituellement: etab.personnesPresentesHabituellement,
      manipuleMatieresR422722: etab.manipuleMatieresR422722,
      comporteLocauxSommeilPublic: etab.comporteLocauxSommeilPublic,
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
  );
}
