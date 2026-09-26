/**
 * Ce que l'écran « Ce qui doit être en place » lit.
 *
 * **Le sens de lecture est le point de ce module** : on part des obligations
 * que le moteur rend pour ce dossier, et on y **joint** les déclarations. Jamais
 * l'inverse.
 *
 * C'est ce qui règle, sans aucune machinerie, la contrainte d'idempotence de
 * l'ADR-012 : une déclaration dont l'obligation a quitté le référentiel n'a plus
 * d'obligation à laquelle se joindre, donc elle ne s'affiche plus. Elle n'est
 * pas supprimée pour autant — si l'obligation revient, la déclaration revient
 * avec elle. Une `Verification` orpheline, elle, doit être archivée et marquée,
 * parce qu'elle porte une date : elle affirme quelque chose. Une déclaration
 * n'affirme rien tant que personne ne la lit.
 */

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import {
  determineObligationsApplicables,
  projeterEtablissement,
  type EquipementMatching,
  type SourceEtablissement,
} from "@/lib/matching";
import type { Obligation } from "@/lib/referentiels/conformite";
import { LABEL_DOMAINE } from "@/lib/calendrier/labels";
import type { DomaineObligation } from "@/lib/referentiels/conformite";
import { modeDeclarationApplique, type ModeDeclaration } from "./regle";
import { ordonnerLignes } from "./ordre";

export type LigneEtatPermanent = {
  obligation: Obligation;
  mode: ModeDeclaration["mode"];
  compteDansLEnTete: boolean;
  /** L'écrit que le texte attend, quand il en attend un. */
  pieceAttendue: string | null;
  /** `null` = non déclaré. Sinon la date de la déclaration. */
  declareLe: Date | null;
  note: string | null;
};

export type GroupeEtatsPermanents = {
  domaine: DomaineObligation;
  libelle: string;
  lignes: LigneEtatPermanent[];
};

export type EtatsPermanentsDuDossier = {
  /** Les états à déclarer en place, groupés par domaine. */
  groupes: GroupeEtatsPermanents[];
  /**
   * Ce qui revient sans rythme écrit, **à part et non mêlé aux états**.
   *
   * Le contrôle visuel du 2026-08-31 a tranché ce point : les deux verbes
   * cohabitaient dans la même carte, avec deux pastilles strictement
   * identiques, et la seule différence tenait dans les trois mots du bouton. Le
   * relecteur a coché douze lignes en sept secondes sans en lire une seule — et
   * dans ce geste-là, deux pastilles qui se ressemblent sont la même action.
   *
   * La distinction est donc portée par le **regroupement**, qui se voit sans se
   * lire, et non par une teinte ou une icône qu'il faudrait décoder. C'est
   * aussi ce qui permet à l'explication de vivre à côté des lignes concernées
   * plutôt qu'en pied de page, « là où l'on arrive après avoir tout coché ».
   */
  faits: LigneEtatPermanent[];
  /**
   * Le compteur d'en-tête. **Mesuré, jamais écrit à la main** : le brief le
   * demande, et ce dépôt s'est fait prendre plusieurs fois par des comptes
   * recopiés — jusque dans les briefs eux-mêmes.
   *
   * Il ne porte QUE les lignes en mode « état ». Une obligation qui revient
   * sans rythme écrit ne peut pas entrer dans « 6 sur 12 en place » : le
   * compteur porte une affirmation, pas un décompte.
   */
  enPlace: number;
  total: number;
  /** Les lignes « fait le », comptées à part et jamais additionnées au reste. */
  faitsDates: number;
  faitsDatesRenseignes: number;
};

/**
 * Charge les états permanents d'un établissement, déclarations jointes.
 *
 * Les obligations portées par un salarié n'y figurent jamais, et ce n'est pas
 * un filtre de ce module : le moteur ne les rend pas (ADR-023, leurs instances
 * naissent d'un `TitreSalarie` déclaré). L'écran Équipe leur donne déjà une
 * surface juste — « Sans terme écrit · Délivré le … » — et en ouvrir une
 * seconde ici ferait deux états qui divergeraient.
 */
export async function listerEtatsPermanents(
  etablissement: SourceEtablissement,
  equipements: EquipementMatching[],
): Promise<EtatsPermanentsDuDossier> {
  const applicables = determineObligationsApplicables(
    projeterEtablissement(etablissement),
    equipements,
  );

  // Le prédicat d'appartenance, porté par la lecture elle-même.
  //
  // L'unique appelant d'aujourd'hui passe par `requireEtablissement(id)`, et
  // cette lecture était donc sûre. Ça ne suffit pas, et le dépôt l'a déjà écrit
  // ailleurs : `batimentParDefaut` porte le même prédicat MALGRÉ un appelant
  // vérifié, avec la note « décrit l'usage, pas une dispense ».
  //
  // La raison est dans la signature : cette fonction accepte n'importe quel
  // `EtablissementMatching`. Le jour où un second appelant la nourrit d'un id
  // qui n'a pas été confronté au user, les déclarations d'un autre compte
  // sortent — avec leur note libre, qui est du texte écrit par un dirigeant sur
  // sa propre conformité. La sécurité d'une lecture ne doit pas dépendre de qui
  // l'appelle : c'est ce que `batiments/queries.ts` formule par « une lecture
  // qui ne le porte pas devient une fuite le jour où quelqu'un rend la fonction
  // publique ».
  const user = await requireUser();
  const declarations = await prisma.declarationEtatPermanent.findMany({
    where: {
      etablissementId: etablissement.id,
      etablissement: { entreprise: { userId: user.id } },
    },
    select: { obligationId: true, declareLe: true, note: true },
  });
  const parObligation = new Map(declarations.map((d) => [d.obligationId, d]));

  const parDomaine = new Map<DomaineObligation, LigneEtatPermanent[]>();
  const faits: LigneEtatPermanent[] = [];
  let enPlace = 0;
  let total = 0;
  let faitsDates = 0;
  let faitsDatesRenseignes = 0;

  for (const app of applicables) {
    const o = app.obligation;
    // La règle vit dans `regle.ts`, surcharge de prescription comprise. Elle
    // était calculée ici, et la garde de l'action ne la calculait pas : deux
    // lectures de la même règle, dont une fausse.
    const mode = modeDeclarationApplique(app);
    if (!mode) continue;

    const d = parObligation.get(o.id) ?? null;
    const ligne: LigneEtatPermanent = {
      obligation: o,
      mode: mode.mode,
      compteDansLEnTete: mode.compteDansLEnTete,
      pieceAttendue: o.pieceAttendue,
      declareLe: d?.declareLe ?? null,
      note: d?.note ?? null,
    };

    if (mode.compteDansLEnTete) {
      total += 1;
      if (ligne.declareLe) enPlace += 1;
    } else {
      faitsDates += 1;
      if (ligne.declareLe) faitsDatesRenseignes += 1;
    }

    if (mode.mode === "fait") {
      faits.push(ligne);
    } else {
      const liste = parDomaine.get(o.domaine) ?? [];
      liste.push(ligne);
      parDomaine.set(o.domaine, liste);
    }
  }

  const groupes: GroupeEtatsPermanents[] = [...parDomaine.entries()]
    .map(([domaine, lignes]) => ({
      domaine,
      libelle: LABEL_DOMAINE[domaine],
      // L'ordre ne lit PAS `declareLe`, et `ordre.ts` dit pourquoi : il l'a
      // lu jusqu'au 2026-09-03, si bien que déclarer une ligne la faisait
      // descendre au bas de son groupe et remonter toutes les suivantes. Deux
      // clics au même pixel déclaraient deux obligations différentes.
      lignes: ordonnerLignes(lignes),
    }))
    .sort((a, b) => a.libelle.localeCompare(b.libelle, "fr"));

  // Même règle pour « ce qui revient » : un ordre qui dépend de l'état déplace
  // la ligne suivante au moment précis où on va la cliquer.
  ordonnerLignes(faits);

  return { groupes, faits, enPlace, total, faitsDates, faitsDatesRenseignes };
}

/**
 * Les états permanents d'un dossier, chargés depuis son seul identifiant.
 *
 * **Une seule porte pour tout ce qui n'est pas l'écran.** `listerEtatsPermanents`
 * réclame un établissement déjà projeté et son parc : c'est ce que la page a
 * sous la main, et ce que ni le tableau de bord ni un générateur de document
 * n'ont. Chacun aurait donc refait le chargement à sa façon — c'est exactement
 * ainsi que le score du tableau de bord et celui du dossier PDF ont fini par
 * sortir deux valeurs différentes au même instant, chacun composant son
 * dénominateur.
 *
 * **Elle ne recompte rien.** `total`, `enPlace` et les lignes viennent du même
 * passage que l'écran. Un appelant qui n'a besoin que des deux entiers en
 * prend deux (`compterEtatsPermanents`, juste en dessous) ; celui qui imprime
 * les lignes prend les mêmes lignes que celles qui s'affichent. Aucun des deux
 * ne peut décrire un ensemble que l'autre ne décrit pas.
 *
 * **`userId` en paramètre**, sur le modèle de `dashboard/transmissions.ts` :
 * les appelants viennent tous d'un contexte déjà authentifié. La garantie ne
 * s'en remet pas pour autant à l'appelant — le prédicat d'appartenance est
 * porté par la requête ci-dessous, et c'est `etab.id` qui est propagé ensuite,
 * jamais l'identifiant reçu.
 *
 * ⚠ CE PARAMÈTRE N'ÉVITE AUCUNE LECTURE DE SESSION, contrairement à ce que
 * cette note a affirmé le 2026-09-01. `listerEtatsPermanents`, appelée juste
 * en dessous, fait son propre `requireUser()` — c'est elle qui porte le
 * prédicat sur les déclarations, et elle a raison de le faire : sa signature
 * accepte n'importe quel `EtablissementMatching`. La session est donc lue de
 * toute façon, à chaque affichage du tableau de bord comme avant. Constaté en
 * exécutant la fonction hors requête HTTP : elle lève « `cookies` was called
 * outside a request scope », depuis `require-user.ts` via `listerEtatsPermanents`.
 *
 * Ce qu'il faut en retenir pour un appelant futur : l'établissement est borné
 * par le `userId` REÇU, les déclarations par l'utilisateur de la SESSION. Les
 * deux coïncident chez les trois appelants d'aujourd'hui. Passer l'identifiant
 * d'un autre utilisateur ne ferait fuir aucune donnée — la seconde portée est
 * la plus étroite — mais produirait un dossier trouvé et vide, ce qui est un
 * document faux. La correction, si un tel appelant apparaît, est de faire de
 * cette fonction la seule à établir la portée, pas d'ajouter un garde ici.
 */
export async function etatsPermanentsDuDossier(
  etablissementId: string,
  userId: string,
): Promise<EtatsPermanentsDuDossier> {
  const etab = await prisma.etablissement.findFirst({
    where: { id: etablissementId, entreprise: { userId } },
    include: {
      equipements: { where: { actif: true } },
      entreprise: { select: { effectif: true } },
    },
  });
  // Un dossier qui n'est pas celui de l'utilisateur n'a rien à montrer, et
  // zéro sur zéro ne produit aucune indétermination : le score reste ce qu'il
  // aurait été sans ce terme, et le document n'imprime aucun tableau.
  if (!etab) {
    return {
      groupes: [],
      faits: [],
      enPlace: 0,
      total: 0,
      faitsDates: 0,
      faitsDatesRenseignes: 0,
    };
  }

  return listerEtatsPermanents(
    etab,
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

/**
 * Les deux compteurs du score, et rien d'autre.
 *
 * **Pourquoi une entrée séparée plutôt que la précédente rendue telle quelle.**
 * Le tableau de bord n'a besoin que de deux entiers ; lui faire transiter les
 * groupes, les libellés et les dates le rendrait dépendant de la forme
 * d'affichage d'un écran, qui bouge. Le calcul, lui, est le même —
 * l'énumération ci-dessus — et c'est la seule chose qui compte.
 */
export async function compterEtatsPermanents(
  etablissementId: string,
  userId: string,
): Promise<{ total: number; enPlace: number }> {
  const { total, enPlace } = await etatsPermanentsDuDossier(
    etablissementId,
    userId,
  );
  return { total, enPlace };
}
