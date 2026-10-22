import "server-only";
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
  phraseEffectifAConfirmer,
} from "@/lib/matching";
import type { Obligation } from "@/lib/referentiels/conformite";
import {
  GROUPE_REPLI,
  LIBELLE_GROUPE,
  LIBELLE_GROUPE_REPLI,
  LIBELLE_SOUS_CATEGORIE,
  ORDRE_GROUPES,
  ORDRE_SOUS_CATEGORIES,
  rangementDe,
  type GroupeAffichage,
  type SousCategorie,
} from "./familles";
import { modeDeclarationApplique, type ModeDeclaration } from "./regle";
import { faitDeLaLigne } from "./par-les-risques";
import { ordonnerLignes } from "./ordre";
import { contexteFondementDe, fondementDe, type FondementLigne } from "./fondement";
import { PHRASE_SANS_REPONSE } from "@/lib/matching/sans-reponse";
import { obligationsApplicablesDuDossier } from "@/lib/etablissements/dossier-du-rendu";
import {
  etabliParLesTitres,
  etatParLesTitres,
  type EtatParLesTitres,
  type TitreDeclare,
} from "./par-les-titres";

export type LigneEtatPermanent = {
  obligation: Obligation;
  mode: ModeDeclaration["mode"];
  compteDansLEnTete: boolean;
  /** L'écrit que le texte attend, quand il en attend un. */
  pieceAttendue: string | null;
  /** `null` = non déclaré. Sinon la date de la déclaration. */
  declareLe: Date | null;
  note: string | null;
  /**
   * La phrase « à confirmer » quand la ligne n'est retenue que par la prudence
   * d'un seuil compté sur l'entreprise (C37, M1) — le CSE et le règlement
   * intérieur vivent sur CET écran, et c'est ici que le dirigeant doit le lire.
   * `null` sinon.
   */
  aConfirmer: string | null;
  /**
   * Les phrases « à confirmer » des questions à trois états de la fiche
   * restées sans réponse, quand leur silence retient la ligne (C45, M1 —
   * `PHRASE_SANS_REPONSE`). Vide sinon. Même rang que `aConfirmer` : l'écran
   * et le widget les disent à côté de la ligne.
   */
  questionsSansReponse: string[];
  /**
   * L'article en tête des références de l'obligation, et sa `citationCle`
   * (`fondement.ts`). Porté par la ligne pour que l'écran et le widget du
   * tableau de bord citent le même texte sans le rechercher chacun.
   */
  fondement: FondementLigne | null;
  /**
   * L'état ÉTABLI D'APRÈS LES TITRES déclarés, pour la ligne dont un titre est
   * la même obligation vue par personne (`par-les-titres.ts`, 2026-10-16).
   * Elle ne se coche pas : `declareLe` y vaut toujours `null`, une ancienne
   * déclaration est ignorée. `null` pour toute autre ligne.
   */
  parLesTitres: EtatParLesTitres | null;
};

/**
 * Une sous-catégorie d'une famille, ou la famille entière quand elle n'en a
 * pas (`sous` et `libelle` à `null`). Le compteur ne porte, comme celui de
 * l'en-tête, que les lignes en mode « état ».
 */
export type BlocSousCategorie = {
  sous: SousCategorie | null;
  libelle: string | null;
  lignes: LigneEtatPermanent[];
  enPlace: number;
  total: number;
};

export type FamilleEtatsPermanents = {
  /** Une famille du référentiel, ou `autres` — le repli, toujours en dernier. */
  groupe: GroupeAffichage;
  libelle: string;
  blocs: BlocSousCategorie[];
  enPlace: number;
  total: number;
  /**
   * La part de la famille établie d'après les titres déclarés, comptée comme
   * celle de l'en-tête : le compteur de la famille ne peut pas dire « déclarés
   * par vous » d'une ligne que l'employeur n'a pas déclarée.
   */
  parLesTitres: { total: number; enPlace: number };
};

export type EtatsPermanentsDuDossier = {
  /**
   * Les états à déclarer en place, rangés par usage (`familles.ts`) et non
   * plus par domaine depuis le 2026-10-17. Ordre fixe, familles et blocs vides
   * omis ; la somme des compteurs des familles est `total` et `enPlace`. Une
   * ligne sans rangement — un oubli que `familles.test.ts` fait échouer — va
   * en dernier, dans le repli « Autres obligations », et compte comme les
   * autres.
   */
  familles: FamilleEtatsPermanents[];
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
   * Les lignes que seul un fait d'activité fait naître (`par-les-risques.ts`,
   * 2026-10-21) : elles se déclarent sous leur question, dans Équipe ›
   * « Évaluer les risques de vos salariés », et ne figurent ni dans
   * `familles` ni dans `faits`. Elles restent COMPTÉES dans `enPlace`,
   * `total` et `faitsDates` : ce sont des états du dossier, le score et le
   * document les portent. Seul l'endroit où on les déclare change.
   */
  parLesRisques: LigneEtatPermanent[];
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
  /**
   * La part de `total` et d'`enPlace` établie d'après les titres déclarés
   * (`par-les-titres.ts`) — comptée DEDANS, pour que le score la lise comme
   * une case, mais nommée à part : l'employeur n'a rien déclaré sur cet état,
   * et « déclarés en place par vous » le dirait (revue du 2026-10-16).
   */
  parLesTitres: { total: number; enPlace: number };
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
  /**
   * Le passage du moteur sur CES entrées, quand l'appelant l'a déjà
   * (`dossier-du-rendu.ts`, audit du 2026-10-14, H2) : le tableau de bord le
   * partage avec ses autres lectures au lieu d'en refaire un. Absent, il est
   * calculé ici, comme avant.
   */
  applicables: ReturnType<
    typeof determineObligationsApplicables
  > = determineObligationsApplicables(
    projeterEtablissement(etablissement),
    equipements,
  ),
  now: Date = new Date(),
): Promise<EtatsPermanentsDuDossier> {
  const projete = projeterEtablissement(etablissement);
  // Le fondement affiché dépend du type d'ERP (livre II, titre II : une ligne
  // pour plusieurs types, l'article de CE type à l'écran) — 2026-10-14.
  const contexteFondement = contexteFondementDe(projete);

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

  // Les titres des personnes actives, pour les seules lignes établies d'après
  // eux (`etabliParLesTitres`, le prédicat que lit aussi la garde de
  // l'action). Une personne sortie ne répond plus pour l'établissement, comme
  // au calendrier.
  const titresVises = [
    ...new Set(
      applicables.flatMap((a) => {
        const mode = modeDeclarationApplique(a);
        const titre = mode ? etabliParLesTitres(a.obligation, mode.mode) : null;
        return titre ? [titre.id] : [];
      }),
    ),
  ];

  // Deux lectures indépendantes, lancées ensemble (revue du 2026-10-16).
  //
  // ⚠ LE PRÉDICAT D'APPARTENANCE DES TITRES (`userId`) N'A QU'UNE GARDE :
  // `par-les-titres-dossier.test.ts` (« ne lit que les titres des personnes
  // actives de CE dossier »). `tenancy-lectures.test.ts` ne voit pas cette
  // lecture. Retirer le prédicat ne fait tomber que ce test-là.
  const [declarations, titres] = await Promise.all([
    prisma.declarationEtatPermanent.findMany({
      where: {
        etablissementId: etablissement.id,
        etablissement: { entreprise: { userId: user.id } },
      },
      select: { obligationId: true, declareLe: true, note: true },
    }),
    titresVises.length === 0
      ? Promise.resolve([])
      : prisma.titreSalarie.findMany({
          where: {
            obligationId: { in: titresVises },
            salarie: {
              etablissementId: etablissement.id,
              actif: true,
              etablissement: { entreprise: { userId: user.id } },
            },
          },
          select: {
            obligationId: true,
            delivreLe: true,
            echeanceLe: true,
            salarie: { select: { prenom: true, nom: true } },
          },
        }),
  ]);
  const parObligation = new Map(declarations.map((d) => [d.obligationId, d]));
  const titresParObligation = new Map<string, TitreDeclare[]>();
  for (const t of titres) {
    const liste = titresParObligation.get(t.obligationId) ?? [];
    liste.push({
      personne: `${t.salarie.prenom} ${t.salarie.nom}`.trim(),
      delivreLe: t.delivreLe,
      echeanceLe: t.echeanceLe,
    });
    titresParObligation.set(t.obligationId, liste);
  }

  // Clé « groupe/sous » : un bloc par sous-catégorie, ou un par famille sans
  // sous-catégorie.
  const parBloc = new Map<string, LigneEtatPermanent[]>();
  const faits: LigneEtatPermanent[] = [];
  const parLesRisques: LigneEtatPermanent[] = [];
  let enPlace = 0;
  let total = 0;
  const parLesTitresCompte = { total: 0, enPlace: 0 };
  let faitsDates = 0;
  let faitsDatesRenseignes = 0;

  for (const app of applicables) {
    const o = app.obligation;
    // La règle vit dans `regle.ts`, surcharge de prescription comprise. Elle
    // était calculée ici, et la garde de l'action ne la calculait pas : deux
    // lectures de la même règle, dont une fausse.
    const mode = modeDeclarationApplique(app);
    if (!mode) continue;

    const titre = etabliParLesTitres(o, mode.mode);
    const parLesTitres = titre
      ? etatParLesTitres(titre, titresParObligation.get(titre.id) ?? [], now)
      : null;
    const d = parLesTitres ? null : (parObligation.get(o.id) ?? null);
    const ligne: LigneEtatPermanent = {
      obligation: o,
      mode: mode.mode,
      compteDansLEnTete: mode.compteDansLEnTete,
      pieceAttendue: o.pieceAttendue,
      declareLe: d?.declareLe ?? null,
      note: d?.note ?? null,
      aConfirmer: app.effectifAConfirmer
        ? phraseEffectifAConfirmer(
            app.effectifAConfirmer,
            "cette obligation ne vous concerne pas",
          )
        : null,
      questionsSansReponse: (app.sansReponse ?? []).map(
        (q) => PHRASE_SANS_REPONSE[q],
      ),
      fondement: fondementDe(o, contexteFondement),
      parLesTitres,
    };

    if (mode.compteDansLEnTete) {
      total += 1;
      if (parLesTitres ? parLesTitres.enPlace : ligne.declareLe) enPlace += 1;
      if (parLesTitres) {
        parLesTitresCompte.total += 1;
        if (parLesTitres.enPlace) parLesTitresCompte.enPlace += 1;
      }
    } else {
      faitsDates += 1;
      if (ligne.declareLe) faitsDatesRenseignes += 1;
    }

    if (faitDeLaLigne(o)) {
      parLesRisques.push(ligne);
    } else if (mode.mode === "fait") {
      faits.push(ligne);
    } else {
      // ~~Pas de groupe « autres » : une ligne de l'écran sans rangement est un
      // oubli du référentiel, que `familles.test.ts` fait échouer. La cacher
      // fausserait le compteur, la ranger au hasard mentirait sur son usage.~~
      // ~~(la ligne levait ici)~~ [2026-10-17, revue indépendante : lever
      // faisait tomber le score du tableau de bord (`compterEtatsPermanents`),
      // le PDF (`etatsPermanentsDuDossier`) et le widget, qui passent tous par
      // cette lecture — et `build` ne lance pas les tests.] L'oubli reste un
      // échec de `familles.test.ts` ; à l'écran, la ligne tombe dans le repli
      // « Autres obligations » (`familles.ts`), en dernier, comptée comme les
      // autres. Ni cachée, ni rangée au hasard.
      const usage = rangementDe(o);
      const cle = usage
        ? `${usage.groupe}/${usage.sous ?? ""}`
        : `${GROUPE_REPLI}/`;
      const liste = parBloc.get(cle) ?? [];
      liste.push(ligne);
      parBloc.set(cle, liste);
    }
  }

  // L'ordre des familles et des blocs est fixe (`familles.ts`), celui des
  // lignes aussi. Il ne lit PAS `declareLe`, et `ordre.ts` dit pourquoi : il
  // l'a lu jusqu'au 2026-09-03, si bien que déclarer une ligne la faisait
  // descendre au bas de son groupe et remonter toutes les suivantes. Deux
  // clics au même pixel déclaraient deux obligations différentes.
  const compter = (lignes: LigneEtatPermanent[]) => ({
    enPlace: lignes.filter((l) =>
      l.parLesTitres ? l.parLesTitres.enPlace : l.declareLe !== null,
    ).length,
    total: lignes.length,
  });
  const famille = (
    groupe: GroupeAffichage,
    libelle: string,
    blocs: BlocSousCategorie[],
  ): FamilleEtatsPermanents[] =>
    blocs.length === 0
      ? []
      : [
          {
            groupe,
            libelle,
            blocs,
            enPlace: blocs.reduce((n, b) => n + b.enPlace, 0),
            total: blocs.reduce((n, b) => n + b.total, 0),
            parLesTitres: {
              total: blocs.reduce(
                (n, b) => n + b.lignes.filter((l) => l.parLesTitres).length,
                0,
              ),
              enPlace: blocs.reduce(
                (n, b) =>
                  n + b.lignes.filter((l) => l.parLesTitres?.enPlace).length,
                0,
              ),
            },
          },
        ];
  const familles: FamilleEtatsPermanents[] = ORDRE_GROUPES.flatMap((groupe) => {
    const sousCategories = ORDRE_SOUS_CATEGORIES[groupe];
    const blocs: BlocSousCategorie[] = (
      sousCategories.length === 0 ? [null] : sousCategories
    ).flatMap((sous) => {
      const lignes = parBloc.get(`${groupe}/${sous ?? ""}`);
      if (!lignes) return [];
      return [
        {
          sous,
          libelle: sous ? LIBELLE_SOUS_CATEGORIE[sous] : null,
          lignes: ordonnerLignes(lignes),
          ...compter(lignes),
        },
      ];
    });
    return famille(groupe, LIBELLE_GROUPE[groupe], blocs);
  });
  // Le repli, après les familles du référentiel : une carte sans sur-titre,
  // comme une famille sans sous-catégorie.
  const orphelines = parBloc.get(`${GROUPE_REPLI}/`);
  if (orphelines) {
    familles.push(
      ...famille(GROUPE_REPLI, LIBELLE_GROUPE_REPLI, [
        {
          sous: null,
          libelle: null,
          lignes: ordonnerLignes(orphelines),
          ...compter(orphelines),
        },
      ]),
    );
  }

  // Même règle pour « ce qui revient » : un ordre qui dépend de l'état déplace
  // la ligne suivante au moment précis où on va la cliquer.
  ordonnerLignes(faits);
  ordonnerLignes(parLesRisques);

  return {
    familles,
    faits,
    parLesRisques,
    enPlace,
    total,
    parLesTitres: parLesTitresCompte,
    faitsDates,
    faitsDatesRenseignes,
  };
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
  // [2026-10-14, audit Next.js H2] Lecture et passage du moteur partagés avec
  // le reste du rendu (`dossier-du-rendu.ts`) — même prédicat, même parc en
  // service. Hors rendu RSC, ils se font ici comme avant.
  const dossier = await obligationsApplicablesDuDossier(
    etablissementId,
    userId,
  );
  // Un dossier qui n'est pas celui de l'utilisateur n'a rien à montrer, et
  // zéro sur zéro ne produit aucune indétermination : le score reste ce qu'il
  // aurait été sans ce terme, et le document n'imprime aucun tableau.
  if (!dossier) {
    return {
      familles: [],
      faits: [],
      parLesRisques: [],
      enPlace: 0,
      total: 0,
      parLesTitres: { total: 0, enPlace: 0 },
      faitsDates: 0,
      faitsDatesRenseignes: 0,
    };
  }

  return listerEtatsPermanents(
    dossier.etab,
    dossier.equipements,
    dossier.applicables,
  );
}

/**
 * Les deux compteurs du score, et rien d'autre.
 *
 * **Pourquoi une entrée séparée plutôt que la précédente rendue telle quelle.**
 * Le tableau de bord n'a besoin que de deux entiers ; lui faire transiter les
 * familles, les libellés et les dates le rendrait dépendant de la forme
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
