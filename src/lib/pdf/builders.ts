import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { compterActions, listerActions, origineDeLAction } from "@/lib/actions/queries";
import { listerVerifications, type VerificationListee } from "@/lib/calendrier/queries";
import { libellePorteurSansNom } from "@/lib/calendrier/labels";
import { listerRapportsDeLEtablissement } from "@/lib/rapports/queries";
import { obligationParId } from "@/lib/referentiels/conformite";
import { estEcheanceContractuelle } from "@/lib/prescriptions/sources";
import { calculerScoreDepuisEtat } from "@/lib/dashboard/score";
import { etatsPermanentsDuDossier } from "@/lib/etats-permanents/queries";
import { evaluerEtatDuerp } from "@/lib/dashboard/duerp";
import { repartirVerifications } from "./etat-verifications";
import { estVerificationArchivee } from "@/lib/dates/retard";

/**
 * Une ligne « en attente » au sens du registre de sécurité : elle n'a pas
 * encore de rapport, et son obligation s'applique toujours.
 *
 * **Le second membre n'est pas une précaution.** Le filtre ne portait que sur
 * le statut, et le statut d'une ligne archivée reste GELÉ dans son dernier
 * état connu (ADR-012) : une obligation qui ne s'applique plus entrait donc
 * dans un document REMIS EN CONTRÔLE, annoncée « en attente ». Le dossier de
 * conformité, lui, passe par `repartirVerifications` et l'écartait déjà — les
 * deux PDF du même ZIP se contredisaient sur la même ligne.
 *
 * Exporté pour être éprouvé : le reste de `construireRegistreData` demande une
 * base, ce prédicat non.
 */
export function estEnAttenteDeRapport(v: {
  statut: string;
  datePrevue: Date;
  dateRealisee: Date | null;
  /** L'archivage se lit sur ce champ depuis l'ADR-034 (N3), plus sur un
   *  préfixe de libellé. Requis : l'oubli ne compile pas, là où un libellé
   *  non marqué se lisait « ligne vivante » sans que rien ne le signale. */
  archiveLe: Date | null;
  libelleObligation: string;
}): boolean {
  return (
    ["a_planifier", "planifiee", "depassee"].includes(v.statut) &&
    !estVerificationArchivee(v)
  );
}
import type { LignePlanActions, PlanActionsData } from "./PlanActionsDocument";
import type {
  FichePdf,
  LigneRapport,
  LigneVerif,
  PartiePdf,
  RegistreData,
} from "./RegistreDocument";
import { composerRegistreDeLEtablissement } from "@/lib/registre/queries";
import { saisiePourSection } from "@/lib/registre/champs";
import { contenuTenuAilleursDepuis } from "@/lib/registre/contenu-ailleurs";
import { listerEquipementsDeLEtablissement } from "@/lib/equipements/queries";
import { alimentationDeLaPartie } from "@/lib/registre/alimentation";
import {
  bilanDuRegistre,
  completudeDeLaFiche,
  libelleCompletude,
  tonCompletude,
  type Completude,
} from "@/lib/registre/completude";
import { afficherValeur } from "@/lib/registre/valeur";
import type { DossierData } from "./DossierConformiteDocument";
import { couvertureDuDossier } from "@/lib/perimetre/faits";
import { blocEtatsPermanents } from "./mentions-etats-permanents";

/**
 * Builders qui lisent la DB et construisent les données sérialisables
 * à fournir aux composants PDF. Pas de renduHTML ici — uniquement du
 * shaping de données. Cela permet de tester les builders sans rendre
 * de PDF et de garder les composants PDF purs.
 *
 * Deux règles valent pour tout ce fichier :
 *
 *  1. **Rien n'est lu hors du périmètre du user connecté.** Les listes
 *     passent par des queries déjà scopées (`listerActions`,
 *     `listerVerifications`, `listerRapportsDeLEtablissement`) ; les lectures
 *     directes d'établissement passent par `chargerEtablissementDuUser`
 *     ci-dessous. Un `findUnique` sur l'identifiant seul produisait un
 *     document hybride — en-tête d'un tiers, tableaux vides — donc à la fois
 *     une fuite de données et un document faux.
 *
 *  2. **Aucune règle de retard n'est réécrite ici.** Les prédicats viennent
 *     de `@/lib/dates/retard` (ADR-011), qui est la source de vérité unique
 *     du produit. Un dossier remis à un inspecteur ne peut pas afficher un
 *     compteur différent de celui que l'écran montre à la même seconde.
 */

/**
 * Charge un établissement (et son entreprise) en le bornant au user
 * connecté. Retourne `null` aussi bien pour un établissement inexistant que
 * pour celui d'un tiers : l'appelant ne doit pas pouvoir les distinguer.
 */
async function chargerEtablissementDuUser(etablissementId: string) {
  const user = await requireUser();
  return prisma.etablissement.findFirst({
    where: { id: etablissementId, entreprise: { userId: user.id } },
    include: { entreprise: true, _count: { select: { batiments: true } } },
  });
}

function regimesTexte(etab: {
  estEtablissementTravail: boolean;
  estERP: boolean;
  estIGH: boolean;
  estHabitation: boolean;
  typeErp: string | null;
  categorieErp: string | null;
  classeIgh: string | null;
}): string {
  const out: string[] = [];
  if (etab.estEtablissementTravail) out.push("Établissement de travail");
  if (etab.estERP) {
    let lib = "ERP";
    if (etab.typeErp) lib += ` type ${etab.typeErp}`;
    if (etab.categorieErp) lib += ` cat. ${etab.categorieErp.slice(1)}`;
    out.push(lib);
  }
  // Sans la classe depuis le 2026-09-03. Un document remis à un tiers est le
  // pire endroit pour une donnée que son porteur ne peut plus reprendre :
  // celui qui la lit la croit tenue à jour.
  if (etab.estIGH) out.push("IGH");
  if (etab.estHabitation) out.push("Habitation");
  return out.join(", ");
}

function contexteAction(a: {
  risque: {
    libelle: string;
    unite: { nom: string };
  } | null;
  verification: {
    libelleObligation: string;
    equipement: { libelle: string } | null;
  } | null;
}): string {
  if (a.risque) {
    return `DUERP — ${a.risque.unite.nom} · ${a.risque.libelle}`;
  }
  if (a.verification) {
    // Sans équipement, l'échéance porte sur l'établissement (ADR-022) : on
    // imprime l'obligation elle-même. Écrire « Vérification — » suivi de rien
    // laisserait un inspecteur devant une ligne qui ne dit pas sur quoi elle
    // porte.
    return a.verification.equipement
      ? `Vérification — ${a.verification.equipement.libelle}`
      : `Vérification — ${a.verification.libelleObligation}`;
  }
  return "Libre";
}

/**
 * Le nom d'un équipement tel qu'il s'imprime : précédé de son bâtiment dès
 * que l'établissement en compte plusieurs (ADR-019). Un inspecteur qui lit
 * « Tableau électrique » doit savoir lequel ; en mono-bâtiment, le préfixe
 * ne dirait rien.
 */
function libelleEquipementSitue(
  v: {
    equipement: { libelle: string; batiment: { nom: string } } | null;
    salarieId: string | null;
  },
  multiBatiments: boolean,
): string {
  // Sans équipement, l'échéance porte sur une personne ou sur l'établissement
  // (ADR-022, ADR-023). L'imprimer « Tout l'établissement » alors qu'elle
  // relève d'une personne mettrait le contraire de ce que la ligne prouve.
  //
  // Mais SANS LE NOM. Ces trois sorties — registre, dossier de conformité,
  // export contrôle — sont décrites par CLAUDE.md comme « présentables à un
  // tiers : inspection, assurance, **bailleur, acquéreur** ». Imprimer
  // « Attestation médicale d'absence de contre-indication au travail sous
  // tension — Jean Dupont — dépassée depuis 45 jours » envoie un fait
  // nominatif à connotation médicale, sur une personne qui n'a pas accès à
  // l'outil, vers un destinataire qui n'en a aucun besoin.
  //
  // Le nom se lit dans l'application, par l'employeur. Il ne s'imprime pas.
  const eq = v.equipement;
  if (!eq) return libellePorteurSansNom(v);
  return multiBatiments ? `${eq.batiment.nom} — ${eq.libelle}` : eq.libelle;
}

/** Projection d'une vérification vers la ligne imprimée. Partagée par le
 *  registre et le dossier de conformité pour que la même occurrence s'y
 *  affiche à l'identique. */
function ligneVerif(v: VerificationListee, multiBatiments: boolean): LigneVerif {
  return {
    id: v.id,
    libelleObligation: v.libelleObligation,
    equipementLibelle: libelleEquipementSitue(v, multiBatiments),
    datePrevue: v.datePrevue,
    statut: v.statut,
    domaine: obligationParId(v.obligationId)?.domaine ?? null,
    contractuelle: estEcheanceContractuelle(v),
  };
}

export async function construirePlanActionsData(
  etablissementId: string,
): Promise<PlanActionsData | null> {
  const etab = await chargerEtablissementDuUser(etablissementId);
  if (!etab) return null;

  // Le PDF Plan d'actions documente ce qui reste à faire à la date
  // d'édition (cf. mentions légales : « actions correctives en cours »).
  // On exclut donc les levées/abandons de la table — les compteurs de
  // levées restent exposés dans la synthèse pour donner de la visibilité.
  const [actions, compteurs] = await Promise.all([
    listerActions(etablissementId, { enCoursSeulement: true }),
    compterActions(etablissementId),
  ]);

  const lignes: LignePlanActions[] = actions.map((a) => ({
    id: a.id,
    libelle: a.libelle,
    description: a.description,
    type: a.type,
    statut: a.statut,
    criticite: a.criticite,
    echeance: a.echeance,
    responsable: a.responsable,
    origine: origineDeLAction(a),
    contexte: contexteAction(a),
    leveeLe: a.leveeLe,
    leveeCommentaire: a.leveeCommentaire,
  }));

  return {
    entreprise: etab.entreprise.raisonSociale,
    etablissement: etab.raisonDisplay,
    adresse: etab.adresse,
    genereLe: new Date(),
    totalOuvertes: compteurs.ouvertes,
    totalEnCours: compteurs.enCours,
    totalLevees: compteurs.leveesRecemment,
    actions: lignes,
  };
}

export async function construireRegistreData(
  etablissementId: string,
): Promise<RegistreData | null> {
  const etab = await chargerEtablissementDuUser(etablissementId);
  if (!etab) return null;
  const multiBatiments = etab._count.batiments > 1;

  const [rapports, verifs] = await Promise.all([
    listerRapportsDeLEtablissement(etablissementId),
    listerVerifications(etablissementId),
  ]);

  const lignesRapports: LigneRapport[] = rapports.map((r) => ({
    id: r.id,
    dateRapport: r.dateRapport,
    resultat: r.resultat,
    organismeVerif: r.organismeVerif,
    libelleObligation: r.verification.libelleObligation,
    equipementLibelle: libelleEquipementSitue(
      r.verification,
      multiBatiments,
    ),
    domaine: obligationParId(r.verification.obligationId)?.domaine ?? null,
    fichierNomOriginal: r.fichierNomOriginal,
    commentaires: r.commentaires,
  }));

  // « En attente » = tout ce qui n'a pas encore de rapport, quelle que soit
  // la date : c'est le pendant documentaire des rapports listés au-dessus.
  //
  // `estVerificationArchivee` N'EST PAS UN DÉTAIL ICI. Le filtre ne portait
  // que sur le statut, et le statut d'une ligne archivée reste GELÉ dans son
  // dernier état connu (ADR-012) : une obligation qui ne s'applique plus
  // entrait donc dans un document REMIS EN CONTRÔLE, annoncée « en attente ».
  // Le dossier de conformité, lui, passe par `repartirVerifications` et
  // l'écartait déjà — les deux PDF du même ZIP se contredisaient sur la même
  // ligne.
  const verifsEnAttente: LigneVerif[] = verifs
    .filter(estEnAttenteDeRapport)
    .map((v) => ligneVerif(v, multiBatiments));

  // Le registre, fiche par fiche — ce que le document doit être. Il ne
  // portait que les deux tableaux ci-dessus : un extrait du calendrier, pas
  // un registre. Les quarante-neuf fiches dues y figurent maintenant, y
  // compris celles que l'application ne recueille pas : les taire au PDF
  // ferait exactement ce que l'écran a cessé de faire — laisser croire le
  // document complet.
  const registre = await composerRegistreDeLEtablissement(etablissementId);
  const equipements = registre
    ? await listerEquipementsDeLEtablissement(etablissementId)
    : [];

  const completudes: Completude[] = [];
  const parties: PartiePdf[] = (registre?.parties ?? []).map((partie) => ({
    id: partie.id,
    titre: partie.titre,
    fiches: partie.sections.map((due) => {
      const saisie = saisiePourSection(due.section.id);
      const contenu = registre?.contenus[due.section.id];
      const completude = completudeDeLaFiche(
        saisie,
        contenu ?? {},
        alimentationDeLaPartie(partie.id, `/etablissements/${etablissementId}`),
      );
      // Le parc et le calendrier sont lus une seule fois pour les
      // quarante-neuf fiches : une lecture par fiche ferait soixante-deux
      // requêtes pour un document.
      const ailleurs = contenuTenuAilleursDepuis(
        etablissementId,
        partie.id,
        due.section,
        equipements,
        verifs,
      );
      completudes.push(completude);
      return ficheDuPdf(
        due,
        saisie,
        contenu,
        completude,
        ailleurs,
        registre?.misAJourLe[due.section.id] ?? null,
      );
    }),
  }));

  return {
    entreprise: etab.entreprise.raisonSociale,
    etablissement: etab.raisonDisplay,
    adresse: etab.adresse,
    genereLe: new Date(),
    parties,
    bilan: bilanDuRegistre(completudes),
    rapports: lignesRapports,
    verifsEnAttente,
  };
}

/** Une fiche mise à plat pour le rendu — texte seulement, rien de calculé. */
function ficheDuPdf(
  due: { section: { id: string; titre: string; attendu: string }; raisons: string[] },
  saisie: ReturnType<typeof saisiePourSection>,
  contenu: { champs?: Record<string, string | null>; lignes?: { valeurs: Record<string, string | null> }[] } | undefined,
  completude: Completude,
  ailleurs: ReturnType<typeof contenuTenuAilleursDepuis>,
  misAJourLe: Date | null,
): FichePdf {
  const base: FichePdf = {
    id: due.section.id,
    titre: due.section.titre,
    attendu: due.section.attendu,
    raisons: due.raisons,
    etat: libelleCompletude(completude),
    ton: tonCompletude(completude),
    misAJourLe,
  };

  if (saisie?.forme === "etablissement" || saisie?.forme === "formulaire") {
    return {
      ...base,
      champs: saisie.champs.map((c) => ({
        libelle: c.libelle,
        valeur: afficherValeur(contenu?.champs?.[c.cle], c),
      })),
    };
  }

  if (saisie?.forme === "journal") {
    return {
      ...base,
      colonnes: saisie.colonnes.map((c) => c.libelle),
      lignes: (contenu?.lignes ?? []).map((l) =>
        saisie.colonnes.map((c) => afficherValeur(l.valeurs[c.cle], c)),
      ),
    };
  }

  if (ailleurs) {
    return {
      ...base,
      source: ailleurs.source.libelle,
      tenues: ailleurs.lignes.map((l) => ({
        titre: l.titre,
        meta: l.meta ?? "",
      })),
    };
  }

  return base;
}

export async function construireDossierConformiteData(
  etablissementId: string,
): Promise<DossierData | null> {
  const user = await requireUser();
  const etab = await prisma.etablissement.findFirst({
    where: { id: etablissementId, entreprise: { userId: user.id } },
    include: {
      entreprise: true,
      _count: { select: { batiments: true } },
      duerps: {
        orderBy: { updatedAt: "desc" },
        take: 1,
        include: {
          versions: { orderBy: { numero: "desc" }, take: 1 },
          unites: { include: { risques: true } },
        },
      },
    },
  });
  if (!etab) return null;
  const multiBatiments = etab._count.batiments > 1;

  // Les vérifications et les rapports sont lus **une seule fois** : les
  // compteurs de la synthèse et les listes détaillées en dessous doivent
  // décrire le même ensemble. Avant, le compteur venait d'un agrégat SQL et
  // la liste d'un filtre TypeScript portant sur d'autres statuts — le PDF
  // annonçait « 5 vérifications en retard » puis en détaillait 3.
  const [compteursActions, plan, rapports, verifs, couverture, etatsPermanents] =
    await Promise.all([
      compterActions(etablissementId),
      construirePlanActionsData(etablissementId),
      listerRapportsDeLEtablissement(etablissementId),
      listerVerifications(etablissementId),
      // Ce que le référentiel ne traite pas pour cet établissement. Lu par la
      // même entrée que le tableau de bord et les bandeaux : deux lectures
      // finiraient par dire deux choses, et c'est le document remis à
      // l'inspecteur qui porterait la version périmée.
      couvertureDuDossier(etablissementId),
      // Même raison que la ligne au-dessus, et même précédent : le tableau de
      // bord et ce document ont déjà sorti deux scores différents à la même
      // seconde parce que chacun composait son dénominateur. Le champ est
      // requis dans `EntreeScoreConformite` pour que l'oubli ne compile pas.
      //
      // **Un seul passage, pour le score ET pour le tableau imprimé.** Le
      // score n'a besoin que des deux compteurs, le tableau a besoin des
      // lignes ; les lire deux fois aurait mis, dans un même document, une
      // note calculée sur un ensemble et un détail décrivant l'autre. C'est
      // mot pour mot le défaut raconté six lignes plus haut, celui des « 5
      // vérifications en retard » suivies de 3 lignes.
      etatsPermanentsDuDossier(etablissementId, user.id),
    ]);

  const now = new Date();
  const etatVerifs = repartirVerifications(verifs, now);

  const duerp = etab.duerps[0] ?? null;
  const derniereVersion = duerp?.versions[0] ?? null;
  // Le score passe par **la même** entrée que le tableau de bord. L'entrée
  // historique, qui ne recevait qu'un âge en jours, ignorait deux choses que
  // `evaluerEtatDuerp` sait : le seuil d'effectif de la mise à jour annuelle
  // (art. R. 4121-2) et le cas « DUERP ouvert, aucune version validée ». Deux
  // dossiers sortaient donc notés différemment à l'écran et dans le document
  // remis à l'inspecteur, à la même seconde.
  const etatDuerp = evaluerEtatDuerp(
    {
      ouvert: duerp !== null,
      dateDerniereVersion: derniereVersion?.createdAt ?? null,
      effectif: etab.entreprise.effectif,
    },
    now,
  );

  const score = calculerScoreDepuisEtat({
    // Dénominateur = tous les engagements de la période. `aPlanifier` en
    // fait partie : l'omettre rétrécissait le dénominateur et faisait
    // sortir un score inférieur à celui du tableau de bord, au même
    // instant, dans le document remis à l'inspecteur.
    verifs: {
      total: etatVerifs.total,
      enRetard: etatVerifs.enRetard.length,
    },
    actions: {
      ouvertesTotal: compteursActions.totalACouvrir,
      enRetard: compteursActions.enRetard,
    },
    duerp: etatDuerp.ouvert ? etatDuerp : null,
    etatsPermanents: {
      total: etatsPermanents.total,
      enPlace: etatsPermanents.enPlace,
    },
  });

  const criticiteMax =
    duerp?.unites
      .flatMap((u) => u.risques)
      .reduce<number | null>(
        (max, r) => (max === null || r.criticite > max ? r.criticite : max),
        null,
      ) ?? null;

  const rapportsRecents: LigneRapport[] = rapports.slice(0, 10).map((r) => ({
    id: r.id,
    dateRapport: r.dateRapport,
    resultat: r.resultat,
    organismeVerif: r.organismeVerif,
    libelleObligation: r.verification.libelleObligation,
    equipementLibelle: libelleEquipementSitue(
      r.verification,
      multiBatiments,
    ),
    domaine: obligationParId(r.verification.obligationId)?.domaine ?? null,
    fichierNomOriginal: r.fichierNomOriginal,
    commentaires: r.commentaires,
  }));

  return {
    entreprise: etab.entreprise.raisonSociale,
    siret: etab.entreprise.siret,
    etablissement: etab.raisonDisplay,
    adresse: etab.adresse,
    effectifSurSite: etab.effectifSurSite,
    codeNaf: etab.codeNaf ?? etab.entreprise.codeNaf,
    regimesTexte: regimesTexte(etab),
    genereLe: now,
    couverture,
    score,
    // Les trente obligations sans échéance ne vivaient que sur un écran : un
    // dirigeant qui avait passé ses états en revue ne pouvait le montrer à
    // personne, et c'est ce document qu'on présente à un inspecteur. Les
    // phrases viennent de `mentions-etats-permanents.ts`, qui les rend
    // testables ; ce builder ne décide de rien, et n'écrit surtout pas la
    // deuxième rédaction d'un compteur qui existe déjà.
    etatsPermanents: blocEtatsPermanents(etatsPermanents),
    duerp:
      duerp === null
        ? null
        : {
            duerpId: duerp.id,
            numeroDerniereVersion: derniereVersion?.numero ?? null,
            dateDerniereVersion: derniereVersion?.createdAt ?? null,
            nombreUnites: duerp.unites.length,
            nombreRisques: duerp.unites.reduce(
              (n, u) => n + u.risques.length,
              0,
            ),
            criticiteMax,
          },
    compteurs: {
      verifsEnRetard: etatVerifs.enRetard.length,
      verifsPlanifiees: etatVerifs.aVenir.length,
      verifsRealisees12m: etatVerifs.realisees12m.length,
      actionsOuvertes: compteursActions.ouvertes + compteursActions.enCours,
      actionsEnRetard: compteursActions.enRetard,
    },
    rapportsRecents,
    // Exactement les occurrences comptées juste au-dessus, projetées en
    // lignes de tableau : le nombre annoncé et le détail imprimé ne peuvent
    // plus diverger.
    verifsEnRetard: etatVerifs.enRetard.map((v) => ligneVerif(v, multiBatiments)),
    actionsEnCours:
      plan?.actions.filter(
        (a) => a.statut === "ouverte" || a.statut === "en_cours",
      ) ?? [],
  };
}
