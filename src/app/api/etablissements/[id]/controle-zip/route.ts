import { renderToBuffer } from "@react-pdf/renderer";
import JSZip from "jszip";
import { NextResponse } from "next/server";
import { requireEtablissement } from "@/lib/auth/scope";
import { prisma } from "@/lib/prisma";
import { getStorage } from "@/lib/storage";
import { publicAppUrl } from "@/lib/email";
import {
  MOIS_FENETRE_HISTORIQUE,
  ajouterMois,
  cleJourCivil,
  debutDuJour,
  formaterDateFr,
  formaterDateHeureFr,
} from "@/lib/dates";
import {
  construireDossierConformiteData,
  construirePlanActionsData,
  construireRegistreData,
} from "@/lib/pdf/builders";
import { DossierConformiteDocument } from "@/lib/pdf/DossierConformiteDocument";
import { DuerpDocument } from "@/lib/pdf/DuerpDocument";
import { PlanActionsDocument } from "@/lib/pdf/PlanActionsDocument";
import { RegistreDocument } from "@/lib/pdf/RegistreDocument";
import { slugifyFilename } from "@/lib/pdf/styles";
import { contenuR4512_8 } from "@/lib/plan-prevention/contenu-r4512-8";
import { MARQUAGE_CONTRACTUEL } from "@/lib/prescriptions/sources";
import { nomDossierArchive, nomEntreeArchive } from "@/lib/storage/noms";
import type { DuerpSnapshot } from "@/lib/versions/snapshot";

/**
 * Assemble en un ZIP **tous** les documents qu'un inspecteur, un assureur,
 * un bailleur ou un acquéreur pourrait demander à voir. C'est le livrable
 * « panic button » du dirigeant : 1 clic, 1 ZIP, dossier présentable.
 *
 * Contenu :
 *   00_README.txt                — sommaire, checklist pré-contrôle, astuces
 *   01_Dossier_conformite.pdf    — synthèse globale signée (existant)
 *   02_DUERP.pdf                 — dernière version figée si présente
 *   03_Registre_securite.pdf     — rapports de vérif + signatures (existant)
 *   04_Plan_actions.pdf          — écarts ouverts priorisés (existant)
 *   05_Accessibilite_URL.txt     — URL publique du registre (si publié)
 *   Prestataires/                — attestations URSSAF, RC Pro, Kbis
 */
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { etablissement } = await requireEtablissement(id);

  const zip = new JSZip();
  // Horloge lue une seule fois : toutes les fenêtres et toutes les dates
  // imprimées dans le dossier décrivent le même instant.
  const maintenant = new Date();
  const dateNow = formaterDateFr(maintenant);

  // Les échéances contractuelles réellement imprimées dans ce dossier
  // (ADR-032). Un `Set` d'identifiants et non un compteur : la même
  // occurrence peut figurer dans le dossier de conformité et dans le
  // registre, et le README annoncerait deux lignes là où il n'y en a qu'une.
  //
  // Alimenté depuis les données déjà construites pour les PDF, sans lecture
  // nouvelle : le README dit ce que le ZIP contient, pas ce que le dossier
  // porte. Si une brique échoue, ses lignes ne sont pas imprimées et ne sont
  // donc pas annoncées — c'est cohérent, pas un oubli.
  const echeancesContractuelles = new Set<string>();

  // ── 01 Dossier de conformité ────────────────────────────────────────
  try {
    const data = await construireDossierConformiteData(id);
    if (data) {
      for (const v of data.verifsEnRetard) {
        if (v.contractuelle) echeancesContractuelles.add(v.id);
      }
      const buf = await renderToBuffer(DossierConformiteDocument({ data }));
      zip.file("01_Dossier_conformite.pdf", new Uint8Array(buf));
    }
  } catch {
    // On continue même si une brique échoue.
  }

  // ── 02 DUERP (dernière version figée) ───────────────────────────────
  //
  // Le PDF est **rendu à la volée depuis le snapshot** de la dernière
  // version, pas relu depuis un fichier stocké. Trois raisons :
  //   - le rendu depuis le snapshot est déterministe : la même version
  //     produit toujours le même document, c'est ce qui fait sa valeur de
  //     preuve (conservation 40 ans) ;
  //   - il ne dépend d'aucun stockage de fichier, donc le DUERP est
  //     toujours présent dans le dossier remis à l'inspecteur ;
  //   - c'est exactement le chemin de `/duerp/[id]/versions/[numero]/pdf`,
  //     donc le fichier du ZIP est bit à bit celui que l'écran propose.
  //
  // Auparavant le ZIP cherchait `DuerpVersion.pdfUrl`, colonne qu'aucun
  // code n'écrit : la branche était toujours fausse et le 02_DUERP.pdf
  // annoncé par le README manquait systématiquement.
  //
  // L'ownership a déjà été vérifié par requireEtablissement en haut ; la
  // requête reste néanmoins bornée par `duerp.etablissementId`.
  let duerpNumeroVersion: number | null = null;
  try {
    const versions = await prisma.duerpVersion.findMany({
      where: { duerp: { etablissementId: id } },
      orderBy: { numero: "desc" },
      select: { numero: true, snapshot: true, motif: true, createdAt: true },
    });
    const versionCourante = versions[0] ?? null;
    if (versionCourante) {
      // L'historique imprimé en fin de document liste toutes les versions
      // du DUERP — la traçabilité exigée par l'art. R. 4121-2.
      const historique = versions.map((v) => ({
        numero: v.numero,
        genereLe: v.createdAt.toISOString(),
        motif: v.motif,
      }));
      const buf = await renderToBuffer(
        DuerpDocument({
          snapshot: versionCourante.snapshot as unknown as DuerpSnapshot,
          historique,
        }),
      );
      zip.file(`02_DUERP_v${versionCourante.numero}.pdf`, new Uint8Array(buf));
      duerpNumeroVersion = versionCourante.numero;
    }
  } catch {
    // On continue même si une brique échoue : le README dira que le DUERP
    // n'est pas inclus plutôt que de faire échouer tout le dossier.
  }

  // ── 03 Registre de sécurité ─────────────────────────────────────────
  try {
    const data = await construireRegistreData(id);
    if (data) {
      for (const v of data.verifsEnAttente) {
        if (v.contractuelle) echeancesContractuelles.add(v.id);
      }
      const buf = await renderToBuffer(RegistreDocument({ data }));
      zip.file("03_Registre_securite.pdf", new Uint8Array(buf));
    }
  } catch {
    /* noop */
  }

  // ── 04 Plan d'actions ───────────────────────────────────────────────
  try {
    const data = await construirePlanActionsData(id);
    if (data) {
      const buf = await renderToBuffer(PlanActionsDocument({ data }));
      zip.file("04_Plan_actions.pdf", new Uint8Array(buf));
    }
  } catch {
    /* noop */
  }

  // ── 05 Accessibilité (URL publique + QR si publié) ──────────────────
  const registreAccess = await prisma.registreAccessibilite.findUnique({
    where: { etablissementId: id },
    select: { slugPublic: true, publie: true },
  });
  if (registreAccess?.publie) {
    const url = `${publicAppUrl()}/accessibilite/${registreAccess.slugPublic}`;
    zip.file(
      "05_Accessibilite_URL.txt",
      `Registre d'accessibilité publique\n` +
        `Art. R. 164-6 CCH · arrêté du 19 avril 2017\n\n` +
        `URL consultable par le public : ${url}\n\n` +
        `Affiche A4 imprimable avec QR code : ${publicAppUrl()}/api/accessibilite/${registreAccess.slugPublic}/affiche\n`,
    );
  }

  // ── Prestataires : attestations URSSAF, RC Pro, Kbis ────────────────
  const prestataires = await prisma.prestataire.findMany({
    where: { etablissementId: id },
    orderBy: { raisonSociale: "asc" },
  });
  if (prestataires.length > 0) {
    const dossierPrestataires = zip.folder("Prestataires") ?? zip;
    const storage = getStorage();
    for (const p of prestataires) {
      const safeDir = nomDossierArchive(p.raisonSociale, "Prestataire");
      const sousDossier = dossierPrestataires.folder(safeDir) ?? dossierPrestataires;
      // Le nom d'origine de la pièce vient du poste du prestataire : il est
      // conservé en base pour l'affichage, il ne devient un nom d'entrée
      // d'archive qu'assaini. L'export est fait pour être décompressé chez
      // un tiers.
      for (const [cle, nom] of [
        [p.attestationUrssafCle, nomEntreeArchive(p.attestationUrssafNom, "URSSAF.pdf")],
        [p.assuranceRcProCle, nomEntreeArchive(p.assuranceRcProNom, "RC_Pro.pdf")],
        [p.kbisCle, nomEntreeArchive(p.kbisNom, "Kbis.pdf")],
      ] as const) {
        if (!cle) continue;
        try {
          const buf = await storage.get(cle);
          sousDossier.file(nom, new Uint8Array(buf));
        } catch {
          /* fichier manquant, on ignore */
        }
      }
    }
  }

  // ── 06 Permis de feu (12 derniers mois) ─────────────────────────────
  // Fenêtre en **mois calendaires** : `Date.now() - 365 jours` glisse d'un
  // jour à chaque année bissextile et d'une heure à chaque changement
  // d'heure — un permis du 12 août de l'an dernier disparaissait du dossier
  // le 12 août suivant, alors qu'il a bien moins de douze mois.
  // La borne est ramenée à minuit (heure de Paris) : les dates de début de
  // permis et de plan sont des dates civiles, une borne qui garderait
  // l'heure courante ferait disparaître du dossier, l'après-midi, une pièce
  // encore présente le matin.
  const ilYaUnAn = debutDuJour(ajouterMois(maintenant, -MOIS_FENETRE_HISTORIQUE));
  const permisFeuList = await prisma.permisFeu.findMany({
    where: {
      etablissementId: id,
      dateDebut: { gte: ilYaUnAn },
      statut: { notIn: ["brouillon", "annule"] },
    },
    orderBy: { numero: "desc" },
  });
  if (permisFeuList.length > 0) {
    const txt = [
      `PERMIS DE FEU — 12 derniers mois (${permisFeuList.length})`,
      `Recommandation INRS ED 6030 ; règle APSAD R43 exigée par les assureurs.`,
      `Ni l'une ni l'autre n'est un texte réglementaire — cf. le dossier de contrôle.`,
      "",
      "────────────────────────────────────────────────────────────",
      ...permisFeuList.flatMap((p) => [
        `PF-${String(p.numero).padStart(3, "0")} · ${p.statut.toUpperCase()}`,
        `  Prestataire : ${p.prestataireRaison} (${p.prestataireContact})`,
        `  Lieu : ${p.lieu}`,
        `  Période : ${formaterDateHeureFr(p.dateDebut)} → ${formaterDateHeureFr(p.dateFin)}`,
        `  Surveillance : ${Math.round(p.dureeSurveillanceMinutes / 60)}h`,
        `  Travaux : ${p.naturesTravaux.join(", ")}`,
        `  Description : ${p.descriptionTravaux}`,
        `  Mesures validées : ${p.mesuresValidees.length}`,
        "",
      ]),
    ].join("\n");
    zip.file("06_Permis_de_feu.txt", txt);
  }

  // ── 07 Plans de prévention (actifs 12 derniers mois) ────────────────
  const plansList = await prisma.planPrevention.findMany({
    where: {
      etablissementId: id,
      dateDebut: { gte: ilYaUnAn },
      statut: { notIn: ["brouillon", "annule"] },
    },
    include: {
      lignes: { orderBy: { ordre: "asc" } },
      phasesDangereuses: { orderBy: { ordre: "asc" } },
    },
    orderBy: { numero: "desc" },
  });
  if (plansList.length > 0) {
    const txt = [
      `PLANS DE PRÉVENTION — 12 derniers mois (${plansList.length})`,
      `Art. R. 4512-6 à R. 4512-12 du code du travail.`,
      "",
      "────────────────────────────────────────────────────────────",
      ...plansList.flatMap((p) => [
        `PP-${String(p.numero).padStart(3, "0")} · ${p.statut.toUpperCase()}`,
        `  Entreprise extérieure : ${p.entrepriseExterieureRaison}`,
        `  Chef EE : ${p.efChefNom} (${p.efChefEmail})`,
        `  Effectif EE : ${p.efEffectifIntervenant}`,
        `  Chef EU : ${p.euChefNom}${p.euChefFonction ? ` (${p.euChefFonction})` : ""}`,
        `  Période : ${formaterDateFr(p.dateDebut)} → ${formaterDateFr(p.dateFin)}${p.dureeHeuresEstimee ? ` · ${p.dureeHeuresEstimee} h` : ""}`,
        `  Lieux : ${p.lieux}`,
        `  Travaux dangereux : ${p.travauxDangereux ? "OUI" : "non"}`,
        p.inspectionDate
          ? `  Inspection commune : ${formaterDateFr(p.inspectionDate)}`
          : `  Inspection commune : NON RÉALISÉE`,
        `  Risques d'interférence identifiés (art. R. 4512-6, ${p.lignes.length}) :`,
        ...p.lignes.map(
          (l, i) =>
            `    ${i + 1}. ${l.risque}\n` +
            `       → EU : ${l.mesureEntrepriseUtilisatrice ?? "—"}\n` +
            `       → EE : ${l.mesureEntrepriseExterieure ?? "—"}`,
        ),
        // LE CONTENU MINIMAL, IMPRIMÉ RUBRIQUE PAR RUBRIQUE — Y COMPRIS CELLES
        // QUI MANQUENT. Ce fichier porte en en-tête « Art. R. 4512-6 à
        // R. 4512-12 » et n'imprimait rien de R. 4512-8 : il citait l'article
        // dont il ne servait pas le contenu. Une rubrique vide s'imprime
        // « NON RENSEIGNÉE » plutôt que de disparaître — le destinataire de ce
        // ZIP est un inspecteur, un assureur ou un acquéreur, et une omission
        // silencieuse lui ferait lire un plan complet.
        ...contenuR4512_8(p),
        "",
      ]),
    ].join("\n");
    zip.file("07_Plans_de_prevention.txt", txt);
  }

  // ── 08 Carnet sanitaire (résumé) ─────────────────────────────────────
  const carnetSan = await prisma.carnetSanitaire.findUnique({
    where: { etablissementId: id },
    include: {
      pointsReleve: {
        where: { actif: true },
        include: {
          // `select` et non `include` : `ReleveTemperature.operateur` est un
          // champ de texte libre où l'exploitant écrit qui a relevé, et ce ZIP
          // est remis « à un inspecteur, un assureur, un bailleur ou un
          // acquéreur ». Aucun texte n'exige ce nom : l'article 3 de l'arrêté
          // du 1er février 2010 demande de consigner « les modalités et les
          // résultats » de la surveillance dans un fichier sanitaire tenu à
          // disposition de l'ARS — pas l'identité de qui relève, et pas pour
          // ces destinataires-là. `D. 4711-2`, qui exige l'identité du
          // vérificateur, ne vise que la santé-sécurité AU TRAVAIL ; un relevé
          // d'eau chaude sanitaire relève du code de la santé publique.
          //
          // La retenue est dans la requête et non dans le formateur : ce qui
          // n'est pas lu ne peut pas ressortir par une colonne qu'on
          // ajouterait plus tard.
          //
          // Ce ZIP en était le seul lecteur, et le retirer d'ici a d'abord
          // laissé un champ que le formulaire demande, que le zod valide, que
          // la base garde, et que plus rien ne lisait — une donnée sans
          // finalité, qui tient plus mal sous la minimisation que l'usage
          // interne auquel elle était destinée. Le champ s'affiche donc
          // désormais sur la carte du point de relevé
          // (`carnet-sanitaire/page.tsx`), où l'exploitant sait à qui
          // demander quand une mesure surprend. Il ne ressort pas de
          // l'établissement pour autant : la retenue posée ici tient
          // (docs/rgpd.md § 2.5).
          releves: {
            orderBy: { dateReleve: "desc" },
            take: 10,
            select: {
              dateReleve: true,
              temperatureCelsius: true,
              conforme: true,
            },
          },
        },
      },
      analyses: { orderBy: { dateAnalyse: "desc" }, take: 5 },
    },
  });
  if (carnetSan && (carnetSan.pointsReleve.length > 0 || carnetSan.analyses.length > 0)) {
    const txt = [
      `CARNET SANITAIRE EAU`,
      `Arrêté du 1er février 2010 · art. R. 1321-23 CSP.`,
      "",
      `Points de relevé actifs : ${carnetSan.pointsReleve.length}`,
      "────────────────────────────────────────────────────────────",
      ...carnetSan.pointsReleve.flatMap((pt) => [
        `${pt.nom}${pt.localisation ? ` — ${pt.localisation}` : ""}`,
        `  Type : ${pt.typeReseau} · seuil ${pt.typeReseau === "EFS" ? "max" : "min"} ${pt.seuilMinCelsius}°C`,
        `  10 derniers relevés :`,
        ...pt.releves.map(
          (r) =>
            `    ${formaterDateFr(r.dateReleve)} · ${r.temperatureCelsius.toFixed(1)}°C · ${r.conforme ? "CONFORME" : "NON CONFORME"}`,
        ),
        "",
      ]),
      "",
      `Analyses légionelles récentes (${carnetSan.analyses.length}) :`,
      "────────────────────────────────────────────────────────────",
      ...carnetSan.analyses.flatMap((a) => [
        `  ${formaterDateFr(a.dateAnalyse)} · ${a.valeurUfcParL ?? "—"} UFC/L · ${a.conforme ? "CONFORME (<1000 UFC/L)" : "ACTION REQUISE"}${a.laboratoire ? ` · ${a.laboratoire}` : ""}`,
        a.commentaire ? `    ${a.commentaire}` : "",
      ]),
      "",
    ]
      .filter((l) => l !== "")
      .join("\n");
    zip.file("08_Carnet_sanitaire.txt", txt);
  }

  // ── 00 README ───────────────────────────────────────────────────────
  const readme = genererReadme({
    raisonSociale: etablissement.entreprise.raisonSociale,
    etablissement: etablissement.raisonDisplay,
    adresse: etablissement.adresse,
    dateNow,
    duerpNumeroVersion,
    aDuerpPdf: duerpNumeroVersion !== null,
    aRegistreAccessibilite: Boolean(registreAccess?.publie),
    nbPrestataires: prestataires.length,
    nbPermisFeu: permisFeuList.length,
    nbPlansPrevention: plansList.length,
    aCarnetSanitaire: Boolean(
      carnetSan && (carnetSan.pointsReleve.length > 0 || carnetSan.analyses.length > 0),
    ),
    nbEcheancesContractuelles: echeancesContractuelles.size,
  });
  zip.file("00_README.txt", readme);

  // ── Génération ──────────────────────────────────────────────────────
  const buffer = await zip.generateAsync({ type: "uint8array" });
  const filename = `Dossier_controle_${slugifyFilename(etablissement.raisonDisplay)}_${cleJourCivil(maintenant)}.zip`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

function genererReadme(args: {
  raisonSociale: string;
  etablissement: string;
  adresse: string;
  dateNow: string;
  duerpNumeroVersion: number | null;
  aDuerpPdf: boolean;
  aRegistreAccessibilite: boolean;
  nbPrestataires: number;
  nbPermisFeu: number;
  nbPlansPrevention: number;
  aCarnetSanitaire: boolean;
  /** Échéances nées d'une demande d'assureur et imprimées dans ce dossier
   *  (ADR-032). Zéro = rien à annoncer, et rien n'est écrit. */
  nbEcheancesContractuelles: number;
}): string {
  const lignes: string[] = [];
  lignes.push(
    `DOSSIER DE CONFORMITÉ — ${args.raisonSociale}`,
    `Établissement : ${args.etablissement}`,
    `Adresse : ${args.adresse}`,
    `Généré le : ${args.dateNow}`,
    "",
    "────────────────────────────────────────────────────────────",
    " CONTENU DU DOSSIER",
    "────────────────────────────────────────────────────────────",
    "",
    " 01_Dossier_conformite.pdf     Synthèse globale (à présenter en premier)",
    args.aDuerpPdf
      ? ` 02_DUERP_v${args.duerpNumeroVersion}.pdf           Document unique d'évaluation des risques`
      : " 02_DUERP.pdf                  Non inclus (aucune version validée)",
    " 03_Registre_securite.pdf      Rapports de vérifications périodiques",
    " 04_Plan_actions.pdf           Écarts ouverts priorisés",
    args.aRegistreAccessibilite
      ? " 05_Accessibilite_URL.txt      URL publique du registre d'accessibilité"
      : " 05_Accessibilite_URL.txt      Non inclus (registre non publié)",
    args.nbPermisFeu > 0
      ? ` 06_Permis_de_feu.txt          ${args.nbPermisFeu} permis sur 12 mois (INRS ED 6030)`
      : " 06_Permis_de_feu.txt          Aucun permis émis sur 12 mois",
    args.nbPlansPrevention > 0
      ? ` 07_Plans_de_prevention.txt    ${args.nbPlansPrevention} plan(s) (art. R. 4512-6 CT)`
      : " 07_Plans_de_prevention.txt    Aucun plan actif",
    args.aCarnetSanitaire
      ? " 08_Carnet_sanitaire.txt       Relevés ECS + analyses légionelles (arrêté 01-02-2010)"
      : " 08_Carnet_sanitaire.txt       Non configuré",
    args.nbPrestataires > 0
      ? ` Prestataires/                 Attestations URSSAF, RC Pro, Kbis (${args.nbPrestataires})`
      : " Prestataires/                 Aucun prestataire déclaré",
    "",
    "────────────────────────────────────────────────────────────",
    " CHECKLIST AVANT LE CONTRÔLE",
    "────────────────────────────────────────────────────────────",
    "",
    " [ ] Dossier de conformité lu en entier (10 min)",
    " [ ] DUERP à jour depuis moins de 12 mois",
    " [ ] Tous les rapports de vérification 12 derniers mois présents",
    " [ ] Plan d'actions : tous écarts majeurs ont une date d'échéance",
    " [ ] Attestations URSSAF prestataires < 6 mois",
    " [ ] Registre d'accessibilité affiché (ERP) — QR code en entrée",
    " [ ] Formation sécurité du personnel à jour",
    " [ ] Permis de feu signés avant tout travail par point chaud",
    " [ ] Plans de prévention signés avant toute intervention EE ≥ 400 h",
    " [ ] Carnet sanitaire renseigné (si ECS) — relevés hebdo",
    "",
    "────────────────────────────────────────────────────────────",
    " CADRE LÉGAL DES OBLIGATIONS",
    "────────────────────────────────────────────────────────────",
    "",
    " DUERP :                    art. R. 4121-1 à R. 4121-4 Code du travail",
    " Vérifications :            art. R. 4226-16 et s. Code du travail",
    " Registre de sécurité :     art. L. 4711-5 Code du travail",
    " Accessibilité ERP :        art. R. 164-6 CCH · arrêté 19-04-2017",
    " Vigilance donneur d'ordre : art. L. 8222-1 Code du travail",
    " Permis de feu :            art. R. 4224-17 Code du travail",
    " Plan de prévention :       art. R. 4512-6 à R. 4512-12 CT",
    " Carnet sanitaire eau :     arrêté 01-02-2010 · art. R. 1321-23 CSP",
    " Maintien en conformité :   art. R. 4224-17 Code du travail",
    "",
    // APSAD R43 et l'INRS ED 6030 figuraient dans la liste ci-dessus, entre
    // deux articles de code, sous le titre « CADRE LÉGAL ». Ce document est
    // remis à un inspecteur, un assureur, un bailleur ou un acquéreur : y
    // présenter une règle de la profession de l'assurance comme du droit est
    // une affirmation que le produit ne peut pas soutenir. Les deux
    // référentiels restent nommés — ils fondent réellement la pratique — mais
    // sous leur propre titre, et en disant ce qu'ils opposent.
    "────────────────────────────────────────────────────────────",
    " RÉFÉRENTIELS NON OPPOSABLES CITÉS DANS CE DOSSIER",
    "────────────────────────────────────────────────────────────",
    "",
    " INRS ED 6030 :             recommandation de l'Institut national de",
    "                            recherche et de sécurité. Bonne pratique",
    "                            reconnue, sans valeur réglementaire propre.",
    " Règle APSAD R43 :          référentiel de la profession de l'assurance",
    "                            (travaux par points chauds). Opposable par",
    "                            votre contrat d'assurance, pas par le droit.",
    "",
  );
  // Le même titre que ci-dessus vaudrait pour ces lignes, mais elles ne sont
  // pas de même nature : un référentiel privé est cité, une échéance
  // contractuelle est PLANIFIÉE et figure dans les tableaux. Le lecteur du
  // dossier doit savoir que certaines des lignes qu'il vient de lire
  // n'engagent pas l'employeur devant l'administration (ADR-032).
  //
  // Rien n'est écrit quand il n'y en a pas : une mention rassurante sur un
  // dossier qui n'en contient aucune apprendrait au lecteur une distinction
  // dont il n'a que faire, et ferait chercher ce qui n'existe pas.
  if (args.nbEcheancesContractuelles > 0) {
    const n = args.nbEcheancesContractuelles;
    lignes.push(
      "────────────────────────────────────────────────────────────",
      " ÉCHÉANCES CONTRACTUELLES FIGURANT DANS CE DOSSIER",
      "────────────────────────────────────────────────────────────",
      "",
      ` ${n} échéance${n > 1 ? "s" : ""} de ce dossier ${n > 1 ? "naissent" : "naît"} d'une demande de`,
      " votre assureur, et non d'un texte. Chacune porte la mention",
      ` « ${MARQUAGE_CONTRACTUEL} »`,
      " là où elle apparaît. Elles sont opposables par votre contrat",
      " d'assurance, pas par le droit, et aucune référence légale ne leur",
      " est attachée.",
      "",
    );
  }
  lignes.push(
    "────────────────────────────────────────────────────────────",
    "",
    "Document généré automatiquement par Rojer.",
    "Ne remplace pas un conseil juridique. Responsabilité finale : employeur.",
    "",
  );
  return lignes.join("\n");
}
