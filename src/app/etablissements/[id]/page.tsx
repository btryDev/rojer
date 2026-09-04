import { notFound } from "next/navigation";
import {
  OnboardingChecklist,
  type EtapeOnboarding,
} from "@/components/layout/OnboardingChecklist";
import { QuestionParametrage } from "@/components/layout/QuestionParametrage";
import { questionRepondue } from "@/lib/etablissements/questions";
import {
  repondreDemandesAssureur,
  repondreEpiPresents,
} from "@/lib/etablissements/parametrage";
import { DashboardGrid } from "@/components/dashboard/widgets/DashboardGrid";
import { BlocBrief } from "@/components/dashboard/widgets/impl/board";
import type { DashboardBundle } from "@/components/dashboard/widgets/types";
import { getEtablissement } from "@/lib/etablissements/queries";
import { listerEquipementsDeLEtablissement } from "@/lib/equipements/queries";
import {
  listerBatimentsAvecCharge,
  porteursDeLaPlaqueZones,
} from "@/lib/batiments/queries";
import { legendePlaqueZones } from "@/lib/perimetre/porteurs-comptes";
import { estMultiBatiments, resoudreFiltreBatiment } from "@/lib/batiments/filtre";
import { SelecteurBatiment } from "@/components/batiments/SelecteurBatiment";
import {
  compterObligationsParMois,
  compterVerifsParEquipement,
  getDashboardData,
  getModulesMatrice,
  listerEvenementsFenetre,
} from "@/lib/dashboard/queries";
import { listerEvenementsCalendrier } from "@/lib/calendrier/evenements";
import { compterEtatEcheances } from "@/lib/calendrier/retards";
import { statsActionsEnRetard } from "@/lib/actions/queries";
import { prisma } from "@/lib/prisma";
import { composantesCiviles, joursCivilsEntre } from "@/lib/dates";
import { enumererFamilles, libellePorteur } from "@/lib/calendrier/labels";
import { libelleEtatCourtCapitale } from "@/lib/calendrier/etats";
import {
  porteeBatiment,
  toutesLesConditions,
} from "@/lib/calendrier/portee";

export default async function EtablissementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ batiment?: string }>;
}) {
  const { id } = await params;
  const { batiment } = await searchParams;
  const etab = await getEtablissement(id);
  if (!etab) notFound();

  // Date de référence unique, figée côté serveur : tous les blocs qui
  // calculent un « dans N jours » partent de la même valeur, ce qui évite les
  // écarts d'hydratation et rend les rendus reproductibles (ADR-011). Elle est
  // prise ici, avant la première lecture qui en dépend — la charge par
  // bâtiment affichée dans le hero se calcule à cette seconde-là.
  const aujourdhui = new Date();

  // Filtre bâtiment (ADR-019). Il porte sur ce qui a un lieu — échéances
  // d'équipements, parc, opérations — et laisse passer ce qui concerne tout
  // l'établissement. L'état global (score, DUERP, prestataires, matrice des
  // documents) n'est jamais filtré : un score « du bâtiment B » n'aurait pas
  // de sens réglementaire, les obligations sont celles de l'établissement.
  // C'est ce que dit la légende du sélecteur, plus bas.
  const batiments = await listerBatimentsAvecCharge(id, aujourdhui);
  const multiBatiments = estMultiBatiments(batiments);
  // La résolution passe par `resoudreFiltreBatiment` — les mêmes deux règles
  // que le parc et le calendrier, écrites une fois et testées là-bas.
  const batimentFiltre = resoudreFiltreBatiment(batiments, batiment);

  const [
    equipements,
    statsEquipements,
    dashboard,
    echeances,
    barsData,
    evenementsHorizon,
    evenementsSemaine,
    evenementsMois,
    statsRetardActions,
    modulesMatrice,
    nbVerifs,
    nbRapports,
    prochainesVerifs,
    rapportsRecents,
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
    statsActionsEnRetard(id),
    getModulesMatrice(id, etab.estERP),
    prisma.verification.count({ where: { etablissementId: id } }),
    prisma.rapportVerification.count({ where: { etablissementId: id } }),
    prisma.verification.findMany({
      where: toutesLesConditions(
        {
          etablissementId: id,
          statut: { in: ["a_planifier", "planifiee", "depassee"] },
        },
        porteeBatiment(batimentFiltre),
      ),
      // `prescription` : la source suffit, et elle seule — c'est de quoi dire
      // qu'une ligne est contractuelle sans faire remonter l'acte (ADR-032).
      include: {
        equipement: true,
        salarie: true,
        prescription: { select: { source: true } },
      },
      orderBy: { datePrevue: "asc" },
      take: 5,
    }),
    prisma.rapportVerification.findMany({
      where: { etablissementId: id },
      include: { verification: true },
      orderBy: { dateRapport: "desc" },
      take: 4,
    }),
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

  const duerpDernier = etab.duerps[0] ?? null;
  // Fait observable fiable : le secteur a été choisi par l'utilisateur.
  // L'existence seule d'un Duerp ne prouve rien (créations silencieuses
  // historiques par les pages relais).
  const duerpOuvert = duerpDernier?.referentielSecteurId != null;

  // Checklist onboarding : uniquement les étapes actionnables par l'user.
  const etapesOnboarding: EtapeOnboarding[] = [
    {
      id: "etablissement",
      titre: "Décrire votre établissement",
      pourquoi:
        "Adresse, effectif sur site et régimes (ERP, IGH, travail). Ces informations conditionnent les obligations qui vous sont applicables.",
      faite: true,
    },
    {
      id: "equipements",
      titre: "Déclarer vos équipements",
      pourquoi:
        "Installation électrique, extincteurs, hotte, ascenseur… Ce sont eux qui déclenchent les vérifications périodiques à faire.",
      faite: equipements.length > 0,
      href: `/etablissements/${id}/equipements`,
      cta: equipements.length === 0 ? "Commencer la déclaration" : undefined,
    },
    {
      id: "calendrier",
      titre: "Consulter votre calendrier de vérifications",
      pourquoi:
        "Dès que vos équipements sont déclarés, l'outil calcule tout seul les dates des prochaines vérifications obligatoires.",
      faite: nbVerifs > 0,
      href: `/etablissements/${id}/calendrier`,
      cta: nbVerifs === 0 ? "Ouvrir le calendrier" : undefined,
    },
    {
      id: "duerp",
      titre: "Ouvrir votre DUERP",
      pourquoi:
        "Le document unique d'évaluation des risques est obligatoire dès le premier salarié (art. R. 4121-1 du Code du travail). L'outil vous guide : secteur d'activité, puis unités de travail.",
      faite: duerpOuvert,
      href: `/etablissements/${id}/duerp`,
      cta: !duerpOuvert ? "Ouvrir le DUERP" : undefined,
    },
    // ── Les deux questions de paramétrage (ADR-025 § 7, ADR-032) ──────
    //
    // Elles se posent ici faute d'écran de réglage : « Paramètres » pointe la
    // page de connexion d'un assistant. La checklist est le seul endroit du
    // produit qui sait poser une question et s'effacer une fois répondue —
    // le lot A8, qui refait la navigation, leur donnera leur foyer.
    //
    // `faite` observe **une réponse donnée**, jamais une valeur : `null` veut
    // dire « pas encore répondu » (migration 20260901170000), et un `=== true`
    // aurait rouvert la question indéfiniment à qui a répondu « non » — c'est
    // la majorité des dossiers, donc la majorité des utilisateurs.
    {
      id: "assureur",
      titre: "Dire si votre assureur impose des vérifications",
      pourquoi:
        "Beaucoup de contrats d'assurance imposent des contrôles que le droit n'impose pas — extincteurs plus fréquents, thermographie, hotte. Les oublier fait perdre la garantie. Déclarées ici, elles entrent au calendrier en portant la mention qui les distingue du droit.",
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
    {
      id: "epi",
      titre: "Dire si vous fournissez des équipements de protection",
      pourquoi:
        "Harnais, casques, gants, chaussures de sécurité, protections auditives. Depuis le 4 septembre 2026, vous pouvez aussi les déclarer un par un dans vos équipements, avec leur marque et leur lieu. Rojer ne calcule encore aucune échéance à partir d'eux, et ne vous en annoncera aucune tant que les textes qui la fonderaient n'auront pas été dépouillés : ce que vous déclarez ici est conservé, pas interprété.",
      faite: questionRepondue(etab.epiPresents),
      question: (
        <QuestionParametrage
          action={repondreEpiPresents.bind(null, id)}
          labelOui="Oui, nous en fournissons"
          labelNon="Non, aucun"
          detailSiOui={{
            label: "Lesquels ? (facultatif)",
            placeholder: "Harnais antichute, gants anti-coupure, chaussures…",
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
    // Les deux périmètres du hero, dits en clair — cf. `DashboardBundle`.
    // Le premier se dérive du type fermé des familles, le second d'un appel à
    // l'agrégation des zones : aucun des deux n'est une phrase écrite à la
    // main au-dessus d'un chiffre qu'elle ne décrit plus.
    //
    // LA MOITIÉ DROITE DE LA PREMIÈRE EST PARTIE. Elle disait « — pour
    // l'établissement entier, filtre de zone compris », et la légende du
    // sélecteur de zone, 200 px plus bas, disait déjà le même fait avec
    // d'autres mots. Le fait est donc énoncé une fois, à l'endroit où la
    // question se pose : sous le filtre qui la fait naître. Sans filtre, il n'y
    // a pas de périmètre de zone à distinguer, et la phrase n'avait rien à
    // annoncer.
    //
    // Les deux relevés sont NOMMÉS par la table d'états, pas recopiés : le jour
    // où le mot change, la phrase qui le cite change avec lui.
    perimetreHero: {
      releves: `« ${libelleEtatCourtCapitale("enRetard")} » et « ${libelleEtatCourtCapitale("proche")} » réunissent toutes les familles — ${enumererFamilles()}.`,
      plaqueZones: legendePlaqueZones({
        comptes: porteursDeLaPlaqueZones(aujourdhui),
        libelleReleveComplet: libelleEtatCourtCapitale("enRetard"),
      }),
    },
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
      categorieErp: etab.categorieErp,
      classeIgh: etab.classeIgh,
      entreprise: {
        raisonSociale: etab.entreprise.raisonSociale,
        siret: etab.entreprise.siret,
        codeNaf: etab.entreprise.codeNaf,
      },
    },
    dashboard,
    echeances,
    echeancesEtablissement,
    equipements: equipementsDuLieu.map(enLite),
    // Le parc entier : le score porte sur l'établissement, sa légende le dit.
    equipementsEtablissement: equipements.map(enLite),
    barsData,
    aujourdhui,
    evenementsHorizon,
    evenementsSemaine,
    evenementsMois,
    statsRetardActions,
    modulesMatrice,
    prochainesVerifs: prochainesVerifs.map((v) => ({
      id: v.id,
      libelleObligation: v.libelleObligation,
      datePrevue: v.datePrevue,
      statut: v.statut,
      // La source de la prescription traverse jusqu'au board, sans quoi le
      // marquage contractuel n'y paraît jamais (ADR-032). La requête la
      // chargeait déjà et le type l'acceptait : c'est cette projection, entre
      // les deux, qui la jetait — trois couches justes séparément, et une
      // pastille qui n'apparaît nulle part.
      prescription: v.prescription,
      equipement: {
        libelle: libellePorteur(v),
      },
    })),
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

  return (
    <>
      {/* Le brief est une section à part entière : panneau bleu ciel à
          grand rayon posé dans la gouttière — la seule grande surface
          colorée de la page — qui annonce la file de travail du jour. */}
      <BlocBrief bundle={bundle} />

      {/* Le filtre par bâtiment (ADR-019) reste ici, sous le hero, et non sur
          les cartes-bâtiments : un dessin qui filtre au clic n'annonce pas
          comment en sortir, et le sélecteur, lui, porte son « Tout
          l'établissement ». Le hero montre l'état du parc, il ne le commande
          pas. */}
      {multiBatiments ? (
        <div className="bg-[color:var(--board-canvas)] px-[var(--board-gutter)] pt-2">
          <SelecteurBatiment
            // Sans lui, le sélecteur rend en papier — son défaut — au milieu
            // d'un bandeau posé sur `--board-canvas`. L'oubli est silencieux :
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
            // « Le bandeau du haut » a été remplacé par le nom des deux
            // relevés. Le bandeau du haut porte aussi la plaque des zones, qui
            // compte zone par zone : la phrase affirmait donc « toujours sur
            // l'établissement entier » d'un objet dont la moitié ne l'est pas.
            // Nommer les relevés dit vrai et parle la même langue que la
            // légende posée sous eux.
            legende={
              batimentFiltre
                ? `Les échéances, équipements et opérations affichés sont ceux de cette zone, plus ce qui concerne tout l'établissement. Les relevés « ${libelleEtatCourtCapitale("enRetard")} » et « ${libelleEtatCourtCapitale("proche")} », le score et l'état des documents portent toujours sur l'établissement entier.`
                : undefined
            }
          />
        </div>
      ) : null}

      {/* Canvas quasi blanc du board — `flex-1` pour qu'il descende
          jusqu'au bas du conteneur de défilement, même quand les widgets
          sont courts. Les cartes s'en détachent par filet et ombre douce
          (bento), pas par l'aplat. Le reste de l'app garde la palette
          « papier ». */}
      <div className="flex flex-1 flex-col bg-[color:var(--board-canvas)] pb-10">
        {!onboardingFini ? (
          <div className="p-[var(--board-gutter)] pb-0">
            <OnboardingChecklist
              etapes={etapesOnboarding}
              etablissementRaison={etab.raisonDisplay}
            />
          </div>
        ) : null}

        <DashboardGrid bundle={bundle} />

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
