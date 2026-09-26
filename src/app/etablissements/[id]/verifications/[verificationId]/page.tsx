import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, ChevronDown, FileText } from "lucide-react";
import { BadgeStatut } from "@/components/calendrier/BadgeStatut";
import { BadgeResultat } from "@/components/rapports/BadgeResultat";
import { SupprimerRapportButton } from "@/components/rapports/SupprimerRapportButton";
import { UploadRapportForm } from "@/components/rapports/UploadRapportForm";
import { BadgeStatutAction } from "@/components/actions/BadgeStatutAction";
import { CreerActionVerifForm } from "@/components/actions/CreerActionVerifForm";
import { getVerification } from "@/lib/calendrier/queries";
import { MentionContractuelle } from "@/components/prescriptions/MentionContractuelle";
import {
  MARQUAGE_CONTRACTUEL,
  MARQUAGE_CONTRACTUEL_LONG,
  estEcheanceContractuelle,
} from "@/lib/prescriptions/sources";
import {
  JOURS_HORIZON_PROCHE,
  formaterDateCourteFr,
  formaterDateLongueFr,
  joursCivilsEntre,
} from "@/lib/dates";
import {
  estActionEnRetard,
  estVerificationEnRetard,
  estVerificationRealisee,
} from "@/lib/dates/retard";
import {
  aUnRendezVous,
  classerVerification,
  LIBELLE_AUCUNE_VERIFICATION,
  LIBELLE_SANS_ECHEANCE,
  LIBELLE_SANS_RENDEZ_VOUS,
  statutAffiche,
} from "@/lib/calendrier/etats";
import {
  FAMILLE_DE_TYPE,
  typeDeVerification,
} from "@/lib/calendrier/echeances";
import {
  LABEL_DOMAINE,
  LABEL_PERIODICITE,
  LABEL_REALISATEUR,
  LABEL_TOUT_ETABLISSEMENT,
} from "@/lib/calendrier/labels";
import { LABEL_CATEGORIE_EQUIPEMENT } from "@/lib/equipements/labels";
import { obligationParId } from "@/lib/referentiels/conformite";
import { modeSurLEcranEnPlace } from "@/lib/etats-permanents/regle";
import {
  estPorteeParEquipement,
  estPorteeParSalarie,
  LIBELLE_SOURCE,
} from "@/lib/referentiels/conformite/types";
import { uploadRapport } from "@/lib/rapports/actions";
import { creerActionDepuisVerification } from "@/lib/actions/plan";
import { prisma } from "@/lib/prisma";
import { LABEL_ITEM } from "@/components/layout/sidebar-nav";
import { DemanderSignatureForm } from "@/components/signatures/DemanderSignatureForm";
import {
  CarteFiche,
  CorpsFiche,
  EcranFiche,
  HeroFiche,
  PastilleFiche,
  PastilleRetard,
  SignatureBlock,
  TitreSection,
  type FaitFiche,
} from "@/components/ui-kit";
import { avecProvenance, lireProvenance } from "@/lib/navigation/provenance";
import { listSignatures } from "@/lib/signatures/queries";

// Les dates sont formatées et comparées dans le fuseau de référence du
// produit (Europe/Paris, cf. ADR-011), jamais dans celui du serveur :
// `toLocaleDateString` sans `timeZone` rendait la page dépendante de
// l'hôte, et `Math.round((d - now) / 86 400 000)` comptait des tranches
// de 24 h plutôt que des jours civils — l'en-tête annonçait « échéance
// dépassée de 1 j » à partir de 14 h le jour même de l'échéance.
function formatDate(d: Date | null): string | null {
  if (!d) return null;
  return formaterDateLongueFr(d);
}

function formatDateCourte(d: Date | null): string | null {
  if (!d) return null;
  return formaterDateCourteFr(d);
}

export default async function VerificationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; verificationId: string }>;
  searchParams: Promise<{ de?: string }>;
}) {
  const { id, verificationId } = await params;
  const { de } = await searchParams;
  const v = await getVerification(verificationId);
  if (!v || v.etablissementId !== id) notFound();

  // Une vérification s'ouvre depuis le calendrier, mais aussi depuis le
  // registre de sécurité, une action corrective ou le tableau de bord.
  const provenance = lireProvenance(de, id);
  // Nommé par la table de la sidebar plutôt qu'en dur : le rail et le fil
  // de retour disent le même mot, par construction.
  const calendrier = {
    href: `/etablissements/${id}/calendrier`,
    label: LABEL_ITEM.calendrier,
  };
  const depuisCetteFiche = `/etablissements/${id}/verifications/${verificationId}`;

  const obligation = obligationParId(v.obligationId);
  // Les catégories que le TEXTE nomme, pas celles que l'établissement a
  // déclarées. Restreindre à ce qui est déclaré ferait disparaître la section
  // chez celui qui n'a rien déclaré — précisément le cas que cette obligation
  // existe pour couvrir (ADR-022).
  const equipementsEnContexte =
    obligation && !estPorteeParEquipement(obligation)
      ? (obligation.equipementsEnContexte ?? [])
      : [];
  const actionsLiees = await prisma.action.findMany({
    where: { verificationId: v.id },
    orderBy: [{ statut: "asc" }, { echeance: "asc" }],
  });
  const boundCreerAction = creerActionDepuisVerification.bind(null, v.id);
  const boundUpload = uploadRapport.bind(null, v.id);

  // Signatures posées sur chaque rapport de cette vérification.
  const signaturesParRapport = new Map<
    string,
    Awaited<ReturnType<typeof listSignatures>>
  >();
  for (const r of v.rapports) {
    signaturesParRapport.set(
      r.id,
      await listSignatures("rapport_verification", r.id),
    );
  }

  // Horloge lue une fois pour toute la page : deux appels à `new Date()`
  // séparés par un await peuvent tomber de part et d'autre de minuit.
  const aujourdhui = new Date();
  // L'échéance OUVERTE est `datePrevue`, et rien d'autre (ADR-034, N5). Toute
  // date de cette page la lit, pour que la tuile, le compte à rebours et la
  // pastille de retard parlent de la même échéance que le classement.
  const echeance = v.datePrevue;
  const joursRestants = joursCivilsEntre(aujourdhui, echeance);
  const enRetard = estVerificationEnRetard(v, aujourdhui);

  /**
   * La ligne n'a pas de rendez-vous : sa `datePrevue` est une date de
   * GÉNÉRATION, pas une date arrêtée.
   *
   * C'est la même lecture que le calendrier, prise à la même source
   * (`classerVerification`) — et c'est la divergence qu'elle referme. Le
   * calendrier comptait ces lignes « à planifier », hors de ses barres, et
   * les marquait « à dater » ; la fiche, elle, affichait la même ligne
   * « PROCHAINE ÉCHÉANCE 01 sept. 2026 » et « Échéance aujourd'hui ». Deux
   * écrans, deux vérités sur une seule ligne, et c'est la fiche qui avait
   * tort : elle prenait la date de génération pour un rendez-vous.
   */
  // `classerVerification` suffit depuis le N4 : la ligne ne porte plus qu'une
  // date, donc l'état de la ligne EST celui de sa date. `etatDuRendezVous`
  // distinguait les deux quand une rangée avait deux vies ; il n'en a plus.
  const etat = classerVerification(v, aujourdhui);
  // L'OBLIGATION NE S'APPLIQUE PLUS À CETTE LIGNE (ADR-034). C'est la page où
  // mène le lien « ne s'applique plus depuis le … » du registre, et jusqu'au
  // 2026-09-13 elle ne lisait pas `archiveLe` : elle annonçait « À planifier —
  // aucune date arrêtée », peignait la pastille du statut gelé et invitait à
  // déposer. La relecture du N4 en a fait la dixième surface.
  const archivee = etat === "archivee";
  const sansRendezVous = !archivee && !aUnRendezVous(v, aujourdhui);
  // `undefined` sur une ligne éteinte : aucun statut à peindre.
  const statutJour = statutAffiche(v, aujourdhui);
  // On ne dépose pas sur une obligation qui ne s'applique plus : le dépôt
  // ferait rouler une ligne éteinte. Le serveur le refuse aussi
  // (`uploadRapport`) — l'écran ne fait que ne pas le proposer.
  const depotOuvert = !archivee;

  const urgent =
    !archivee &&
    !sansRendezVous &&
    !enRetard &&
    // Une obligation sans rendez-vous suivant, déjà faite, garde son statut
    // réalisé mais plus de date à attendre : pas de « Dans N jours » à côté du
    // badge « Conforme ». Sur une obligation périodique, en revanche, un
    // statut réalisé ne purge rien — la date décide (`estVerificationRealisee`).
    !estVerificationRealisee(v) &&
    joursRestants >= 0 &&
    joursRestants <= JOURS_HORIZON_PROCHE;
  const aUnRapport = v.rapports.length > 0;

  // La frontière médicale, appliquée (ADR-023 § 2, docs/rgpd.md § 2.3).
  //
  // `pieceMedicale` était un drapeau MORT : déclaré sur le type, posé sur
  // l'obligation, lu nulle part. Trois documents promettaient que l'interface
  // ne proposerait jamais de téléverser une attestation médicale, et rien ne
  // l'empêchait — le formulaire de dépôt était rendu sans condition. La
  // décision « on ne stocke que l'existence, la date et l'échéance » ne tenait
  // que parce qu'aucun salarié ne pouvait encore être saisi.
  //
  // Le dépôt reste possible partout ailleurs : c'est le fondement du registre
  // de sécurité. Il est retiré sur TOUTE échéance portée par une personne, et
  // non sur les seules pièces médicales — deux raisons, chacune suffisante :
  //
  //  1. D'un titre, l'outil ne garde que l'existence et les dates, médical ou
  //     non (ADR-023 § 2). Indexer la garde sur `pieceMedicale` la lèverait le
  //     jour où arrive une obligation salarié qui n'est pas médicale — SST,
  //     CACES, autorisation de conduite : dix-huit attendent au recensement.
  //  2. La garde reposait sur `obligation !== undefined`. Si l'identifiant
  //     cesse de résoudre — obligation retirée du référentiel, cas déjà vécu
  //     et documenté dans `schema.prisma` —, `obligation` vaut `undefined`,
  //     donc `pieceMedicale` valait `false`, donc **le dépôt réapparaissait
  //     sur la ligne médicale**. Une garde qui se lève quand on ne sait plus
  //     n'est pas une garde.
  //
  // On lit donc le porteur en base, qui ne dépend d'aucune résolution.
  const porteeParUnePersonne = v.salarieId !== null;
  const pieceMedicale =
    porteeParUnePersonne ||
    (obligation !== undefined &&
      estPorteeParSalarie(obligation) &&
      obligation.pieceMedicale === true);
  // ADR-032. La fiche est l'écran où l'on vient chercher ce qu'une échéance
  // engage : c'est le dernier endroit où elle peut encore se lire comme une
  // obligation légale, et le premier où on ira vérifier.
  const contractuelle = estEcheanceContractuelle(v);

  const faits: FaitFiche[] = [
    // L'extinction d'abord, et elle prend la place de l'échéance : une
    // obligation qui ne s'applique plus n'annonce ni date ni rendez-vous.
    // La ligne est gardée pour les rapports qu'elle porte (ADR-012).
    archivee && v.archiveLe
      ? {
          cle: "Obligation",
          valeur: "Ne s'applique plus",
          note: `Depuis le ${formaterDateCourteFr(v.archiveLe)}. La fiche est conservée pour les rapports qu'elle porte.`,
        }
      : // Sans rendez-vous, la ligne n'a pas de « prochaine échéance » à
        // annoncer : elle a un contrôle dû et pas de date. Écrire la date de
        // génération sous cette clé, c'est inventer un rendez-vous que
        // personne n'a pris — et c'est précisément ce que le calendrier refuse
        // de faire en la comptant « à planifier » hors de ses barres.
        etat === "sansRendezVous"
        ? {
            // L'obligation n'a pas de rythme (limite 1, 2026-09-15) : rien
            // n'est dû à une date, l'état se tient en place (ADR-027).
            cle: "Date",
            valeur: LIBELLE_SANS_RENDEZ_VOUS,
            // L'écran n'est nommé que s'il liste l'obligation : ni une
            // événementielle, ni une ponctuelle, ni un titre de salarié.
            // Au verbe de l'écran qui la liste (« en place » ou « fait le »),
            // et sans le nommer s'il ne la liste pas.
            note: {
              etat: "Cette obligation n'a pas de rythme : elle se tient en place, sur « Ce qui doit être en place ».",
              fait: "Cette obligation revient sans rythme écrit : sa dernière réalisation se déclare sur « Ce qui doit être en place ».",
              aucun: "Cette obligation n'a pas de rythme : aucun contrôle n'est attendu à une date.",
            }[
              (obligation === undefined ? null : modeSurLEcranEnPlace(obligation)) ??
                "aucun"
            ],
          }
        : sansRendezVous
        ? {
            cle: "Date",
            valeur: LIBELLE_SANS_ECHEANCE,
            note: "Aucune échéance n'est encore connue pour ce contrôle.",
          }
        : {
          cle: "Prochaine échéance",
          valeur: formatDateCourte(echeance),
          // La dernière réalisation se lit sur les rapports (ADR-034).
          note: v.derniereRealisation
            ? `Dernière : ${formatDateCourte(v.derniereRealisation)}`
            : undefined,
          alerte: enRetard,
        },
    // Sans équipement, l'échéance porte sur l'établissement lui-même
    // (ADR-022) : la ligne change de nom, parce qu'elle ne répond plus à la
    // même question. « Équipement : — » laisserait croire à une donnée
    // manquante ; « Portée : tout l'établissement » dit ce qui est vrai.
    v.equipement
      ? {
          cle: "Équipement",
          valeur: v.equipement.libelle,
          note:
            LABEL_CATEGORIE_EQUIPEMENT[v.equipement.categorie] +
            (v.equipement.localisation
              ? ` · ${v.equipement.localisation}`
              : ""),
        }
      : v.salarie
        ? {
            cle: "Salarié",
            valeur: `${v.salarie.prenom} ${v.salarie.nom}`.trim(),
            note: "L'obligation est nominative : elle vise cette personne, pas un appareil (ADR-023).",
          }
        : {
            cle: "Portée",
            valeur: LABEL_TOUT_ETABLISSEMENT,
            note: "L'obligation ne dépend d'aucun appareil déclaré.",
          },
    {
      cle: "Réalisateur requis",
      valeur: v.realisateurRequis
        .map((r) => LABEL_REALISATEUR[r])
        .join(", "),
    },
  ];

  // Un fait, et non une note en bas de page : ce qui fonde l'échéance est du
  // même ordre que sa date et son réalisateur. Il n'est ajouté que pour une
  // ligne contractuelle — les autres n'ont rien à distinguer, leur fondement
  // est le référentiel, et l'écran le dit déjà par ses références légales.
  if (contractuelle) {
    faits.push({
      cle: "Origine",
      valeur: v.prescription?.reference
        ? `Demande de votre assureur — ${v.prescription.reference}`
        : "Demande de votre assureur",
      note: MARQUAGE_CONTRACTUEL_LONG,
    });
  }

  return (
    <EcranFiche provenance={provenance} canonique={calendrier}>
      <HeroFiche
        // Pas de tuile-date sans date arrêtée : la tuile est un rendez-vous
        // posé, et poser la date de génération y donnait à lire un jour où
        // rien n'est attendu. La pastille de statut dit « À planifier », et
        // le fait ci-dessus dit qu'aucune date n'est arrêtée.
        date={sansRendezVous || archivee ? null : echeance}
        etat={etat}
        /* Déduite du porteur, comme partout ailleurs (ADR-016) : la page
           connaît déjà `v.salarie`, qu'elle affiche vingt lignes plus haut.
           Posée en dur, elle rendait le presse-papiers des contrôles
           matériel sur la fiche d'une attestation médicale — le dernier
           endroit du chemin qui l'ignorait encore. */
        famille={FAMILLE_DE_TYPE[typeDeVerification(v)]}
        surtitre={
          <>
            {obligation ? LABEL_DOMAINE[obligation.domaine] : "Vérification"}
            <span aria-hidden className="text-[color:var(--board-slate)]">
              ·
            </span>
            {LABEL_PERIODICITE[v.periodicite]}
          </>
        }
        titre={v.libelleObligation}
        chapeau={obligation?.description}
        faits={faits}
        pastilles={
          <>
            {contractuelle && <MentionContractuelle />}
            {/* En retard, la pastille d'état dit déjà « En retard » : une
                seconde pastille rose aurait dit la même chose. Le compte de
                jours la remplace alors, plutôt que de s'y ajouter — un retard
                d'un jour et un retard de six mois n'appellent pas le même
                geste. */}
            {/* Pas de pastille de statut sur une ligne éteinte : le statut y
                est GELÉ dans son dernier état connu, et « Planifiée » ou
                « Conforme » y dirait une chose qui n'est plus attendue. Le fait
                « Ne s'applique plus », au-dessus, dit ce qui est vrai. */}
            {/* L'ÉTAT DU JOUR, pas le statut stocké (`statutAffiche`) : une
                rangée périodique gelée affichait « Conforme » à côté de la
                pastille « En retard de N j » (relecture du 2026-09-13). */}
            {statutJour === undefined || statutJour === "en_retard" ? null : (
              <BadgeStatut statut={statutJour} />
            )}
            {enRetard && sansRendezVous ? (
              // Dû et jamais fait, SANS échéance connue : compter des jours
              // depuis la date de génération mesurerait l'âge du dossier, pas
              // un retard (`aUnRendezVous`). Même phrase que la carte du
              // tableau de bord.
              <PastilleFiche ton="retard">{LIBELLE_AUCUNE_VERIFICATION}</PastilleFiche>
            ) : enRetard ? (
              <PastilleRetard echeance={echeance} maintenant={aujourdhui} />
            ) : urgent ? (
              <PastilleFiche ton="proche">
                {joursRestants === 0
                  ? "Échéance aujourd'hui"
                  : joursRestants === 1
                    ? "Échéance demain"
                    : `Dans ${joursRestants} jours`}
              </PastilleFiche>
            ) : null}
          </>
        }
        actions={
          // Pas d'appareil à modifier quand l'échéance porte sur
          // l'établissement (ADR-022) : un lien vers une fiche qui n'existe
          // pas vaut moins que pas de lien.
          v.equipement ? (
            <Link
              href={`/etablissements/${id}/equipements/${v.equipement.id}/modifier`}
              className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[color:var(--board-blue-ink)] hover:text-[color:var(--board-ink)]"
            >
              Modifier l&apos;équipement
              <ArrowUpRight className="size-3.5" />
            </Link>
          ) : null
        }
      />

      {/* Ce qui fonde l'obligation — replié : on le consulte une fois, on
          ne le relit pas à chaque visite. */}
      {obligation && obligation.referencesLegales.length > 0 ? (
        <details className="carte-board group overflow-hidden">
          <summary className="flex cursor-pointer select-none items-center justify-between gap-4 px-7 py-5 sm:px-8">
            <span className="board-eyebrow text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
              Ce qui fonde cette obligation
            </span>
            <span className="flex items-center gap-3">
              <span className="pastille-board bg-[color:var(--board-slate-pale)] text-[color:var(--board-slate-mid)]">
                {obligation.referencesLegales.length} référence
                {obligation.referencesLegales.length > 1 ? "s" : ""}
              </span>
              <span
                aria-hidden
                className="grid size-8 flex-none place-items-center rounded-full ring-1 ring-[color:rgba(10,10,10,.16)] transition-transform group-open:rotate-180"
              >
                <ChevronDown className="size-4" />
              </span>
            </span>
          </summary>
          <ul className="m-0 list-none border-t border-[color:var(--board-slate-line)] p-0">
            {obligation.referencesLegales.map((ref, idx) => (
              <li
                key={idx}
                className="flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--board-slate-line)] px-7 py-4 first:border-t-0 sm:px-8"
              >
                <span className="min-w-0">
                  <span className="board-eyebrow text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
                    {LIBELLE_SOURCE[ref.source]}
                  </span>
                  <span className="ml-3 text-[13.5px]">{ref.reference}</span>
                </span>
                {ref.url && (
                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[color:var(--board-blue-ink)] hover:text-[color:var(--board-ink)]"
                  >
                    Consulter
                    <ArrowUpRight className="size-3.5" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {/* ── Ce que l'obligation vise chez vous ──────────────────────
          Seulement pour une obligation portée par l'établissement : elle
          n'a pas d'appareil déclencheur, et le dirigeant a besoin de voir à
          quoi elle s'applique. La mention « non limitative » n'est pas une
          précaution de style — PE 4 § 2 énumère puis finit par « etc. », et
          afficher une liste fermée ferait dire au produit l'inverse du
          texte (ADR-022). */}
      {obligation &&
      !estPorteeParEquipement(obligation) &&
      equipementsEnContexte.length > 0 ? (
        <section className="carte-board overflow-hidden">
          <div className="border-b border-[color:var(--board-slate-line)] px-7 py-5 sm:px-8">
            <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
              Ce que cette obligation vise chez vous
            </p>
          </div>
          <div className="px-7 py-5 sm:px-8">
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              {equipementsEnContexte.map((c) => (
                <li
                  key={c}
                  className="pastille-board bg-[color:var(--board-slate-pale)] text-[color:var(--board-slate-mid)]"
                >
                  {LABEL_CATEGORIE_EQUIPEMENT[c]}
                </li>
              ))}
            </ul>
            {obligation.id === "incendie-erp-pe4-entretien-installations-techniques" ? (
              // Écrit pour PE 4 § 2, dont la liste finit par « etc. ». Il
              // s'affichait pour toute obligation d'établissement qui nomme des
              // équipements — la consigne de R. 4227-37 n'a ni « etc. » ni
              // échéance (relecture du 2026-09-26).
              <p className="m-0 mt-4 text-[12.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
                Les installations que le texte nomme. La liste n&apos;est{" "}
                <strong className="font-semibold">pas limitative</strong>{" "}
                : elle se termine par « etc. » et vise l&apos;ensemble de vos
                installations techniques, y compris celles que vous n&apos;avez
                pas déclarées ici. L&apos;échéance vous est due même si vous
                n&apos;avez déclaré aucun appareil.
              </p>
            ) : (
              <p className="m-0 mt-4 text-[12.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
                Les équipements que le texte nomme.
              </p>
            )}
          </div>
        </section>
      ) : null}

      {/* ── Le dossier : les rapports déposés ─────────────────────── */}
      {aUnRapport ? (
        <>
          <TitreSection
            surtitre="Dossier"
            titre="Rapports déposés"
            compte={v.rapports.length}
            droite={
              depotOuvert ? (
              <details className="group">
                <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-full px-[18px] py-2.5 text-[12.5px] font-semibold text-[color:var(--board-ink)] ring-1 ring-[color:rgba(10,10,10,.18)] transition-colors hover:bg-[color:var(--board-slate-pale)]">
                  <span className="group-open:hidden">+ Nouveau rapport</span>
                  <span className="hidden group-open:inline">Annuler</span>
                </summary>
                <div className="carte-board mt-4 overflow-hidden md:min-w-[520px]">
                  <div className="border-b border-[color:var(--board-slate-line)] px-7 py-5">
                    <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
                      Nouveau rapport
                    </p>
                    <p className="m-0 mt-2 text-[13px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                      Un rapport additionnel met à jour la date de réalisation
                      et régénère la prochaine échéance.
                    </p>
                  </div>
                  <div className="px-7 py-6">
                    {pieceMedicale ? (
                      <p className="m-0 text-[13px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                        Cette échéance porte sur une pièce médicale. L&apos;outil
                        n&apos;en conserve que l&apos;existence, la date et
                        l&apos;échéance — jamais le document. Vous restez tenu de
                        conserver l&apos;attestation elle-même, hors de
                        l&apos;application.
                      </p>
                    ) : (
                      <UploadRapportForm action={boundUpload} />
                    )}
                  </div>
                </div>
              </details>
              ) : undefined
            }
          />

          <ul className="m-0 flex list-none flex-col gap-[22px] p-0">
            {v.rapports.map((r, idx) => {
              const sigs = signaturesParRapport.get(r.id) ?? [];
              return (
                <li key={r.id}>
                  <article className="carte-board overflow-hidden">
                    <div className="flex flex-wrap items-start justify-between gap-4 px-7 pb-5 pt-6 sm:px-8">
                      <div className="flex min-w-0 flex-1 items-start gap-4">
                        <span
                          aria-hidden
                          className="board-titre mt-0.5 flex-none text-[26px] leading-none tabular-nums text-[color:var(--board-slate)]"
                        >
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <div className="min-w-0">
                          <p className="m-0 text-[16px] font-semibold leading-tight tracking-[-0.015em]">
                            Rapport du {formatDate(r.dateRapport)}
                          </p>
                          {r.organismeVerif && (
                            <p className="m-0 mt-1 text-[13px] text-[color:var(--board-slate-mid)]">
                              par {r.organismeVerif}
                            </p>
                          )}
                        </div>
                      </div>
                      <BadgeResultat resultat={r.resultat} />
                    </div>

                    <div className="border-t border-[color:var(--board-slate-line)] px-7 py-5 sm:px-8">
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden
                          className="grid size-9 flex-none place-items-center rounded-[13px] bg-[color:var(--board-slate-pale)] text-[color:var(--board-slate-soft)]"
                        >
                          <FileText className="size-[17px]" />
                        </span>
                        <span className="truncate font-mono text-[12.5px] text-[color:var(--board-ink)]">
                          {r.fichierNomOriginal}
                        </span>
                      </div>
                      {r.commentaires && (
                        <p className="m-0 mt-4 text-[13.5px] leading-[1.6] text-[color:var(--board-slate-ink)]">
                          <span className="board-eyebrow mr-2 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
                            Observations
                          </span>
                          {r.commentaires}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--board-slate-line)] px-7 py-4 sm:px-8">
                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href={`/api/rapports/${r.id}/fichier`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[12px] font-semibold text-[color:var(--board-ink)] ring-1 ring-[color:rgba(10,10,10,.18)] transition-colors hover:bg-[color:var(--board-slate-pale)]"
                        >
                          Ouvrir le fichier
                          <ArrowUpRight className="size-3.5" />
                        </a>
                        <DemanderSignatureForm
                          etablissementId={id}
                          objetType="rapport_verification"
                          objetId={r.id}
                        />
                      </div>
                      <SupprimerRapportButton id={r.id} />
                    </div>

                    {sigs.length > 0 && (
                      <div className="space-y-3 border-t border-[color:var(--board-slate-line)] bg-[color:var(--board-slate-pale)] px-7 py-5 sm:px-8">
                        <p className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-green-ink)]">
                          {sigs.length}{" "}
                          {sigs.length > 1 ? "signatures" : "signature"}
                        </p>
                        <div className="space-y-3">
                          {sigs.map((s) => (
                            <SignatureBlock
                              key={s.id}
                              charte="board"
                              signataireNom={s.signataireNom}
                              signataireRole={s.signataireRole}
                              signataireEmail={s.signataireEmail}
                              horodatageIso={s.horodatageIso}
                              methode={s.methode}
                              hashDocument={s.hashDocument}
                              nomDocument={s.nomDocument}
                              signatureId={s.id}
                              verifierHref={`/verifier/${s.id}`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </article>
                </li>
              );
            })}
          </ul>
        </>
      ) : !depotOuvert ? (
        /* Éteinte et sans rapport : rien n'est attendu, rien ne se dépose. */
        <CorpsFiche
          principal={
            <CarteFiche titre="Aucun rapport au dossier">
              <p className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                Cette obligation ne s&apos;applique plus à cette ligne. Aucun
                contrôle n&apos;y est attendu, et aucun rapport ne s&apos;y
                dépose.
              </p>
            </CarteFiche>
          }
        />
      ) : (
        /* Aucun rapport : la fiche dit ce qu'elle attend, et le demande
           dans le même objet — pas un état vide puis un formulaire. */
        <CorpsFiche
          principal={
            <CarteFiche
              titre={
                pieceMedicale ? "Ce que l'outil suit" : "Déposer le rapport"
              }
            >
              {pieceMedicale ? (
                <p className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                  Cette échéance porte sur une pièce médicale. L&apos;outil
                  n&apos;en conserve que l&apos;existence, la date et
                  l&apos;échéance — jamais le document, jamais un motif, jamais
                  un élément de diagnostic. C&apos;est plus strict que ce que le
                  droit autorise, et c&apos;est délibéré. L&apos;attestation
                  elle-même se conserve hors de l&apos;application.
                </p>
              ) : (
                <UploadRapportForm
                  action={boundUpload}
                  labelAnnuler={{
                    libelle: "Annuler",
                    href: `/etablissements/${id}/calendrier`,
                  }}
                />
              )}
            </CarteFiche>
          }
          cote={
            <section className="carte-board overflow-hidden bg-[color:var(--board-blue-pale)] px-7 py-7 sm:px-8">
              <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-blue-ink)]">
                En attente
              </p>
              <h2 className="board-titre m-0 mt-3 text-[22px]">
                Cette vérification attend son rapport.
              </h2>
              <p className="m-0 mt-3 text-[13.5px] leading-[1.6] text-[color:var(--board-slate-ink)]">
                Dès que vous téléversez le rapport du vérificateur, la
                vérification est marquée comme réalisée et la prochaine
                échéance est recalculée automatiquement.
              </p>
              <ul className="m-0 mt-5 flex list-none flex-col gap-2 p-0 text-[13px] text-[color:var(--board-slate-ink)]">
                {[
                  "Le fichier du rapport (PDF de préférence)",
                  "La date de réalisation",
                  "Le résultat constaté",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span
                      aria-hidden
                      className="mt-[7px] inline-block h-[3px] w-3 flex-none rounded-full bg-[color:var(--board-blue-strong)]"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              {/* Le repli disait « Obligation réglementaire » dès que
                  `obligationId` ne résolvait pas — donc sur TOUTES les
                  obligations sur mesure nées d'une prescription, dont celles
                  qui viennent d'un assureur. C'est une référence légale
                  fabriquée sur une ligne qui n'en a pas, exactement ce que
                  l'ADR-032 interdit. Une ligne contractuelle dit ce qu'elle
                  est ; les autres gardent le repli, qui reste vrai pour
                  elles. */}
              <p
                className={
                  "board-eyebrow m-0 mt-6 text-[10px] tracking-[0.16em] " +
                  (contractuelle
                    ? "text-[color:var(--board-amber-ink)]"
                    : "text-[color:var(--board-blue-ink)]")
                }
              >
                {contractuelle
                  ? MARQUAGE_CONTRACTUEL
                  : (obligation?.referencesLegales[0]?.reference ??
                    "Obligation réglementaire")}
              </p>
            </section>
          }
        />
      )}

      {/* ── Les écarts à lever ────────────────────────────────────── */}
      <TitreSection
        surtitre="Levées d'écart"
        titre="Actions correctives"
        compte={actionsLiees.length}
        droite={
          actionsLiees.length > 0 ? (
            <details className="group">
              <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-full px-[18px] py-2.5 text-[12.5px] font-semibold text-[color:var(--board-ink)] ring-1 ring-[color:rgba(10,10,10,.18)] transition-colors hover:bg-[color:var(--board-slate-pale)]">
                <span className="group-open:hidden">+ Créer une action</span>
                <span className="hidden group-open:inline">Annuler</span>
              </summary>
              <div className="carte-board mt-4 px-7 py-6 md:min-w-[520px]">
                <CreerActionVerifForm action={boundCreerAction} />
              </div>
            </details>
          ) : undefined
        }
      />

      {actionsLiees.length > 0 ? (
        <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2">
          {actionsLiees.map((a) => {
            // Même prédicat que le plan d'actions : une action dont
            // l'échéance tombe aujourd'hui n'est pas en retard, et une
            // action abandonnée ne l'est jamais non plus.
            const enRetardAction = estActionEnRetard(a, aujourdhui);
            return (
              <li key={a.id}>
                <Link
                  href={avecProvenance(
                    `/etablissements/${id}/actions/${a.id}`,
                    depuisCetteFiche,
                  )}
                  className="carte-board block h-full px-6 py-5 transition-colors hover:bg-[color:var(--board-slate-pale)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="m-0 text-[14.5px] font-semibold leading-[1.35]">
                      {a.libelle}
                    </p>
                    <BadgeStatutAction statut={a.statut} />
                  </div>
                  <p
                    className="m-0 mt-3 text-[12.5px]"
                    style={{
                      color: enRetardAction
                        ? "var(--board-signal-ink)"
                        : "var(--board-slate-mid)",
                    }}
                  >
                    {a.echeance
                      ? `Échéance ${formatDateCourte(a.echeance)}`
                      : "Pas d'échéance"}
                    {a.responsable ? ` · ${a.responsable}` : ""}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-[22px] bg-[color:var(--board-slate-pale)] px-6 py-5">
            <div>
              <p className="m-0 text-[14.5px] font-semibold">
                Aucun écart à lever pour l&apos;instant.
              </p>
              <p className="m-0 mt-1 text-[13px] text-[color:var(--board-slate-mid)]">
                Créez une action corrective si le rapport mentionne une
                observation à traiter.
              </p>
            </div>
            <span className="inline-flex flex-none items-center gap-2 rounded-full bg-[color:var(--board-ink)] px-[18px] py-2.5 text-[12.5px] font-semibold text-white">
              <span className="group-open:hidden">+ Créer</span>
              <span className="hidden group-open:inline">Annuler</span>
            </span>
          </summary>
          <div className="carte-board mt-4 px-7 py-6">
            <CreerActionVerifForm action={boundCreerAction} />
          </div>
        </details>
      )}
    </EcranFiche>
  );
}
