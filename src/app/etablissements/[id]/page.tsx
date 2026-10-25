import { notFound } from "next/navigation";
import { mentionRythmeDeVerification } from "@/lib/referentiels/conformite/mention-de-ligne";
import {
  OnboardingChecklist,
  type EtapeOnboarding,
} from "@/components/layout/OnboardingChecklist";
import { QuestionParametrage } from "@/components/layout/QuestionParametrage";
import { questionRepondue } from "@/lib/etablissements/questions";
import { repondreDemandesAssureur } from "@/lib/etablissements/parametrage";
import { enumerer, precisionsManquantes } from "@/lib/etablissements/guide-par-module";
import { DashboardGrid } from "@/components/dashboard/widgets/DashboardGrid";
import { BlocBrief } from "@/components/dashboard/widgets/impl/board";
import type { DashboardBundle } from "@/components/dashboard/widgets/types";
import { getEtablissement } from "@/lib/etablissements/queries";
import { listerEquipementsDeLEtablissement } from "@/lib/equipements/queries";
import { appareilsMuets } from "@/lib/equipements/reponses-exigees";
import { listerBatimentsDeLEtablissement } from "@/lib/batiments/queries";
import { estMultiBatiments, resoudreFiltreBatiment } from "@/lib/batiments/filtre";
import { SelecteurBatiment } from "@/components/batiments/SelecteurBatiment";
import {
  compterObligationsParMois,
  compterVerifsParEquipement,
  getDashboardData,
  getModulesMatrice,
  listerEvenementsFenetre,
  marquesAConfirmerDuRendu,
} from "@/lib/dashboard/queries";
import { listerEvenementsCalendrier } from "@/lib/calendrier/evenements";
import { compterEtatEcheances } from "@/lib/calendrier/retards";
import { assurerCalendrierAJour } from "@/lib/calendrier/regeneration-sure";
import { statsActionsEnRetard } from "@/lib/actions/queries";
import {
  compterRapportsDuDossier,
  listerRapportsRecents,
} from "@/lib/rapports/queries";
import {
  compterVerificationsDuDossier,
  listerEcheancesAnnoncables,
} from "@/lib/calendrier/queries";
import { composantesCiviles, joursCivilsEntre } from "@/lib/dates";
import { instantDuRendu } from "@/lib/dates/instant-du-rendu";
import { libellePorteur } from "@/lib/calendrier/labels";
import { echeancesDuTableauDeBord } from "@/lib/calendrier/prochaine-echeance";
import { illustrationBatiment } from "@/lib/etablissements/illustration";
import { compterEquipe } from "@/lib/salaries/queries";
import { pluriel } from "@/lib/rendu/pluriel";

export default async function EtablissementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ batiment?: string }>;
}) {
  const { id } = await params;
  const { batiment } = await searchParams;

  // Le tableau de bord est la porte d'entrée — la connexion et « Reprendre mon
  // dossier » y mènent. Il lisait ce qui était en base, sans jamais le
  // réparer : un dossier jamais généré (bureau sans équipement, créé avant la
  // génération à la création), un calendrier périmé par un échec ou par un
  // changement de référentiel s'y affichaient faux tant que personne n'ouvrait
  // la page Calendrier. Même réparation qu'elle, AVANT la première lecture —
  // ~~la charge par bâtiment, juste en dessous, lit déjà les lignes~~
  // [2026-10-25 : la charge par zone est retirée avec la plaque du hero].
  // [2026-10-13] Avant TOUT autre `await`, y compris `getEtablissement` : la
  // garde de `fraicheur-sorties.test.ts` l'exige, parce qu'elle ne sait pas
  // dire quelle lecture touche aux lignes. Sans risque de tenancy : la
  // réparation lit le repère sous `requireUser` et filtre sur le propriétaire
  // (`calendrierDesynchronise`) — un identifiant étranger ne régénère rien et
  // tombe au `notFound` juste après.
  await assurerCalendrierAJour(id);
  const etab = await getEtablissement(id);
  if (!etab) notFound();

  // Date de référence unique, figée côté serveur : tous les blocs qui
  // calculent un « dans N jours » partent de la même valeur, ce qui évite les
  // écarts d'hydratation et rend les rendus reproductibles (ADR-011). Elle est
  // prise ici, avant la première lecture qui en dépend.
  // [2026-10-14, audit Next.js H2] L'instant DU RENDU, que la barre latérale
  // lit aussi : les lectures indépendantes des lignes (registre des autres
  // échéances, compteurs d'actions) ne partent qu'une fois pour les deux.
  const aujourdhui = instantDuRendu();

  // Filtre bâtiment (ADR-019). Il porte sur ce qui a un lieu — échéances
  // d'équipements, parc, opérations — et laisse passer ce qui concerne tout
  // l'établissement. L'état global (score, DUERP, prestataires, matrice des
  // documents) n'est jamais filtré : un score « du bâtiment B » n'aurait pas
  // de sens réglementaire, les obligations sont celles de l'établissement.
  // C'est ce que dit la légende du sélecteur, plus bas.
  // Les zones et leur parc, sans leurs échéances : ni le filtre ni la fiche du
  // hero ne lisent de charge [2026-10-25 : `listerBatimentsAvecCharge`, qui
  // lisait toutes les lignes de l'établissement pour une pastille par zone,
  // est retirée avec cette pastille].
  const batiments = await listerBatimentsDeLEtablissement(id);
  const multiBatiments = estMultiBatiments(batiments);
  // La résolution passe par `resoudreFiltreBatiment` — les mêmes deux règles
  // que le parc et le calendrier, écrites une fois et testées là-bas.
  const batimentFiltre = resoudreFiltreBatiment(batiments, batiment);

  const [
    equipements,
    statsEquipements,
    dashboard,
    echeances,
    barres,
    evenementsHorizon,
    evenementsSemaine,
    evenementsMois,
    statsRetardActions,
    modulesMatrice,
    nbVerifs,
    nbRapports,
    prochainesVerifs,
    rapportsRecents,
    marquesDuDossier,
    nbEquipe,
  ] = await Promise.all([
    listerEquipementsDeLEtablissement(id),
    compterVerifsParEquipement(id),
    getDashboardData(id),
    // Le dépassé et l'horizon proche, ventilés par famille : la seule
    // source des nombres de retard du board (cf. `DashboardBundle`).
    compterEtatEcheances(id, aujourdhui, { batimentId: batimentFiltre }),
    compterObligationsParMois(id),
    // La frise défile jusqu'à 24 mois et propose une vue calendrier sur
    // la même donnée — une seule collecte pour les deux vues, qui coupent
    // côté client. Toutes familles confondues, comme la page Calendrier :
    // un permis de feu ou une attestation en retard doit se voir ici.
    listerEvenementsCalendrier(id, { batimentId: batimentFiltre }, aujourdhui),
    listerEvenementsFenetre(id, 7, { batimentId: batimentFiltre }),
    listerEvenementsFenetre(id, 30, { batimentId: batimentFiltre }),
    // Le widget mène au plan d'actions : les mesures du DUERP seules.
    statsActionsEnRetard(id, new Date(), { origine: "duerp" }),
    getModulesMatrice(id, etab.estERP),
    compterVerificationsDuDossier(id),
    compterRapportsDuDossier(id),
    // Toutes : les cinq prochaines se choisissent après projection
    // (`cinqProchaines`, plus bas).
    listerEcheancesAnnoncables(id, batimentFiltre),
    listerRapportsRecents(id, 4),
    // Les marques « à confirmer » : pour les échéances du board comme pour le
    // guide plus bas, par module — un seul calcul, partagé avec les fenêtres
    // d'événements ci-dessus par `cache()`.
    marquesAConfirmerDuRendu(id),
    // Le nombre de fiches de l'équipe, pour la fiche du hero.
    compterEquipe(id),
  ]);

  // Le filtre bâtiment se pose ici, une fois, sur la liste chargée entière —
  // les deux périmètres viennent donc de la même lecture.
  const equipementsDuLieu = batimentFiltre
    ? equipements.filter((e) => e.batimentId === batimentFiltre)
    : equipements;
  // Le hero parle de l'établissement — sa plaque liste tous les bâtiments —,
  // le reste de l'écran suit le filtre. Sans filtre, les deux états sont le
  // même objet : pas de seconde lecture.
  const echeancesEtablissement = batimentFiltre
    ? await compterEtatEcheances(id, aujourdhui)
    : echeances;

  const enLite = (e: (typeof equipements)[number]) => ({
    id: e.id,
    libelle: e.libelle,
    categorie: e.categorie,
    stats: statsEquipements.get(e.id),
  });

  // Fait observable fiable : le secteur a été choisi par l'utilisateur.
  // L'existence seule d'un Duerp ne prouve rien (créations silencieuses
  // historiques par les pages relais). Un seul DUERP par établissement
  // (`Duerp.etablissementId` est unique) : ~~la recherche « de celui qui porte
  // un secteur » ajoutée le 2026-10-22~~ visait un cas impossible, retirée.
  const duerpDernier = etab.duerps[0] ?? null;
  const duerpOuvert = duerpDernier?.referentielSecteurId != null;

  // Checklist onboarding : uniquement les étapes actionnables par l'user.
  //
  // Une étape par MODULE, jamais une question par ligne (décision de la
  // propriétaire du 2026-10-22). Les questions dont le silence retient une
  // ligne « à confirmer » se répondent dans leur module — la fiche, le DUERP,
  // la fiche de l'appareil (`guide-par-module.ts`) — et l'étape du module
  // reste ouverte tant qu'il en manque une.
  const questionsMuettes = marquesDuDossier.questions;
  const regimeFiche = {
    estERP: etab.estERP,
    typeErp: etab.typeErp,
    typesErpAutres: etab.typesErpAutres,
    categorieErp: etab.categorieErp,
  };
  const manqueFiche = precisionsManquantes("fiche", questionsMuettes, regimeFiche);
  const manqueDuerp = precisionsManquantes("duerp", questionsMuettes, regimeFiche);
  // Les appareils NOMMÉS : la liste des équipements ne marque pas ceux à qui
  // une réponse manque, l'étape doit donc dire lesquels (revue du 2026-10-22).
  const appareilsAPreciser = [
    ...new Map(
      appareilsMuets(equipements, etab).map((a) => [a.equipementId, a.libelle]),
    ),
  ];

  const etapesOnboarding: EtapeOnboarding[] = [
    {
      id: "etablissement",
      titre:
        manqueFiche.length === 0
          ? "Décrire votre établissement"
          : "Compléter la fiche de votre établissement",
      pourquoi:
        manqueFiche.length === 0
          ? "Adresse, effectif sur site et régimes (ERP, IGH, travail). Ces informations conditionnent les obligations qui vous sont applicables."
          : `Il manque : ${enumerer(manqueFiche)}. Ces réponses décident de certaines obligations ; d'ici là, elles s'affichent « à confirmer ».`,
      faite: manqueFiche.length === 0,
      href: `/etablissements/${id}/modifier`,
      cta: manqueFiche.length > 0 ? "Compléter la fiche" : undefined,
    },
    {
      id: "equipements",
      titre:
        equipements.length > 0 && appareilsAPreciser.length > 0
          ? "Compléter vos équipements"
          : "Déclarer vos équipements",
      pourquoi:
        equipements.length > 0 && appareilsAPreciser.length > 0
          ? `Une réponse manque sur ${enumerer(appareilsAPreciser.map(([, libelle]) => `« ${libelle} »`))}. Elle décide de certaines de leurs vérifications.`
          : "Installation électrique, extincteurs, hotte, ascenseur… Ce sont eux qui déclenchent les vérifications périodiques à faire.",
      faite: equipements.length > 0 && appareilsAPreciser.length === 0,
      // Un seul appareil à préciser : on y va directement.
      href:
        appareilsAPreciser.length === 1
          ? `/etablissements/${id}/equipements/${appareilsAPreciser[0][0]}/modifier`
          : `/etablissements/${id}/equipements`,
      cta:
        equipements.length === 0
          ? "Commencer la déclaration"
          : appareilsAPreciser.length > 0
            ? "Compléter les équipements"
            : undefined,
    },
    {
      id: "calendrier",
      titre: "Consulter votre calendrier de vérifications",
      // « Dès que vos équipements sont déclarés » : le calendrier naît avec
      // l'établissement depuis le 2026-09-14, et la fiche et les salariés en
      // font naître aussi. L'étape se coche dès qu'il porte une ligne.
      pourquoi:
        "L'outil calcule tout seul les dates des vérifications dues par votre établissement, ses équipements et ses salariés.",
      faite: nbVerifs > 0,
      href: `/etablissements/${id}/calendrier`,
      cta: nbVerifs === 0 ? "Ouvrir le calendrier" : undefined,
    },
    duerpOuvert && duerpDernier && manqueDuerp.length > 0
      ? {
          id: "duerp",
          titre: "Compléter votre DUERP",
          pourquoi: `Il reste ${pluriel(manqueDuerp.length, "question")} sur le travail de vos salariés : ${enumerer(manqueDuerp)}. Elles décident de formations et de consignes dues ; d'ici là, elles s'affichent « à confirmer ».`,
          faite: false,
          href: `/duerp/${duerpDernier.id}/transverses`,
          cta: "Compléter le DUERP",
        }
      : {
          id: "duerp",
          titre: "Ouvrir votre DUERP",
          // Les faits muets se disent aussi avant l'ouverture : le DUERP les
          // posera, et d'ici là ils retiennent des lignes (revue du 2026-10-22).
          pourquoi: `L'article R. 4121-1 du Code du travail : « L'employeur transcrit et met à jour dans un document unique les résultats de l'évaluation des risques pour la santé et la sécurité des travailleurs ». L'article ne fixe pas de seuil d'effectif. L'outil vous guide : secteur d'activité, puis unités de travail.${
            !duerpOuvert && manqueDuerp.length > 0
              ? ` Il vous demandera aussi ${enumerer(manqueDuerp)} : d'ici là, les formations et consignes qui en dépendent s'affichent « à confirmer ».`
              : ""
          }`,
          faite: duerpOuvert,
          href: `/etablissements/${id}/duerp`,
          cta: !duerpOuvert ? "Ouvrir le DUERP" : undefined,
        },
    // La demande d'assureur reste une question posée ici (ADR-025 § 7,
    // ADR-032) : aucun autre écran ne la pose, et sa réponse « non » n'a
    // nulle part ailleurs où se donner.
    //
    // `faite` observe **une réponse donnée**, jamais une valeur : `null` veut
    // dire « pas encore répondu » (migration 20260901170000), et un `=== true`
    // aurait rouvert la question indéfiniment à qui a répondu « non ».
    {
      id: "assureur",
      titre: "Dire si votre assureur impose des vérifications",
      pourquoi:
        "Un contrat d'assurance peut imposer des contrôles que le droit n'impose pas — extincteurs plus fréquents, thermographie, hotte. Déclarées ici, elles entrent au calendrier en portant la mention qui les distingue du droit.",
      faite: questionRepondue(etab.aDemandesAssureur),
      question: (
        <QuestionParametrage
          action={repondreDemandesAssureur.bind(null, id)}
          labelOui="Oui, mon assureur en impose"
          labelNon="Non, pas à ma connaissance"
          suite={{
            // Pré-réglé sur la nouvelle source : le dirigeant qui répond
            // « oui » a la lettre de son assureur en main, pas une hésitation
            // sur la nature de l'acte.
            href: `/etablissements/${id}/prescriptions?source=demande_assureur`,
            libelle: "Déclarer ce que votre assureur impose",
          }}
        />
      ),
    },
  ];
  const onboardingFini = etapesOnboarding.every((e) => e.faite);

  // Ancienneté du dernier rapport, en **jours civils** (Europe/Paris) :
  // une division par 86 400 000 comptait des tranches de 24 h, et un
  // rapport déposé la veille au soir n'était « d'hier » qu'à partir de la
  // même heure le lendemain (cf. ADR-011).
  const jourDernierRapport = rapportsRecents[0]
    ? Math.max(0, joursCivilsEntre(rapportsRecents[0].dateRapport, aujourdhui))
    : null;

  // Le bundle sérialise les champs nécessaires aux widgets. Date
  // objects traversent la frontière server/client via l'App Router.
  const bundle: DashboardBundle = {
    etablissementId: id,
    batiments,
    batimentFiltre: batiments.find((b) => b.id === batimentFiltre) ?? null,
    // [2026-10-25] `perimetreHero` est retiré : ses deux phrases (« Dépassées
    // et Sous 30 j réunissent toutes les familles… », légende de la plaque des
    // zones) ne s'affichent plus — décision de la propriétaire, la première
    // redisait ce que l'agrégat porte déjà ; la seconde légendait une plaque
    // qui n'existe plus.
    illustrationHero: illustrationBatiment(etab),
    nbEquipe,
    etablissement: {
      id: etab.id,
      raisonDisplay: etab.raisonDisplay,
      entrepriseId: etab.entrepriseId,
      adresse: etab.adresse,
      effectifSurSite: etab.effectifSurSite,
      codeNaf: etab.codeNaf,
      estEtablissementTravail: etab.estEtablissementTravail,
      estERP: etab.estERP,
      estIGH: etab.estIGH,
      estHabitation: etab.estHabitation,
      typeErp: etab.typeErp,
      typesErpAutres: etab.typesErpAutres,
      categorieErp: etab.categorieErp,
      classeIgh: etab.classeIgh,
      entreprise: {
        raisonSociale: etab.entreprise.raisonSociale,
        siret: etab.entreprise.siret,
        codeNaf: etab.entreprise.codeNaf,
        effectif: etab.entreprise.effectif,
      },
    },
    dashboard,
    echeances,
    echeancesEtablissement,
    equipements: equipementsDuLieu.map(enLite),
    // Le parc entier : le score porte sur l'établissement, sa légende le dit.
    equipementsEtablissement: equipements.map(enLite),
    barsData: barres.mois,
    barsSansEcheance: barres.sansEcheance,
    barsRetardsAnterieurs: barres.retardsAnterieurs,
    aujourdhui,
    evenementsHorizon,
    evenementsSemaine,
    evenementsMois,
    statsRetardActions,
    modulesMatrice,
    // Les cinq plus proches SUR L'ÉCHÉANCE OUVERTE, projetée ci-dessous — et la
    // prochaine échéance connue, choisie sur la MÊME liste AVANT la coupe à
    // cinq : choisie après, cinq « à planifier » plus anciennes suffisaient à
    // cacher une vraie échéance (`echeancesDuTableauDeBord`).
    ...echeancesDuTableauDeBord(prochainesVerifs.map((v) => ({
      id: v.id,
      // C64 : la visite de la commission se reconnaît par lui, « pour information ».
      obligationId: v.obligationId,
      libelleObligation: v.libelleObligation,
      // L'échéance OUVERTE : les widgets trient, comptent à rebours et
      // classent sur cette date.
      datePrevue: v.datePrevue,
      statut: v.statut,
      // Le rythme : les widgets classent sur `estVerificationRealisee`, qui en
      // a besoin — sans lui, un statut réalisé d'avant l'ADR-034 sur une
      // obligation périodique passait pour « rien à faire ».
      periodicite: v.periodicite,
      // Le `where` ci-dessus n'en ramène aucune d'archivée ; la projection le
      // transporte quand même, pour que les widgets classent sur le fait et
      // non sur la confiance qu'ils font à une clause située trois cents
      // lignes plus haut (ADR-034).
      archiveLe: v.archiveLe,
      graceJusquAu: v.graceJusquAu,
      // La source de la prescription traverse jusqu'au board, sans quoi le
      // marquage contractuel n'y paraît jamais (ADR-032). La requête la
      // chargeait déjà et le type l'acceptait : c'est cette projection, entre
      // les deux, qui la jetait — trois couches justes séparément, et une
      // pastille qui n'apparaît nulle part.
      prescription: v.prescription,
      prescriptionId: v.prescriptionId,
      equipement: {
        libelle: libellePorteur(v),
      },
      aConfirmer: marquesDuDossier.parObligation.get(v.obligationId)?.phrases ?? [],
      // ADR-039 § 5 : le rythme retenu se dit sur le board comme ailleurs. Lu
      // au référentiel par `obligationId`, déjà chargé — aucune requête.
      rythmeRetenu: mentionRythmeDeVerification(v),
    })), aujourdhui),
    rapportsRecents: rapportsRecents.map((r) => ({
      id: r.id,
      verificationId: r.verificationId,
      dateRapport: r.dateRapport,
      resultat: r.resultat,
      verification: { libelleObligation: r.verification.libelleObligation },
    })),
    nbVerifs,
    nbRapports,
    duerpDernier: duerpDernier
      ? {
          id: duerpDernier.id,
          versions: duerpDernier.versions.map((v) => ({
            numero: v.numero,
            createdAt: v.createdAt,
          })),
        }
      : null,
    jourDernierRapport,
    // Mois courant lu en heure de Paris, pas dans le fuseau du
    // serveur : `getMonth()` sur un instant de fin de mois à 23 h
    // renvoyait le mois suivant sur un hôte à l'est de Paris.
    moisCourant: composantesCiviles(aujourdhui).mois - 1,
  };

  /* Le filtre par zone (ADR-019, ADR-029), posé sur la rangée de
     « Personnaliser », sous le guide de mise en place, juste au-dessus des
     widgets qu'il filtre (2026-10-25, demande de la propriétaire). Jamais sur
     le dessin du hero : un dessin qui filtre au clic n'annonce pas comment en
     sortir, et le sélecteur, lui, porte son « Tout l'établissement ». */
  const filtreZones = multiBatiments ? (
          <SelecteurBatiment
            // Sans lui, le sélecteur rend en papier — son défaut — au milieu
            // du board. L'oubli est silencieux :
            // ni erreur ni avertissement, juste un rayon de 6 px et un gris
            // d'une autre famille.
            ton="board"
            baseHref={`/etablissements/${id}`}
            batiments={batiments}
            actif={batimentFiltre}
            // La seule phrase du tableau de bord qui dise ce que le filtre
            // laisse hors de sa portée — et c'est ici qu'elle doit être, sous
            // la commande qui pose la question.
            //
            // [2026-10-25] Les relevés « Dépassées » et « Sous 30 j » ont quitté
            // le hero : la phrase qui les nommait est retirée avec eux.

            legende={
              batimentFiltre
                ? "Les échéances, équipements et opérations affichés sont ceux de cette zone, plus ce qui concerne tout l'établissement. L'indice d'avancement et l'état des documents portent toujours sur l'établissement entier."
                : undefined
            }
          />
      ) : null;

  return (
    <>
      {/* Le brief : le hero du tableau de bord, sur le fond pointillé — la
          date, la fiche de l'établissement et son bâtiment. */}
      <BlocBrief bundle={bundle} />


      {/* Le fond du board — `flex-1` pour qu'il descende jusqu'au bas du
          conteneur de défilement, même quand les widgets sont courts.
          [2026-10-25] Blanc, et non plus le canvas quasi blanc (choix de la
          propriétaire) : sous le hero bleu pâle, le gris faisait une troisième
          surface. Les cartes s'en détachent par leur filet (`CarteBoard`) et
          leur ombre douce. */}
      <div className="flex flex-1 flex-col bg-[color:var(--board-card)] pb-10">
        <DashboardGrid
          bundle={bundle}
          entete={
            onboardingFini ? null : (
              <OnboardingChecklist etapes={etapesOnboarding} />
            )
          }
          filtre={filtreZones}
        />

        <footer className="flex flex-wrap items-center justify-between gap-6 px-[calc(var(--board-gutter)+4px)] pt-2 text-[11.5px] text-[color:var(--board-blue-ink)]">
          <p className="m-0 max-w-[640px] leading-[1.55]">
            Outil d&apos;aide à la rédaction structuré sur les publications
            INRS / OiRA. La responsabilité de l&apos;évaluation des risques
            reste celle de l&apos;employeur.
          </p>
          <span className="font-mono uppercase tracking-[0.14em]">
            v2 · modèle données
          </span>
        </footer>
      </div>
    </>
  );
}
