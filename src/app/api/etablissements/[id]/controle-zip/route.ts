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
import { annoncesZip } from "@/lib/plan-prevention/annonces-plan";
import { lignesR4512_12Zip } from "@/lib/plan-prevention/annonces-zip";
import { nomDossierArchive, nomEntreeArchive } from "@/lib/storage/noms";
import type { DuerpSnapshot } from "@/lib/versions/snapshot";
import {
  fraicheurCalendrier,
  phraseFraicheur,
} from "@/lib/calendrier/fraicheur";
import { evaluerEtatDuerp } from "@/lib/dashboard/duerp";
import {
  faitInventaire,
  type ManqueCouverture,
} from "@/lib/perimetre/couverture";
import { genererReadme } from "@/lib/pdf/readme-controle";

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

  // LA FRAÎCHEUR SE LIT AVANT TOUT LE RESTE, et elle ne répare rien.
  // Ce dossier part chez un tiers qui n'a aucun moyen de recouper ce
  // qu'il lit : s'il est bâti sur un calendrier jamais calculé, ses
  // sections d'échéances seront vides, et un vide se lit comme « rien à
  // signaler ». On le dit, en tête du README. Lecture seule : une route
  // d'export n'écrit pas, et `regeneration-sure.ts` réserve la
  // réparation aux deux pages d'entrée.
  const fraicheur = await fraicheurCalendrier(id);

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

  // DEUX FAITS QUI PEUVENT ÊTRE INCONNUS, ET QUI DOIVENT LE DIRE.
  //
  // `null` n'est pas `0`, et c'est toute la correction. La première rédaction
  // initialisait le compteur de retards à `0` HORS du `try` : une brique en
  // échec, un dossier introuvable ou un calendrier jamais calculé laissaient
  // donc « [x] Aucune vérification en retard à ce jour » dans le document
  // remis à l'inspecteur. C'est exactement le faux vert que `etat-affiche.ts`
  // a été écrit pour fermer, le même jour — « un comptage n'a de sens que sur
  // un ensemble qu'on sait complet » — et ce README ne l'appelait pas.
  let etatDuerp: ReturnType<typeof evaluerEtatDuerp> | null = null;
  let nbVerifsEnRetard: number | null = null;
  // Le fait « aucun équipement déclaré » (§ 15), lu dans la couverture que le
  // dossier de conformité vient de calculer — pas recalculé : le README et le
  // PDF qu'il présente disent la même chose. `null` si la brique échoue, et le
  // README se tait alors : il n'affirme pas un inventaire qu'il n'a pas lu.
  let inventaire: ManqueCouverture | null = null;

  // ── 01 Dossier de conformité ────────────────────────────────────────
  try {
    const data = await construireDossierConformiteData(id);
    if (data) {
      for (const v of data.verifsEnRetard) {
        if (v.contractuelle) echeancesContractuelles.add(v.id);
      }
      nbVerifsEnRetard = data.verifsEnRetard.length;
      inventaire = data.couverture ? faitInventaire(data.couverture) : null;
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
      // du DUERP. (~~« la traçabilité exigée par l'art. R. 4121-2 »~~ :
      // l'article n'exige aucune traçabilité — rayé le 2026-09-26.)
      const historique = versions.map((v) => ({
        numero: v.numero,
        genereLe: v.createdAt.toISOString(),
        motif: v.motif,
      }));
      // LES FAITS AVANT LE RENDU, qui peut jeter. Affectés après, une panne
      // de `renderToBuffer` laissait `duerpNumeroVersion` à `null` et la
      // checklist imprimait « aucune version figée — à créer avant le
      // contrôle » alors qu'une version existait. Le `catch` promettait que
      // « le README dira que le DUERP n'est pas inclus » : vrai du sommaire,
      // faux de cette injonction.
      duerpNumeroVersion = versionCourante.numero;
      // LA RÈGLE DE MISE À JOUR NE SE RÉÉCRIT PAS ICI. `builders.ts` l'écrit :
      // le seuil d'effectif de R. 4121-2 « vit dans `evaluerEtatDuerp` et
      // NULLE PART AILLEURS ». La première rédaction comparait à douze mois
      // SANS l'effectif — un restaurant de six salariés se voyait imputer un
      // manquement que le texte réserve aux entreprises d'au moins onze
      // salariés, dans le ZIP même dont le PDF applique la bonne règle.
      etatDuerp = evaluerEtatDuerp(
        {
          ouvert: true,
          dateDerniereVersion: versionCourante.createdAt,
          effectif: etablissement.entreprise.effectif,
        },
        maintenant,
      );
      const buf = await renderToBuffer(
        DuerpDocument({
          snapshot: versionCourante.snapshot as unknown as DuerpSnapshot,
          historique,
        }),
      );
      zip.file(`02_DUERP_v${versionCourante.numero}.pdf`, new Uint8Array(buf));
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
      // R. 4512-9 et R. 4512-11 valent pour tout plan, et ce fichier n'en
      // porte aucune pièce : le lecteur doit l'apprendre ici plutôt que de
      // conclure, d'un silence, que l'obligation n'existe pas.
      ...annoncesZip.enTete(),
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
        // R. 4512-12, sous sa propre condition — écrit obligatoire au sens de
        // R. 4512-7 — ou quand la durée manque et que Rojer ne peut pas dire
        // qu'il ne l'est pas. Le même diagnostic que la fiche, appelé dans le
        // module : la route passe le plan, elle ne décide rien.
        ...lignesR4512_12Zip(p),
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
      // ~~« · art. R. 1321-23 CSP »~~ — retiré ici aussi le 2026-09-20. La
      // correction avait été faite au README du même ZIP et PAS dans ce
      // fichier-ci : deux pièces du même dossier citaient des fondements
      // différents pour la même chose. Le destinataire de R. 1321-23 est
      // l'exploitant du réseau PUBLIC, pas l'établissement raccordé.
      `Arrêté du 1er février 2010.`,
      "",
      `Points de relevé actifs : ${carnetSan.pointsReleve.length}`,
      "────────────────────────────────────────────────────────────",
      ...carnetSan.pointsReleve.flatMap((pt) => [
        `${pt.nom}${pt.localisation ? ` — ${pt.localisation}` : ""}`,
        `  Type : ${pt.typeReseau} · seuil ${pt.typeReseau === "EFS" ? "max" : "min"} ${pt.seuilMinCelsius}°C`,
        `  10 derniers relevés :`,
        ...pt.releves.map(
          (r) =>
            `    ${formaterDateFr(r.dateReleve)} · ${r.temperatureCelsius.toFixed(1)}°C · ${r.conforme ? "au seuil du point" : "HORS du seuil du point"}`,
        ),
        "",
      ]),
      "",
      `Analyses légionelles récentes (${carnetSan.analyses.length}) :`,
      "────────────────────────────────────────────────────────────",
      ...carnetSan.analyses.flatMap((a) => [
        `  ${formaterDateFr(a.dateAnalyse)} · ${a.valeurUfcParL ?? "—"} UFC/L · ${a.conforme ? "sous la limite de qualité (< 1 000 UFC/L)" : "LIMITE DE QUALITÉ ATTEINTE (≥ 1 000 UFC/L)"}${a.laboratoire ? ` · ${a.laboratoire}` : ""}`,
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
    etatDuerp,
    nbVerifsEnRetard,
    avertissementCalendrier: phraseFraicheur(fraicheur),
    inventaire,
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
