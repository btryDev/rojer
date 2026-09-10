import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { AideEcran } from "@/components/ui-kit/AideEcran";
import { LienProvenance } from "@/components/navigation/LienProvenance";
import { LegalBadge } from "@/components/ui-kit/LegalBadge";
import { BadgeStatut } from "@/components/calendrier/BadgeStatut";
import { MentionContractuelle } from "@/components/prescriptions/MentionContractuelle";
import { estEcheanceContractuelle } from "@/lib/prescriptions/sources";
import { getEtablissement } from "@/lib/etablissements/queries";
import { listerEquipementsDeLEtablissement } from "@/lib/equipements/queries";
import {
  compterSansObligation,
  equipementsSansEcheance,
} from "@/lib/equipements/hors-referentiel";
import { regenererSansInvalider } from "@/lib/calendrier/actions";
import {
  calendrierDesynchronise,
  compterEtatCalendrier,
  listerVerifications,
} from "@/lib/calendrier/queries";
import {
  FAMILLE_DE_TYPE,
  FAMILLES_FILTRABLES,
  famillesAvecEcheances,
  filtrerParBatiment,
  listerAutresEcheances,
  typeDeVerification,
  type EcheanceCalendrier,
  type FamilleEcheance,
  type TypeEcheance,
} from "@/lib/calendrier/echeances";
import { listerBatimentsDeLEtablissement } from "@/lib/batiments/queries";
import {
  estMultiBatiments,
  resoudreFiltreBatiment,
  restreindreAuBatiment,
} from "@/lib/batiments/filtre";
import {
  AnneeCalendrier,
  type AnneeRegle,
} from "@/components/calendrier/AnneeCalendrier";
import type { MoisRegle } from "@/components/calendrier/RegleAnnuelle";
import {
  CHAMP_ETAT,
  ENCRE_ETAT,
  PRIORITE_ETAT,
  classerDate,
  lecturesCalendrier,
  type EtatEcheance,
  type LectureCalendrier,
  type RegistreLigne,
} from "@/lib/calendrier/etats";
import {
  VueParEquipement,
  type EtatMois,
  type GroupeEquipement,
  type LigneEquipement,
  type OccurrenceEquipement,
} from "@/components/calendrier/VueParEquipement";
import { LABEL_CATEGORIE_EQUIPEMENT } from "@/lib/equipements/labels";
import {
  DESCRIPTION_FAMILLE,
  LABEL_FAMILLE,
  MarqueurEcheance,
} from "@/components/calendrier/MarqueurFamille";
import { LABEL_ITEM } from "@/components/layout/sidebar-nav";
import { FiltresCalendrier } from "@/components/calendrier/FiltresCalendrier";
import { SelecteurLecture } from "@/components/calendrier/SelecteurLecture";
import {
  enumererFamilles,
  LABEL_DOMAINE,
  LABEL_PERIODICITE,
  LABEL_TOUT_ETABLISSEMENT,
  libellePorteur,
  MOIS_FR,
  MOIS_FR_COURT,
  libelleMois,
} from "@/lib/calendrier/labels";
import {
  FUSEAU_REFERENCE,
  composantesCiviles,
  joursCivilsEntre,
} from "@/lib/dates";
import { obligationParId } from "@/lib/referentiels/conformite";
import type { DomaineObligation } from "@/lib/referentiels/conformite/types";
import {
  domainesPresents,
  estDomaineConnu,
} from "@/lib/calendrier/domaines-presents";


// Fuseau épinglé : sans lui, le numéro de jour et le mois d'une date
// stockée à minuit UTC reculaient d'une case sur un serveur en UTC.
const FMT_JOUR = new Intl.DateTimeFormat("fr-FR", {
  timeZone: FUSEAU_REFERENCE,
  day: "2-digit",
});
const FMT_MOIS_COURT = new Intl.DateTimeFormat("fr-FR", {
  timeZone: FUSEAU_REFERENCE,
  month: "short",
});
/**
 * La date de référence, en toutes lettres. Tout ce que cette page colore
 * — dépassé, sous 30 jours, à venir — se calcule depuis aujourd'hui
 * (ADR-011) ; l'écran ne disait nulle part depuis quand. C'est le zéro de
 * l'instrument, il s'affiche.
 */
const FMT_AUJOURDHUI = new Intl.DateTimeFormat("fr-FR", {
  timeZone: FUSEAU_REFERENCE,
  weekday: "short",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/**
 * La tuile-date porte la couleur de l'état parce que c'est l'objet que
 * l'œil trouve en premier dans une liste de vingt lignes : la date EST
 * l'information urgente. La pastille de droite garde, elle, le
 * vocabulaire de statut de l'application (« Conforme », « À planifier »…),
 * qui dit autre chose que le retard.
 */
function LigneEcheance({
  href,
  date,
  type,
  titre,
  meta,
  contractuelle,
  pastille,
  registre,
}: {
  href: string;
  /**
   * `null` quand la ligne n'a **jamais eu de rendez-vous** : une occurrence
   * `a_planifier` porte bien une `datePrevue`, mais c'est la date à laquelle
   * le calendrier a été généré, pas une date choisie (ADR-010). L'afficher
   * donnait un jour et un mois qui ressemblaient à une échéance, et — sa
   * date étant vite passée — un « dépassée depuis N jours » où N mesurait
   * l'âge du dossier, pas un retard réglementaire.
   */
  date: Date | null;
  /** Ce que c'est. La famille regroupait trop gros : « Correction » ne
   *  disait pas si l'on voyait une mesure du DUERP ou un signalement. */
  type: TypeEcheance;
  titre: string;
  /** Le complément — le mot de nature est posé par le marqueur. */
  meta: string;
  /**
   * La ligne naît-elle d'un acte contractuel (ADR-032) ? Un booléen et non
   * un morceau de `meta` : `meta` est tronqué au `truncate`, et un marquage
   * qui disparaît quand le libellé est long est un marquage qui manque
   * exactement là où il compte.
   */
  contractuelle?: boolean;
  pastille: React.ReactNode;
  registre: RegistreLigne;
}) {
  return (
    // `LienProvenance` et non `Link` : la fiche ouverte doit pouvoir
    // revenir *ici*, dans la lecture et les filtres du moment. La lecture
    // vivant hors du serveur (`history.replaceState`), seul un lien client
    // la connaît au clic.
    <LienProvenance
      href={href}
      className="-mx-3 flex items-center gap-4 rounded-[20px] px-3 py-3 transition-colors hover:bg-[color:var(--board-slate-pale)]"
    >
      <span
        className="flex size-[50px] flex-none flex-col items-center justify-center rounded-[17px]"
        style={{ background: CHAMP_ETAT[registre] }}
        aria-label={date ? undefined : "Date à renseigner"}
      >
        {date ? (
          <>
            <span className="board-titre text-[18px] leading-none tabular-nums">
              {FMT_JOUR.format(date)}
            </span>
            <span
              className="mt-1 font-mono text-[9px] font-semibold uppercase tracking-[0.1em]"
              style={{ color: ENCRE_ETAT[registre] }}
            >
              {FMT_MOIS_COURT.format(date)}
            </span>
          </>
        ) : (
          <span
            className="font-mono text-[9px] font-semibold uppercase leading-[1.3] tracking-[0.08em]"
            style={{ color: ENCRE_ETAT[registre] }}
            aria-hidden
          >
            à<br />dater
          </span>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="m-0 flex items-baseline gap-2 text-[14.5px] font-semibold leading-[1.3] tracking-[-0.015em] text-[color:var(--board-ink)]">
          <span className="min-w-0 truncate">{titre}</span>
          {contractuelle && <MentionContractuelle />}
        </p>
        {/* Nature puis complément. Le mot est visible : une icône seule
            disparaît en niveaux de gris et pour qui n'y voit pas. */}
        <p className="m-0 mt-1 flex items-center gap-1.5 truncate text-[12.5px] text-[color:var(--board-slate-mid)]">
          <MarqueurEcheance type={type} />
          <span aria-hidden>·</span>
          <span className="min-w-0 truncate">{meta}</span>
        </p>
      </div>
      {pastille}
      <ChevronRight className="size-4 flex-none text-[color:var(--board-slate-soft)]" />
    </LienProvenance>
  );
}

export default async function CalendrierPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    domaine?: string;
    urgent?: string;
    famille?: string;
    vue?: string;
    batiment?: string;
  }>;
}) {
  const { id } = await params;
  const { domaine, urgent, famille, batiment } = await searchParams;
  const etab = await getEtablissement(id);
  if (!etab) notFound();

  // Le filtre bâtiment n'existe qu'à partir de deux bâtiments (ADR-019) ;
  // un id inconnu vaut « tout l'établissement ».
  const batiments = await listerBatimentsDeLEtablissement(id);
  const multiBatiments = estMultiBatiments(batiments);
  const filtreBatiment = resoudreFiltreBatiment(batiments, batiment);

  const filtreFamille = FAMILLES_FILTRABLES.includes(famille as FamilleEcheance)
    ? (famille as FamilleEcheance)
    : undefined;
  // Le domaine est un attribut des contrôles : il n'a de sens que sur
  // eux (filtre famille « Tout » ou « Contrôles »).
  const filtreDomaine =
    (!filtreFamille || filtreFamille === "controle") &&
    estDomaineConnu(domaine)
      ? (domaine as DomaineObligation)
      : undefined;
  const filtreUrgent = urgent === "1";

  // Rattrapage à l'affichage, pour deux motifs distincts :
  //
  //  1. **Calendrier vide alors que des équipements sont déclarés** — anciens
  //     comptes d'avant la génération automatique, ou mutation qui a échoué
  //     silencieusement à régénérer.
  //  2. **Calendrier généré avec une version antérieure du référentiel** — le
  //     référentiel vit en TypeScript (ADR-003) et ses corrections (périodicité
  //     rectifiée, obligation retirée, libellé reformulé) n'étaient jusqu'ici
  //     propagées qu'au hasard d'une mutation d'équipement. Deux établissements
  //     identiques pouvaient afficher deux échéances différentes, et une
  //     obligation supprimée du référentiel laissait des lignes orphelines
  //     invisibles des filtres du registre et du dossier de contrôle.
  //
  // La réconciliation est idempotente et ne détruit jamais une ligne portant un
  // rapport, une action ou une date de réalisation (cf. ADR-012) : la relancer
  // est sans risque, et elle ne réécrit que ce qui a réellement changé.
  const etat0 = await compterEtatCalendrier(id);
  const aucuneOccurrenceEnBase =
    etat0.enRetard === 0 &&
    etat0.aPlanifier === 0 &&
    etat0.aVenir === 0 &&
    etat0.realisees12m === 0;

  // Le garde « au moins un équipement déclaré » a été retiré le 2026-08-27
  // (ADR-022). Il datait d'un référentiel où toute obligation naissait d'un
  // équipement : sans équipement, il n'y avait rien à générer, et sauter la
  // génération évitait d'écrire un repère de version sur un établissement en
  // cours d'onboarding.
  //
  // Ce n'est plus vrai. `PE 4 § 2` et `R. 4222-20` sont dues sans qu'aucun
  // appareil soit déclaré — c'est exactement la population que le chantier du
  // porteur existe pour servir. Le garde faisait donc, à lui seul, que ces
  // deux lignes n'atteignaient jamais la base chez ceux qui en ont le plus
  // besoin : le premier `if` était pris, la seconde branche jamais atteinte,
  // et le calendrier restait vide en silence.
  //
  // Générer sans équipement est sans effet de bord : le moteur ne rend que ce
  // qui s'applique, et la réconciliation est idempotente (ADR-012).
  let regenere = false;
  if (aucuneOccurrenceEnBase || (await calendrierDesynchronise(id))) {
    // `regenererSansInvalider` et non `genererCalendrier` : nous sommes DANS
    // un rendu, et Next refuse `revalidatePath` à cet endroit — « unsupported,
    // it must always happen outside of renders ». Invalider ici n'aurait
    // d'ailleurs aucun sens : la page se calcule à l'instant, elle n'a rien à
    // invalider d'elle-même.
    //
    // Le tableau de bord et la fiche établissement se rafraîchissent donc à la
    // navigation suivante plutôt qu'immédiatement. C'était déjà le
    // comportement réel — l'appel était ignoré, pas honoré.
    await regenererSansInvalider(id);
    regenere = true;
  }

  const [
    verifsBruts,
    etat,
    autresEcheances,
    equipementsTous,
    motifsSansEcheance,
    verifsDuLieu,
  ] = await Promise.all([
      listerVerifications(id, {
        domaine: filtreDomaine,
        urgentsSeulement: filtreUrgent,
        batimentId: filtreBatiment,
      }),
      // Les compteurs viennent d'être calculés trois lignes plus haut : on
      // ne les refait que si une régénération a changé la donnée entre-temps —
      // ou si un bâtiment est filtré. `etat0` sert à décider d'une
      // régénération, donc il porte sur tout l'établissement ; le réemployer
      // tel quel à l'affichage annonçait les occurrences sans date de tout
      // l'établissement au-dessus d'une liste restreinte à un bâtiment. Le
      // même écart avait été soigneusement neutralisé sous le filtre famille.
      regenere || filtreBatiment
        ? compterEtatCalendrier(id, new Date(), { batimentId: filtreBatiment })
        : Promise.resolve(etat0),
      listerAutresEcheances(id),
      // Le parc entier, pas seulement les appareils qui portent une
      // échéance : la lecture par équipement doit pouvoir dire combien
      // n'en ont aucune.
      listerEquipementsDeLEtablissement(id),
      // …et POURQUOI ils n'en ont aucune. « Rien à cette date » et « le
      // référentiel ne calcule rien pour cet appareil » se ressemblaient
      // trait pour trait sur cet écran : un calendrier qui n'affiche rien
      // pour un équipement déclaré doit pouvoir l'expliquer.
      equipementsSansEcheance(id),
      // Les lignes du lieu SANS filtre de domaine ni d'urgence : elles ne
      // servent qu'à savoir quels domaines proposer au filtre. Les lire sur
      // `verifsBruts` ferait disparaître de la liste des choix tous les
      // domaines sauf celui qu'on vient de choisir. Dans le même
      // `Promise.all`, donc sans allonger le rendu.
      listerVerifications(id, { batimentId: filtreBatiment }),
    ]);
  const aujourdhui = new Date();
  // La lecture par équipement suit le même bâtiment que le reste.
  const equipements = restreindreAuBatiment(equipementsTous, filtreBatiment);
  // …et les motifs d'absence d'échéance suivent les mêmes appareils. Sans
  // cette restriction, l'écran écrivait « 3 équipements déclarés sans échéance
  // en 2026. Dont 7 hors référentiel » : le premier nombre venait du bâtiment
  // filtré, le second de tout l'établissement.
  const motifsVisibles = new Map(
    [...motifsSansEcheance].filter(([equipementId]) =>
      equipements.some((e) => e.id === equipementId),
    ),
  );

  // Cohabitation des familles : le filtre famille partitionne, le
  // domaine implique « contrôles », l'urgence garde le dépassé partout.
  //
  // Le flux des vérifications porte DEUX familles (ADR-016, ADR-023) : le
  // filtre s'y lit ligne par ligne, sur la famille déduite du porteur, et
  // non en gardant ou jetant le flux entier.
  const verifsVisibles = filtreFamille
    ? verifsBruts.filter(
        (v) => FAMILLE_DE_TYPE[typeDeVerification(v)] === filtreFamille,
      )
    : verifsBruts;
  // Les échéances du registre suivent le filtre famille — y compris la
  // famille « controle » (analyses légionelles). Seul le filtre domaine
  // les écarte : il qualifie le référentiel d'équipements, rien d'autre.
  // Le bâtiment, lui, laisse passer ce qui concerne tout l'établissement
  // (ADR-019) : masquer la mise à jour du DUERP sous « Réserve » ferait
  // mentir le calendrier par omission.
  const autresVisibles = filtreDomaine
    ? []
    : filtrerParBatiment(
        autresEcheances.filter(
          (e) =>
            (!filtreFamille || filtreFamille === e.famille) &&
            (!filtreUrgent || e.tone === "alerte"),
        ),
        filtreBatiment,
      );

  // En multi-bâtiments, la méta d'une ligne dit d'abord où ça se passe.
  const lieuDe = (b: { nom: string } | null): string | null =>
    multiBatiments ? (b?.nom ?? LABEL_TOUT_ETABLISSEMENT) : null;
  const metaAutre = (e: EcheanceCalendrier): string => {
    const lieu = lieuDe(e.batiment);
    return lieu ? `${lieu} · ${e.origine}` : e.origine;
  };

  // La liste mensuelle mêle les deux, triés par date dans chaque mois.
  //
  // Une vérification n'est pas posée telle quelle : `lecturesCalendrier`
  // déplie la ligne de suivi — un cycle soldé donne DEUX événements, le
  // fait au jour du fait et le rendez-vous suivant à sa date, classé
  // comme un futur ordinaire. Sans ce dépli, la prochaine échéance d'un
  // contrôle annuel soldé s'affichait en vert « faite »… un an trop tôt.
  type LigneMois =
    | {
        genre: "verif";
        date: Date;
        v: (typeof verifsBruts)[number];
        // Le registre d'une LECTURE, pas d'une ligne : `archivee` en est
        // exclu par construction (`lecturesCalendrier` n'en produit aucune).
        registre: LectureCalendrier["registre"];
        lecture: LectureCalendrier["lecture"];
      }
    | { genre: "autre"; date: Date; e: EcheanceCalendrier };
  const lignes: LigneMois[] = [
    ...verifsVisibles.flatMap((v) =>
      lecturesCalendrier(v, aujourdhui).map((lec) => ({
        genre: "verif" as const,
        date: lec.date,
        v,
        registre: lec.registre,
        lecture: lec.lecture,
      })),
    ),
    ...autresVisibles.map((e) => ({
      genre: "autre" as const,
      date: e.date,
      e,
    })),
  ];
  const parMois = new Map<string, LigneMois[]>();
  for (const l of lignes) {
    // Mois civil lu en heure de Paris : `getMonth()` sur une date stockée
    // à minuit UTC dépend du fuseau du serveur, et rangeait une échéance
    // du 1er du mois dans le mois précédent sur un hôte à l'ouest de UTC.
    const c = composantesCiviles(l.date);
    const cle = `${c.annee}-${String(c.mois).padStart(2, "0")}`;
    const bucket = parMois.get(cle) ?? [];
    bucket.push(l);
    parMois.set(cle, bucket);
  }
  const moisTries = [...parMois.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  );
  for (const [, liste] of moisTries) {
    liste.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  // ─────────────────────────────────────────────────────────────────
  // La règle annuelle : les mêmes lignes, vues de loin.
  //
  // Deux règles de fond, héritées de la grille qu'elle remplace :
  //
  //   1. Les occurrences « à planifier » n'entrent PAS dans les barres.
  //      Leur `datePrevue` est une date de génération, pas un rendez-vous :
  //      les poser sur un mois donnerait à lire un engagement qui n'existe
  //      pas. Elles sont annoncées à part, par le compteur « sans date » —
  //      et la liste, elle, les garde, parce qu'elle affiche leur statut.
  //   2. La couleur d'un segment dit l'état, jamais le volume (cf.
  //      `RegleAnnuelle`).
  // Une seule lecture des composantes civiles d'aujourd'hui : l'année de
  // travail et la date affichée en tête sortent du même appel, donc du
  // même fuseau.
  const civilesAujourdhui = composantesCiviles(aujourdhui);
  const anneeCourante = civilesAujourdhui.annee;

  // Le classement vit dans `lib/calendrier/etats` (bâti sur les prédicats
  // de `lib/dates/retard`) : cette page l'a redérivé à la main une fois,
  // et ça a produit deux compteurs contradictoires sur le même écran. Le
  // registre d'une ligne de vérification est figé au dépli
  // (`lecturesCalendrier`), plus jamais recalculé.
  const etatDeLaLigne = (l: LigneMois): EtatEcheance => {
    if (l.genre !== "verif") {
      return l.e.tone === "alerte"
        ? "enRetard"
        : classerDate(l.date, aujourdhui);
    }
    // « À planifier » (donc à date future — le classifieur a déjà rangé
    // les dates passées en retard) est écarté des barres par `datable` ;
    // si la ligne arrive quand même ici, sa date de génération se classe
    // comme une date ordinaire plutôt que d'inventer un état de barre.
    return l.registre === "aPlanifier"
      ? classerDate(l.date, aujourdhui)
      : l.registre;
  };

  // « Datable » : mérite une place sur les barres. Une `a_planifier` qui
  // attend son rendez-vous n'en a pas (sa date est une date de
  // génération) ; une `a_planifier` en retard en a une — le mois où elle
  // est devenue due — comme sur la frise du tableau de bord.
  const datable = (l: LigneMois) =>
    l.genre !== "verif" || l.registre !== "aPlanifier";

  const regleDeLAnnee = (a: number): MoisRegle[] =>
    Array.from({ length: 12 }, (_, i) => {
      const cle = `${a}-${String(i + 1).padStart(2, "0")}`;
      const compte = { enRetard: 0, proche: 0, lointain: 0, faite: 0 };
      for (const l of parMois.get(cle) ?? []) {
        if (!datable(l)) continue;
        compte[etatDeLaLigne(l)] += 1;
      }
      return {
        cle,
        label: MOIS_FR_COURT[i],
        labelLong: `${MOIS_FR[i]} ${a}`,
        ...compte,
      };
    });

  // La règle couvre TOUTES les années du dossier, d'un seul tenant : de
  // la plus ancienne dette au contrôle quinquennal le plus lointain, sans
  // trou — une année déserte entre deux se feuillette comme les autres,
  // sinon les flèches sauteraient des pages. L'année courante est toujours
  // du voyage : c'est la page ouverte à l'arrivée.
  const anneesAvecLignes = [...parMois.keys()].map((k) => Number(k.slice(0, 4)));
  const anneeMin = Math.min(anneeCourante, ...anneesAvecLignes);
  const anneeMax = Math.max(anneeCourante, ...anneesAvecLignes);
  const anneesRegle: AnneeRegle[] = Array.from(
    { length: anneeMax - anneeMin + 1 },
    (_, i) => ({ annee: anneeMin + i, mois: regleDeLAnnee(anneeMin + i) }),
  );

  // ─────────────────────────────────────────────────────────────────
  // La lecture par équipement : mêmes occurrences, autre regroupement.
  //
  // Seuls les contrôles s'y rattachent — une attestation de prestataire ou
  // un travail du plan d'actions ne tient à aucun appareil. Les compter
  // sous un équipement serait faux, les taire ferait croire que le parc
  // porte toute la conformité : la vue les annonce à part.
  const parEquipement = new Map<
    string,
    {
      libelle: string;
      categorie: string;
      categorieCode: string;
      mois: EtatMois[];
      compte: Record<EtatEcheance, number>;
      aPlanifier: number;
      /** Occurrences datées hors de l'année affichée. */
      horsAnnee: number;
      dates: { date: Date; etat: EtatEcheance }[];
      occurrences: OccurrenceEquipement[];
    }
  >();

  for (const v of verifsVisibles) {
    // Cette vue range les échéances **par équipement**. Celles qui portent
    // sur l'établissement (ADR-022) n'y ont pas de colonne : elles restent
    // lisibles dans la vue chronologique, qui les affiche « Tout
    // l'établissement ». Les forcer ici créerait un appareil qui n'existe pas.
    if (!v.equipement) continue;
    const cle = v.equipement.id;
    let e = parEquipement.get(cle);
    if (!e) {
      e = {
        libelle: v.equipement.libelle,
        categorie: LABEL_CATEGORIE_EQUIPEMENT[v.equipement.categorie],
        categorieCode: v.equipement.categorie,
        mois: Array.from({ length: 12 }, () => null),
        compte: { enRetard: 0, proche: 0, lointain: 0, faite: 0 },
        aPlanifier: 0,
        horsAnnee: 0,
        dates: [],
        occurrences: [],
      };
      parEquipement.set(cle, e);
    }
    // Même dépli que la liste mensuelle : un cycle soldé pose le fait au
    // jour du fait ET le rendez-vous suivant à sa date — sans quoi la
    // carte de l'appareil peignait sa prochaine échéance en vert.
    for (const lec of lecturesCalendrier(v, aujourdhui)) {
      if (lec.registre === "aPlanifier") {
        e.aPlanifier += 1;
        continue;
      }
      const etat = lec.registre;
      // `dates` sert la « prochaine échéance », qui n'est bornée par
      // aucune année : une dette de l'an dernier compte toujours.
      e.dates.push({ date: lec.date, etat });

      // Les compteurs décrivent l'APPAREIL, pas l'année : une dette de
      // l'an dernier reste une dette, et une vérification faite en
      // septembre dernier reste faite. Les borner à l'année civile les
      // faisait disparaître de l'écran au 1er janvier — ce qui est faux,
      // et pire que l'écart qu'on cherchait à éviter.
      e.compte[etat] += 1;

      const c = composantesCiviles(lec.date);
      if (c.annee !== anneeCourante) {
        // La règle, elle, ne montre qu'une année. L'écart entre ce
        // qu'elle marque et ce que comptent les pilules se dit plutôt
        // qu'il ne se corrige : « +1 hors 2026 ».
        e.horsAnnee += 1;
      } else {
        const i = c.mois - 1;
        const actuel = e.mois[i];
        // Une case ne peut porter qu'un état : c'est le plus urgent du
        // mois qui gagne. Mélanger les teintes sur 18 px ne se lirait pas.
        if (!actuel || PRIORITE_ETAT[etat] > PRIORITE_ETAT[actuel])
          e.mois[i] = etat;

        const o = obligationParId(v.obligationId);
        e.occurrences.push({
          // Deux lectures d'une même ligne peuvent cohabiter dans
          // l'année : la clé porte la lecture pour rester unique.
          id: `${v.id}:${lec.lecture}`,
          href: `/etablissements/${id}/verifications/${v.id}`,
          mois: c.mois,
          jour: FMT_JOUR.format(lec.date),
          moisCourt: FMT_MOIS_COURT.format(lec.date),
          titre: v.libelleObligation,
          meta:
            LABEL_PERIODICITE[v.periodicite] +
            (o ? ` · ${LABEL_DOMAINE[o.domaine]}` : ""),
          contractuelle: estEcheanceContractuelle(v),
          etat,
          // Le rendez-vous suivant n'hérite pas du statut réalisé de la
          // ligne : sa pastille dit ce qu'il est — planifié.
          statut: lec.lecture === "prochaine" ? "planifiee" : v.statut,
        });
      }
    }
  }

  const lignesEquipement: LigneEquipement[] = [...parEquipement.entries()]
    .map(([idEq, e]) => {
      const enRetard = e.dates
        .filter((d) => d.etat === "enRetard")
        .sort((a, b) => a.date.getTime() - b.date.getTime());
      const futures = e.dates
        .filter((d) => d.etat === "proche" || d.etat === "lointain")
        .sort((a, b) => a.date.getTime() - b.date.getTime());
      // La plus ancienne dette d'abord : c'est elle qui coûte. À défaut,
      // la prochaine échéance.
      const cible = enRetard[0] ?? futures[0] ?? null;
      const jours = cible
        ? Math.abs(joursCivilsEntre(aujourdhui, cible.date))
        : 0;
      return {
        id: idEq,
        libelle: e.libelle,
        categorie: e.categorie,
        categorieCode: e.categorieCode,
        // La fiche de l'appareil, pas son formulaire : ouvrir un champ de
        // saisie quand on demande à voir un équipement était le seul
        // chemin disponible avant qu'elle existe.
        hrefFiche: `/etablissements/${id}/equipements/${idEq}`,
        mois: e.mois,
        enRetard: e.compte.enRetard,
        proche: e.compte.proche,
        lointain: e.compte.lointain,
        faite: e.compte.faite,
        aPlanifier: e.aPlanifier,
        horsAnnee: e.horsAnnee,
        occurrences: [...e.occurrences].sort(
          (a, b) => a.mois - b.mois || a.jour.localeCompare(b.jour),
        ),
        prochaine: cible
          ? {
              etat: cible.etat,
              libelle:
                cible.etat === "enRetard"
                  ? `Dépassée de ${jours} j`
                  : jours === 0
                    ? "Aujourd'hui"
                    : `Dans ${jours} jour${jours > 1 ? "s" : ""}`,
            }
          : null,
      };
    })
    .sort(
      (a, b) => b.enRetard - a.enRetard || a.libelle.localeCompare(b.libelle),
    );

  // Les appareils se lisent par catégorie : six extincteurs dispersés
  // dans une liste triée par retard, c'est six fois la même question
  // posée à six endroits, alors qu'on les traite ensemble — un seul
  // prestataire, une seule visite. Le groupe porte donc le solde de la
  // catégorie, et l'ordre met devant celle qui coûte le plus.
  const groupesEquipement: GroupeEquipement[] = [
    ...lignesEquipement
      .reduce((acc, l) => {
        const g = acc.get(l.categorieCode) ?? {
          categorie: l.categorie,
          categorieCode: l.categorieCode,
          uniteLigne: "appareil",
          lignes: [],
          enRetard: 0,
          proche: 0,
          lointain: 0,
          faite: 0,
          aPlanifier: 0,
        };
        g.lignes.push(l);
        g.enRetard += l.enRetard;
        g.proche += l.proche;
        g.lointain += l.lointain;
        g.faite += l.faite;
        g.aPlanifier += l.aPlanifier;
        acc.set(l.categorieCode, g);
        return acc;
      }, new Map<string, GroupeEquipement>())
      .values(),
  ].sort(
    (a, b) =>
      b.enRetard - a.enRetard ||
      b.proche - a.proche ||
      a.categorie.localeCompare(b.categorie),
  );

  // Ce qui ne tient à aucun appareil — attestation de prestataire,
  // correction du plan d'actions, analyse du carnet sanitaire — se rangeait
  // jusqu'ici dans une note de bas de vue, c'est-à-dire nulle part. Ces
  // échéances ont pourtant un porteur naturel : leur famille. Le groupe
  // « Autres échéances » les accueille, une carte par famille, avec la
  // même règle annuelle et le même tiroir que les appareils.
  const parFamille = new Map<
    FamilleEcheance,
    {
      mois: EtatMois[];
      compte: Record<EtatEcheance, number>;
      horsAnnee: number;
      dates: { date: Date; etat: EtatEcheance }[];
      occurrences: OccurrenceEquipement[];
    }
  >();

  for (const e of autresVisibles) {
    let f = parFamille.get(e.famille);
    if (!f) {
      f = {
        mois: Array.from({ length: 12 }, () => null),
        compte: { enRetard: 0, proche: 0, lointain: 0, faite: 0 },
        horsAnnee: 0,
        dates: [],
        occurrences: [],
      };
      parFamille.set(e.famille, f);
    }
    const etat = etatDeLaLigne({ genre: "autre", date: e.date, e });
    f.dates.push({ date: e.date, etat });
    f.compte[etat] += 1;

    const c = composantesCiviles(e.date);
    if (c.annee !== anneeCourante) {
      f.horsAnnee += 1;
    } else {
      const i = c.mois - 1;
      const actuel = f.mois[i];
      if (!actuel || PRIORITE_ETAT[etat] > PRIORITE_ETAT[actuel]) {
        f.mois[i] = etat;
      }
      f.occurrences.push({
        id: e.id,
        href: e.href,
        mois: c.mois,
        jour: FMT_JOUR.format(e.date),
        moisCourt: FMT_MOIS_COURT.format(e.date),
        titre: e.libelle,
        meta: metaAutre(e),
        etat,
      });
    }
  }

  const lignesAutres: LigneEquipement[] = [...parFamille.entries()]
    .map(([famille, f]) => {
      const enRetard = f.dates
        .filter((d) => d.etat === "enRetard")
        .sort((a, b) => a.date.getTime() - b.date.getTime());
      const futures = f.dates
        .filter((d) => d.etat === "proche" || d.etat === "lointain")
        .sort((a, b) => a.date.getTime() - b.date.getTime());
      const cible = enRetard[0] ?? futures[0] ?? null;
      const jours = cible
        ? Math.abs(joursCivilsEntre(aujourdhui, cible.date))
        : 0;
      return {
        id: `famille-${famille}`,
        libelle: LABEL_FAMILLE[famille],
        categorie: "Autres échéances",
        categorieCode: "AUTRES",
        // Une famille n'a pas de fiche : sa porte, c'est la liste
        // mensuelle filtrée sur elle.
        hrefFiche: `/etablissements/${id}/calendrier?famille=${famille}`,
        mois: f.mois,
        enRetard: f.compte.enRetard,
        proche: f.compte.proche,
        lointain: f.compte.lointain,
        faite: f.compte.faite,
        aPlanifier: 0,
        horsAnnee: f.horsAnnee,
        occurrences: [...f.occurrences].sort(
          (a, b) => a.mois - b.mois || a.jour.localeCompare(b.jour),
        ),
        prochaine: cible
          ? {
              etat: cible.etat,
              libelle:
                cible.etat === "enRetard"
                  ? `Dépassée de ${jours} j`
                  : jours === 0
                    ? "Aujourd'hui"
                    : `Dans ${jours} jour${jours > 1 ? "s" : ""}`,
            }
          : null,
      };
    })
    .sort(
      (a, b) => b.enRetard - a.enRetard || a.libelle.localeCompare(b.libelle),
    );

  // En queue, jamais mêlé au parc : ce groupe ne parle pas d'appareils.
  if (lignesAutres.length > 0) {
    groupesEquipement.push({
      categorie: "Autres échéances",
      categorieCode: "AUTRES",
      uniteLigne: "famille",
      lignes: lignesAutres,
      enRetard: lignesAutres.reduce((n, l) => n + l.enRetard, 0),
      proche: lignesAutres.reduce((n, l) => n + l.proche, 0),
      lointain: lignesAutres.reduce((n, l) => n + l.lointain, 0),
      faite: 0,
      aPlanifier: 0,
    });
  }

  // Les équipements déclarés qui ne portent aucune occurrence : ils ne
  // font pas de ligne, mais leur nombre se dit.
  const sansEcheance = Math.max(
    0,
    equipements.length - lignesEquipement.length,
  );
  // Parmi eux, ceux dont l'absence n'est pas conjoncturelle : le moteur ne
  // rend aucune échéance pour ces appareils, aujourd'hui comme demain.
  // Sans cette distinction, « rien cette année » et « rien jamais » se
  // lisaient pareil — et le second ressemblait à « rien à faire ».
  //
  // On compte via `compterSansObligation` et non la taille de la table : un
  // appareil dont les obligations sont permanentes n'est pas « hors
  // référentiel », et la phrase affichée plus bas serait fausse pour lui.
  const horsReferentiel = compterSansObligation(motifsVisibles);

  // Le mois déplié à l'arrivée : celui où l'on est, s'il porte quelque
  // chose ; sinon le premier mois qui a du retard — c'est là que se joue
  // la conformité —, sinon le premier mois tout court.
  const cleMoisCourant = `${anneeCourante}-${String(
    composantesCiviles(aujourdhui).mois,
  ).padStart(2, "0")}`;
  const moisInitial =
    (parMois.has(cleMoisCourant) ? cleMoisCourant : null) ??
    anneesRegle.flatMap((a) => a.mois).find((m) => m.enRetard > 0)?.cle ??
    moisTries[0]?.[0] ??
    null;

  // Pilules de famille : seules celles qui ont au moins une échéance —
  // une famille vide n'a pas à encombrer la rangée.
  //
  // Elles se lisent sur les échéances **du bâtiment filtré**, sinon la pilule
  // « Opérations » restait proposée sous un bâtiment où le seul permis de feu
  // n'est pas : la choisir menait à « Rien ne correspond à ces filtres ».
  //
  // Les familles du flux des vérifications se lisent sur `etat`, qui compte
  // TOUTES les lignes du lieu — pas sur `verifsBruts`, déjà réduit par le
  // domaine et l'urgence : une pilule qui s'efface sous « En retard
  // seulement » ne se retrouve plus, et c'est le sort qu'elle a déjà évité
  // pour « Opérations ».
  //
  // La règle elle-même vit dans `calendrier/echeances.ts`, où elle est testée.
  const echeancesDuLieu = filtrerParBatiment(autresEcheances, filtreBatiment);
  const famillesPresentes = famillesAvecEcheances(
    etat.toutesParType,
    echeancesDuLieu,
  );

  const baseHref = `/etablissements/${id}/calendrier`;

  const calendrierVide =
    etat.enRetard === 0 &&
    etat.aPlanifier === 0 &&
    etat.aVenir === 0 &&
    etat.realisees12m === 0;

  // La bande de titre — l'identité de l'écran, et rien d'autre.
  //
  // Elle a été un bandeau ciel, puis une carte du bento, puis un aplat
  // d'encre, puis un blanc plat. Le blanc plat était le pire : la barre de
  // compte au-dessus est déjà une bande claire à filet, et la rangée de
  // filtres en dessous une troisième — trois strates pâles se suivaient
  // sans rien pour les hiérarchiser, et la bande ne portait que deux
  // niveaux de texte (le titre, un paragraphe gris).
  //
  // Elle en porte quatre, du plus discret au plus haut : le rail de
  // contexte en mono (d'où l'on vient, depuis quand on compte), le titre
  // en grand, la phrase. Les commandes, elles, sont parties dans la barre
  // de réglage de l'instrument — voir `commandes` plus bas.
  //
  // L'espacement suit le même contraste : serré entre le rail et le titre,
  // serré entre le titre et sa phrase, ouvert avant le filet.
  const bandeTitre = (
    <div className="border-b border-[color:var(--board-slate-line)] bg-[color:var(--board-card)] px-[var(--board-gutter)] pb-8 pt-[26px]">
      {/* Le rail de contexte : d'où l'on vient à gauche, depuis quand on
          compte à droite. Deux registres distincts pour qu'ils ne se
          lisent pas comme une même taxonomie — le retour est bleu et
          cliquable, la date est une valeur, étiquette grise puis chiffre
          en encre. */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
        {/* Le chevron seul n'avait pas de destination lisible : nommer
            l'établissement dit où il mène, et la page dit enfin de quel
            dossier elle est le calendrier. */}
        <Link
          href={`/etablissements/${id}`}
          className="board-eyebrow group -ml-0.5 inline-flex min-w-0 items-center gap-1.5 transition-colors hover:text-[color:var(--board-ink)]"
        >
          <ChevronRight
            aria-hidden
            className="size-3 flex-none rotate-180 transition-transform group-hover:-translate-x-0.5"
          />
          <span className="truncate">{etab.raisonDisplay}</span>
        </Link>

        {/* Le zéro de l'instrument. « En retard », « sous 30 jours » et
            « à venir » se mesurent tous depuis ce jour-là (ADR-011) : la
            page les colorait sans jamais dire depuis quand. */}
        <p className="m-0 flex flex-none items-baseline gap-2.5 font-mono text-[10.5px] leading-none">
          <span className="uppercase tracking-[0.18em] text-[color:var(--board-slate-soft)]">
            Aujourd&apos;hui
          </span>
          <time
            /* Le fuseau de référence, pas UTC (ADR-011) : `toISOString`
               rendrait la veille pour toute la première heure de la
               journée, et l'attribut contredirait la date affichée. */
            dateTime={`${civilesAujourdhui.annee}-${String(civilesAujourdhui.mois).padStart(2, "0")}-${String(civilesAujourdhui.jour).padStart(2, "0")}`}
            className="tabular-nums tracking-[0.02em] text-[color:var(--board-ink)]"
          >
            {FMT_AUJOURDHUI.format(aujourdhui)}
          </time>
        </p>
      </div>

      {/* Le titre prend la taille de son rang : c'est la page, pas l'en-tête
          d'une carte. À 27 px il pesait le même poids qu'un titre de mois
          dans la liste juste dessous. */}
      <h1 className="board-titre m-0 mt-3 text-[clamp(29px,3vw,39px)]">
        {LABEL_ITEM.calendrier}
      </h1>
      {/* « Calendrier » ne dit pas ce qu'on y trouve : les familles y sont
          réunies depuis l'ADR-010. La phrase les nomme — et rien de plus :
          « cliquez une ligne pour la traiter » décrivait un clic que la ligne
          annonce déjà toute seule.

          Elle les nommait de mémoire, et quatre sur cinq : `personnel` est née
          avec l'ADR-023 sans que personne rouvre la phrase. Elle se dérive
          désormais de `FAMILLES_FILTRABLES` (`enumererFamilles`).

          La seconde phrase est là parce que le dirigeant arrive souvent ici
          depuis un compteur d'équipement qui annonce un autre nombre. Elle dit
          l'écart dans le sens utile — ce que le parc laisse dehors — sans
          revendiquer d'exclusivité : le relevé « Dépassées » du tableau de bord
          réunit lui aussi toutes les familles. */}
      <p className="m-0 mt-[11px] max-w-[62ch] text-[14.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
        {filtreFamille
          ? DESCRIPTION_FAMILLE[filtreFamille]
          : `Vos échéances datées, toutes réunies : ${enumererFamilles()}. Le parc et les zones, eux, ne comptent que ce que portent vos équipements.`}
      </p>
    </div>
  );

  // Ce que la page doit expliquer mais qu'on ne lit qu'une fois — d'où
  // vient le calendrier, ce que comptent les compteurs, les articles qui
  // fondent l'obligation, comment lire la règle. En texte courant au-dessus
  // du contenu, ces notes coûtaient trois lignes et deux badges à chaque
  // visite ; elles vivent désormais derrière le « ? » de la barre d'outils,
  // et les autres pages rangeront les leurs au même endroit (`AideEcran`).
  const aide = (
    <AideEcran titre="Comment lire cette page">
      <p className="m-0">
        Le calendrier se met à jour tout seul dès que vous ajoutez ou modifiez
        un équipement — chaque occurrence cite son obligation légale et le
        profil de réalisateur requis.
      </p>
      <p className="m-0">
        La règle en tête montre une année d&apos;un bloc : la hauteur
        d&apos;une barre dit le volume du mois, sa couleur l&apos;état le plus
        urgent, et cliquer un mois ouvre son détail. Les occurrences « à
        planifier » n&apos;y figurent pas tant qu&apos;aucune date n&apos;est
        convenue — elles sont comptées à part.
      </p>
      <p className="m-0">
        Les flèches changent d&apos;année, et les cartes du dessous suivent :
        chaque année se lit entière, mois vides compris. Sur l&apos;année en
        cours, la liste s&apos;ouvre sur le mois d&apos;aujourd&apos;hui et
        les mois déjà passés restent repliés — leur pli affiche toujours son
        nombre de retards.
      </p>
      {/* L'écart entre ce bandeau et le badge de la barre latérale était
          expliqué ici faute d'être corrigé. Les deux nombres sortent
          désormais du même calcul (`repartirRetards`, ADR-015) : il n'y a
          plus rien à arbitrer.

          Restait un écart d'énumération : la phrase disait « toutes les
          familles » puis en nommait trois sur cinq. Elle se dérive maintenant
          du type fermé, comme celle du chapeau.

          L'ÉNUMÉRATION EST PARTIE D'ICI le 2026-09-04, et rien d'autre. Le
          chapeau, à trois cents pixels au-dessus et sur le même écran, nomme
          déjà les cinq familles — les nommer deux fois n'en apprenait pas une
          sixième. La moitié droite reste : « comme le badge Calendrier » est le
          seul rapprochement que le chapeau ne fait pas, et c'est celui qui
          désamorce l'écart apparent entre deux nombres visibles ensemble.

          Aucune famille n'est écrite en dur : la phrase n'en nomme plus
          aucune, donc elle ne peut plus en oublier une. */}
      <p className="m-0">
        Les compteurs du bandeau réunissent toutes les familles
        d&apos;échéances, comme le badge « Calendrier » de la barre latérale.
      </p>
      {/* LA SECONDE PHRASE DE CE PARAGRAPHE EST PARTIE le 2026-09-04. Elle
          disait, quasi mot pour mot, ce que dit le chapeau : « Les chiffres de
          la page Équipements et les pastilles des zones ne comptent que ce que
          portent vos équipements — ce qui est dû au titre de l'établissement
          lui-même ou de vos salariés ne s'y trouve pas, et se lit ici. » Deux
          énoncés du même fait sur un même écran, dont l'un derrière un « ? »
          qu'il faut ouvrir.

          Ce qui reste est ce que le chapeau ne dit pas et ne peut pas dire :
          la portée ANNUELLE du compte de la règle, qui n'existe que sur cette
          page. */}
      <p className="m-0">
        Le compte en tête de la règle porte sur l&apos;<strong>année
        affichée</strong>{" "}
        ; les occurrences « à planifier », qui n&apos;ont pas de date, sont
        comptées quelle que soit l&apos;année.
      </p>
      <div className="flex flex-wrap gap-2 pt-1">
        <LegalBadge
          charte="board"
          reference="Art. R. 4323-23 s. CT"
          href="https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018531479"
          extrait="Des arrêtés […] déterminent les équipements de travail ou les catégories d'équipement de travail pour lesquels l'employeur procède ou fait procéder à des vérifications générales périodiques afin que soit décelée en temps utile toute détérioration susceptible de créer des dangers."
        />
        <LegalBadge
          charte="board"
          reference="Arrêté du 25 juin 1980 (ERP)"
          href="https://www.legifrance.gouv.fr/loda/id/LEGITEXT000020303557/"
        >
          <p>
            Règlement de sécurité contre les risques d&apos;incendie et de
            panique dans les ERP — fonde les périodicités des vérifications ERP
            (électricité, moyens de secours, désenfumage…).
          </p>
        </LegalBadge>
      </div>
    </AideEcran>
  );

  // Les commandes de l'écran — bascule de lecture, filtres, aide. Elles ne
  // forment plus une strate à elles : elles voyagent dans la barre de
  // réglage de l'instrument (`AnneeCalendrier`), à droite du cadran
  // d'année, et restent donc collées en tête du défilement.
  //
  // C'est ce que la page devait à l'usage : descendre jusqu'à une date
  // puis vouloir filtrer obligeait à remonter chercher une rangée de
  // boutons restée en haut. Une commande qu'on n'atteint qu'en défaisant
  // son défilement n'est pas atteignable.
  //
  // L'ordre de gauche à droite porte la règle qui les lie : quelle année,
  // puis quelle lecture, puis quel filtre. L'aide part à l'opposé — elle
  // ne règle rien.
  const commandes = (
    <div className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-2.5">
      {/* Deux onglets sur du vide seraient un décor : la bascule
          n'apparaît que si le calendrier a des lignes à lire. */}
      {lignes.length > 0 ? (
        <>
          <SelecteurLecture />
          <span
            aria-hidden
            className="mx-1 h-[18px] w-px flex-none bg-[color:rgba(13,18,36,.14)]"
          />
        </>
      ) : null}
      <FiltresCalendrier
        baseHref={baseHref}
        famillesDisponibles={famillesPresentes}
        domaines={domainesPresents(verifsDuLieu).map((d) => ({
          id: d,
          label: LABEL_DOMAINE[d],
        }))}
        batiments={batiments}
        filtres={{
          famille: filtreFamille,
          domaine: filtreDomaine,
          urgent: filtreUrgent,
          batiment: filtreBatiment,
        }}
      />
      <span className="ml-auto flex-none">{aide}</span>
    </div>
  );

  return (
    <>
      {/* L'identité, puis l'instrument — et l'instrument porte ses propres
          commandes dans une barre qui suit le défilement. Deux strates au
          lieu de quatre : la page ne fait plus attendre trois bandes
          claires avant sa première donnée. */}
      {bandeTitre}

      <div className="flex flex-1 flex-col bg-[color:var(--board-card)] px-[var(--board-gutter)] pb-14 pt-7">
        {/* PAS DE BANDEAU DE COUVERTURE ICI, et c'est une décision de la
            propriétaire (2026-09-02). Il y a vécu tant qu'il portait l'axe
            « public reçu » — le calendrier étant l'écran qu'on suit pour
            savoir quoi faire, y taire une obligation écartée aurait été
            grave. Cet axe est parti avec sa cause : la ligne est désormais
            servie « à confirmer » au lieu d'être retirée, donc elle est là,
            sous les yeux, et un bandeau qui annoncerait son absence
            au-dessus d'elle dirait le contraire de ce que la page montre.
            Ce que l'outil ne couvre pas se lit sur « Ce que Rojer ne couvre
            pas » et en tête du registre de sécurité. */}
        {lignes.length === 0 ? (
          <div>
            {/* Sans instrument, les commandes n'ont pas de barre où
                voyager : elles se posent en tête de l'état vide — d'où
                l'on retire les filtres qui masquent tout. */}
            <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-2.5">
              {commandes}
            </div>
            {calendrierVide && echeancesDuLieu.length === 0 ? (
              // Calendrier vraiment vide : on explique d'où viendraient les
              // échéances, et on donne la porte de sortie — même motif que
              // l'état vide de la frise du board.
              <section className="mt-6 rounded-[30px] bg-[color:var(--board-card)] px-8 py-10 shadow-[0_1px_2px_rgba(13,18,36,.04),0_12px_32px_-14px_rgba(13,18,36,.10)] ring-1 ring-[color:rgba(13,18,36,.06)]">
                <div className="flex max-w-[560px] flex-col items-start gap-3">
                  <h2 className="m-0 text-[22px] font-semibold leading-[1.15] tracking-[-0.03em] text-[color:var(--board-ink)]">
                    Votre calendrier se remplit tout seul
                  </h2>
                  <p className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                    Le Code du travail et le règlement ERP imposent de vérifier
                    certains équipements à fréquence fixe — extincteurs tous les
                    ans, installation électrique tous les ans, etc. L&apos;outil
                    calcule ces échéances à partir des équipements que vous avez
                    déclarés :{" "}
                    {equipements.length > 0 &&
                    horsReferentiel === equipements.length
                      ? equipements.length === 1
                        ? "le seul que vous ayez déclaré n'en produit."
                        : `aucun des ${equipements.length} déclarés n'en produit.`
                      : "il n'y en a pas encore."}
                  </p>
                  {/* Un parc déclaré et un calendrier vide, ce n'est pas la
                      même situation qu'un parc vide : envoyer « déclarez vos
                      équipements » à quelqu'un qui vient de le faire lui
                      ferait chercher une erreur de saisie qui n'existe pas.
                      On dit alors ce que le référentiel sait — et ce qu'il
                      ne sait pas. */}
                  {horsReferentiel > 0 && (
                    <p className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                      {horsReferentiel} équipement
                      {horsReferentiel > 1 ? "s déclarés sont" : " déclaré est"}{" "}
                      hors référentiel : leur catégorie, ou la typologie de cet
                      établissement, ne déclenche aucune obligation du
                      référentiel. Cela ne veut pas dire qu&apos;aucune
                      vérification ne leur est due — le parc le signale sur
                      chaque appareil concerné.
                    </p>
                  )}
                  <Link
                    href={`/etablissements/${id}/equipements`}
                    className="mt-1 inline-flex items-center gap-2 rounded-full bg-[color:var(--board-ink)] px-4 py-2.5 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-85"
                  >
                    {equipements.length === 0
                      ? "Déclarer mes équipements"
                      : "Voir mes équipements"}
                    <ArrowUpRight className="size-3.5" />
                  </Link>
                </div>
              </section>
            ) : (
              // Des vérifications existent, mais les filtres les masquent
              // toutes : on le dit, et la pilule ramène à la vue complète.
              <section className="mt-6 flex flex-col items-start gap-3 rounded-[22px] bg-[color:var(--board-slate-pale)] px-6 py-7">
                <p className="m-0 text-[15px] font-semibold tracking-[-0.015em] text-[color:var(--board-ink)]">
                  Rien ne correspond à ces filtres
                </p>
                <p className="m-0 max-w-[560px] text-[13.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
                  Vos échéances existent, mais aucune ne relève de la famille,
                  du domaine ou de l&apos;urgence sélectionnés.
                </p>
                <Link
                  href={baseHref}
                  className="mt-1 inline-flex items-center gap-2 rounded-full bg-[color:var(--board-ink)] px-4 py-2.5 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-85"
                >
                  Retirer les filtres
                  <ArrowUpRight className="size-3.5" />
                </Link>
              </section>
            )}
          </div>
        ) : (
          <div>
            <AnneeCalendrier
              annee={anneeCourante}
              anneesRegle={anneesRegle}
              /* « Sans date » ne concerne que les contrôles : sous un
                 filtre de famille qui les écarte, le compteur mentirait. */
              sansDate={
                !filtreFamille || filtreFamille === "controle"
                  ? etat.aPlanifier
                  : 0
              }
              /* Seulement sur la lecture d'ensemble : sous un filtre, la
                 remarque porterait sur un périmètre qu'elle ne décrit
                 pas. */
              moisInitial={moisInitial}
              cleMoisCourant={cleMoisCourant}
              commandes={commandes}
              parEquipement={
                <VueParEquipement
                  annee={anneeCourante}
                  moisCourant={composantesCiviles(aujourdhui).mois}
                  groupes={groupesEquipement}
                  sansEcheance={sansEcheance}
                  horsReferentiel={horsReferentiel}
                />
              }
              sections={moisTries.map(([cleMois, liste]) => ({
                cle: cleMois,
                titre: libelleMois(cleMois),
                nb: liste.length,
                // L'en-tête du mois porte le rouge même replié : replier
                // ne doit jamais cacher un retard.
                nbEnRetard: liste.filter((l) =>
                  l.genre === "verif"
                    ? l.registre === "enRetard"
                    : l.e.tone === "alerte",
                ).length,
                // Ce que la règle ne place pas : la carte le dit, sans
                // quoi son total et celui de l'instrument se contredisent.
                nbAPlanifier: liste.filter(
                  (l) => l.genre === "verif" && l.registre === "aPlanifier",
                ).length,
                contenu: (
                  // La clé n'est pas décorative : le contenu du mois est
                  // créé côté serveur puis traverse la frontière client
                  // dans une propriété. React le reçoit alors comme un
                  // enfant de liste et réclame sa clé, faute de quoi la
                  // console du calendrier reste rouge en développement.
                  <ul
                    key={cleMois}
                    className="m-0 mt-3 flex list-none flex-col p-0"
                  >
                    {liste.map((ligne, i) => {
                      const sep =
                        i === 0
                          ? ""
                          : "border-t border-[color:rgba(10,10,10,.07)]";
                      // La tuile-date et la structure de ligne sont
                      // communes ; la famille s'annonce par le marqueur et
                      // la méta, l'état par la pastille de droite.
                      if (ligne.genre === "verif") {
                        const v = ligne.v;
                        const o = obligationParId(v.obligationId);
                        return (
                          // Deux lectures d'une même ligne (fait +
                          // prochain rendez-vous) peuvent tomber dans le
                          // même mois : la clé porte la lecture.
                          <li key={`${v.id}:${ligne.lecture}`} className={sep}>
                            <LigneEcheance
                              href={`/etablissements/${id}/verifications/${v.id}`}
                              /* Une occurrence jamais planifiée ne porte
                                 pas de date : la sienne est celle de la
                                 génération du calendrier. */
                              date={
                                v.statut === "a_planifier" ? null : ligne.date
                              }
                              type={typeDeVerification(v)}
                              titre={v.libelleObligation}
                              meta={
                                // Sans équipement, l'échéance porte sur
                                // l'établissement (ADR-022) : elle se nomme
                                // par ce qu'elle est, pas par un appareil
                                // absent — et elle reste ici, sous tous les
                                // filtres de bâtiment (ADR-010).
                                (v.equipement && lieuDe(v.equipement.batiment)
                                  ? `${v.equipement.batiment.nom} · `
                                  : "") +
                                `${libellePorteur(v)} · ` +
                                LABEL_PERIODICITE[v.periodicite] +
                                (o ? ` · ${LABEL_DOMAINE[o.domaine]}` : "")
                              }
                              contractuelle={estEcheanceContractuelle(v)}
                              pastille={
                                // Le rendez-vous suivant d'un cycle soldé
                                // n'hérite pas du badge « Conforme » : sa
                                // pastille dit ce qu'il est — planifié.
                                <BadgeStatut
                                  statut={
                                    ligne.lecture === "prochaine"
                                      ? "planifiee"
                                      : v.statut
                                  }
                                />
                              }
                              registre={ligne.registre}
                            />
                          </li>
                        );
                      }
                      const e = ligne.e;
                      return (
                        <li key={e.id} className={sep}>
                          <LigneEcheance
                            href={e.href}
                            date={e.date}
                            type={e.type}
                            titre={e.libelle}
                            meta={metaAutre(e)}
                            // La tuile-date suffit pour le futur : seule
                            // l'alerte mérite une pastille.
                            registre={etatDeLaLigne(ligne)}
                            pastille={
                              e.tone === "alerte" ? (
                                <span className="inline-flex items-center whitespace-nowrap rounded-full bg-[color:var(--board-signal)] px-[13px] py-[6px] text-[12px] font-semibold text-[color:var(--board-signal-ink)]">
                                  En retard
                                </span>
                              ) : null
                            }
                          />
                        </li>
                      );
                    })}
                  </ul>
                ),
              }))}
            />
          </div>
        )}
      </div>
    </>
  );
}
