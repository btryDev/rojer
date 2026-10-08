import { renderToBuffer } from "@react-pdf/renderer";
import { mesureParId, surListeAnterieure } from "@/lib/permis-feu/referentiel";
import { dureeHhMm } from "@/lib/permis-feu/duree";
import JSZip from "jszip";
import { NextResponse } from "next/server";
import { requireEtablissement } from "@/lib/auth/scope";
import { prisma } from "@/lib/prisma";
import { getStorage, type FileStorage } from "@/lib/storage";
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
import {
  ligneInspectionZip,
  lignesR4512_12Zip,
} from "@/lib/plan-prevention/annonces-zip";
import { nomDossierArchive, nomEntreeArchive } from "@/lib/storage/noms";
import { joindreFichiers, zipEnFlux } from "@/lib/controle/fichiers-zip";

/**
 * Durée maximale de la fonction : lire les pièces, rendre quatre PDF et
 * streamer l'archive. 300 s, le maximum du plan Hobby et le défaut du Pro
 * (documentation Vercel « Functions limits », relue le 2026-09-27).
 */
export const maxDuration = 300;
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
import {
  genererReadme,
  ligneDatesAttestation,
  type DatesAttestation,
} from "@/lib/pdf/readme-controle";
import { attestationUrssafPresente } from "@/lib/prestataires/vigilance";
import { resultatAnalyse } from "@/lib/carnet-sanitaire/schema";

/** Les dates de l'attestation d'un prestataire, telles que le ZIP les écrit. */
function datesAttestationZip(p: {
  raisonSociale: string;
  attestationUrssafCle: string | null;
  attestationUrssafValableJusquA: Date | null;
  attestationUrssafRemiseLe: Date | null;
  attestationUrssafEmiseLe: Date | null;
}): DatesAttestation {
  return {
    raisonSociale: p.raisonSociale,
    presente: attestationUrssafPresente(p),
    remiseLe: p.attestationUrssafRemiseLe ? formaterDateFr(p.attestationUrssafRemiseLe) : null,
    emiseLe: p.attestationUrssafEmiseLe ? formaterDateFr(p.attestationUrssafEmiseLe) : null,
  };
}

/**
 * Assemble en un ZIP **tous** les documents qu'un inspecteur, un assureur,
 * un bailleur ou un acquéreur pourrait demander à voir. C'est le livrable
 * « panic button » du dirigeant : 1 clic, 1 ZIP, dossier présentable.
 *
 * Contenu :
 *   00_README.txt                — sommaire, checklist pré-contrôle, astuces
 *   01_Dossier_conformite.pdf    — synthèse globale (existant)
 *   02_DUERP.pdf                 — dernière version figée si présente
 *   03_Registre_securite.pdf     — rapports de vérif + signatures (existant)
 *   04_Plan_actions.pdf          — écarts ouverts priorisés (existant)
 *   05_Accessibilite_URL.txt     — URL publique du registre (si publié)
 *   Prestataires/                — attestations URSSAF, RC Pro, Kbis
 *   Rapports/                    — fichiers des rapports de vérification déposés
 *   06, 07, 08                   — permis de feu, plans de prévention, carnet sanitaire
 *   08_Carnet_sanitaire_analyses/ — rapports de laboratoire déposés
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
  // ADR-039 : même collecte pour les rythmes retenus, par identifiant de ligne.
  const rythmesRetenus = new Map<string, string>();
  // C64 : les visites de la commission de sécurité, « pour information ».
  const visitesPourInformation = new Set<string>();

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

  // CE QUI ÉCHOUE SE DIT (relecture du 2026-09-26). Les `catch {}` sautaient
  // une brique en silence, et le README annonçait ses fichiers sans condition
  // — `02_DUERP_vN.pdf` même quand son rendu avait échoué. Chaque échec est
  // noté ici, par le nom du fichier qu'il prive, et le README ne décrit que ce
  // que le ZIP contient vraiment (`zip.files`).
  const echecs = new Map<string, string>();
  const noterEchec = (fichier: string, e: unknown, raison = "la génération a échoué") => {
    echecs.set(fichier, raison);
    console.error(`controle-zip : ${fichier} non inclus`, e);
  };
  let piecesPrestatairesManquantes = 0;
  // Les pièces de prestataires réellement mises au ZIP, par type : le README
  // ne nomme que les types présents (contre-lecture du 2026-09-26).
  const piecesPrestataires = { attestation: 0, rcPro: 0, kbis: 0 };
  // Une LECTURE en panne pour 05 à 08 et les prestataires donnait une
  // réponse 500 : tout le dossier tombait pour une brique. Elle se note
  // comme les autres échecs, et la brique est dite « Non incluse ».
  const lire = async <T,>(fichier: string, repli: T, f: () => Promise<T>): Promise<T> => {
    try {
      return await f();
    } catch (e) {
      noterEchec(fichier, e, "la lecture a échoué");
      return repli;
    }
  };

  // Le stockage, demandé une fois et à la première pièce : un stockage non
  // configuré ne fait pas échouer l'archive — les pièces sont comptées
  // manquantes et le README le dit (`lot/stockage-supabase`, puis
  // `lot/relire-fichiers-deposes` pour les rapports et les analyses).
  let stockageLu: FileStorage | null | undefined;
  const stockage = (): FileStorage | null => {
    if (stockageLu === undefined) {
      try {
        stockageLu = getStorage();
      } catch (e) {
        console.error("controle-zip : stockage indisponible", e);
        stockageLu = null;
      }
    }
    return stockageLu;
  };

  // ── 01 Dossier de conformité ────────────────────────────────────────
  try {
    const data = await construireDossierConformiteData(id);
    if (data) {
      for (const v of data.verifsEnRetard) {
        if (v.contractuelle) echeancesContractuelles.add(v.id);
        if (v.rythmeRetenu) rythmesRetenus.set(v.id, v.rythmeRetenu);
      }
      nbVerifsEnRetard = data.verifsEnRetard.length;
      inventaire = data.couverture ? faitInventaire(data.couverture) : null;
      const buf = await renderToBuffer(DossierConformiteDocument({ data }));
      zip.file("01_Dossier_conformite.pdf", new Uint8Array(buf));
    }
  } catch (e) {
    // On continue même si une brique échoue — et on le dit.
    noterEchec("01_Dossier_conformite.pdf", e);
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
  // `false` tant que la lecture des versions n'a pas abouti : une lecture en
  // échec n'est pas « aucune version validée ».
  let duerpLu = false;
  try {
    const versions = await prisma.duerpVersion.findMany({
      where: { duerp: { etablissementId: id } },
      orderBy: { numero: "desc" },
      select: { numero: true, snapshot: true, motif: true, createdAt: true },
    });
    duerpLu = true;
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
          effectifs: {
            entreprise: etablissement.entreprise.effectif,
            site: etablissement.effectifSurSite,
          },
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
  } catch (e) {
    // On continue même si une brique échoue : le README dira que le DUERP
    // n'est pas inclus, et pourquoi, plutôt que de faire échouer le dossier.
    // ~~Toujours « la génération a échoué »~~ : une panne de LECTURE n'est pas
    // une panne de rendu, et la checklist disait déjà « lecture » (contre-
    // lecture du 2026-09-26).
    noterEchec("02_DUERP", e, duerpLu ? "la génération a échoué" : "lecture des versions en échec");
  }

  // ── 03 Registre de sécurité ─────────────────────────────────────────
  try {
    const data = await construireRegistreData(id);
    if (data) {
      for (const v of data.verifsEnAttente) {
        if (v.contractuelle) echeancesContractuelles.add(v.id);
        if (v.rythmeRetenu) rythmesRetenus.set(v.id, v.rythmeRetenu);
        if (v.pourInformation) visitesPourInformation.add(v.id);
      }
      const buf = await renderToBuffer(RegistreDocument({ data }));
      zip.file("03_Registre_securite.pdf", new Uint8Array(buf));
    }
  } catch (e) {
    noterEchec("03_Registre_securite.pdf", e);
  }

  // ── 04 Plan d'actions ───────────────────────────────────────────────
  try {
    const data = await construirePlanActionsData(id);
    if (data) {
      const buf = await renderToBuffer(PlanActionsDocument({ data }));
      zip.file("04_Plan_actions.pdf", new Uint8Array(buf));
    }
  } catch (e) {
    noterEchec("04_Plan_actions.pdf", e);
  }

  // ── 05 Accessibilité (URL publique + QR si publié) ──────────────────
  const registreAccess = await lire("05_Accessibilite_URL.txt", null, () =>
    prisma.registreAccessibilite.findUnique({
    where: { etablissementId: id },
    select: { slugPublic: true, publie: true },
  }));
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
  const prestataires = await lire("Prestataires/", [], () =>
    prisma.prestataire.findMany({
    where: { etablissementId: id },
    orderBy: { raisonSociale: "asc" },
  }));
  if (prestataires.length > 0) {
    const dossierPrestataires = zip.folder("Prestataires") ?? zip;
    // Stockage partagé, lu à la première pièce (`stockage()`, plus haut).
    const storage = stockage();
    for (const p of prestataires) {
      const safeDir = nomDossierArchive(p.raisonSociale, "Prestataire");
      const sousDossier = dossierPrestataires.folder(safeDir) ?? dossierPrestataires;
      // Les dates de l'attestation de vigilance, à côté de la pièce : la
      // date quand elle existe, « non renseignée » sinon (C43). Pas de
      // fichier pour un prestataire sans attestation au dossier : il ne
      // dirait rien d'une pièce qui n'y est pas.
      const dates = datesAttestationZip(p);
      if (dates.presente) {
        sousDossier.file(
          "Dates_attestation_vigilance.txt",
          `Attestation URSSAF (art. D. 8222-5) — ${ligneDatesAttestation(dates)}\n`,
        );
      }
      // Le nom d'origine de la pièce vient du poste du prestataire : il est
      // conservé en base pour l'affichage, il ne devient un nom d'entrée
      // d'archive qu'assaini. L'export est fait pour être décompressé chez
      // un tiers.
      for (const [cle, nom, type] of [
        [p.attestationUrssafCle, nomEntreeArchive(p.attestationUrssafNom, "URSSAF.pdf"), "attestation"],
        [p.assuranceRcProCle, nomEntreeArchive(p.assuranceRcProNom, "RC_Pro.pdf"), "rcPro"],
        [p.kbisCle, nomEntreeArchive(p.kbisNom, "Kbis.pdf"), "kbis"],
      ] as const) {
        if (!cle) continue;
        try {
          if (!storage) throw new Error("stockage indisponible");
          const buf = await storage.get(cle);
          sousDossier.file(nom, new Uint8Array(buf));
          piecesPrestataires[type]++;
        } catch (e) {
          // Une pièce déclarée que le stockage ne rend pas : comptée, et
          // annoncée par le README au lieu d'être ignorée.
          piecesPrestatairesManquantes++;
          console.error(`controle-zip : pièce prestataire non récupérée (${nom})`, e);
        }
      }
    }
  }

  // ── Rapports/ — les fichiers des rapports de vérification déposés ────
  // Le registre (03) n'en porte que l'index ; le tiers qui reçoit ce ZIP
  // n'a pas accès à l'application (`controle/fichiers-zip.ts`, 2026-09-27).
  const rapportsDeposes = await lire("Rapports/", [], () =>
    prisma.rapportVerification.findMany({
      // PAS LES RAPPORTS DES LIGNES DE SALARIÉ (contre-lecture du 2026-09-27,
      // M1). Depuis `bb03cdd` aucun dépôt n'y est possible, mais des rapports
      // antérieurs peuvent exister : documents nominatifs, parfois médicaux,
      // dans un ZIP remis à un tiers. Ils n'y entrent pas ; le README le dit.
      where: { etablissementId: id, verification: { salarieId: null } },
      // Pas d'`orderBy` : l'ordre des rapports vit dans
      // `ORDRE_RAPPORT_PLUS_RECENT` (garde de `derniere-realisation.test.ts`),
      // et les entrées portent leur date en tête de nom — l'archive les range.
      select: {
        id: true,
        fichierCle: true,
        fichierNomOriginal: true,
        dateRapport: true,
        verification: {
          select: { libelleObligation: true, equipement: { select: { libelle: true } } },
        },
      },
    }),
  );
  // Combien sont écartés, pour le dire. Un comptage en échec ne prive pas
  // Rapports/ (ce n'est pas `lire`) : le README dit alors la règle sans nombre.
  let rapportsSalariesEcartes: number | null;
  try {
    rapportsSalariesEcartes = await prisma.rapportVerification.count({
      where: { etablissementId: id, verification: { salarieId: { not: null } } },
    });
  } catch (e) {
    console.error("controle-zip : comptage des rapports de salarié en échec", e);
    rapportsSalariesEcartes = null;
  }
  const rapportsZip = await joindreFichiers(
    zip,
    "Rapports",
    rapportsDeposes.map((r) => ({
      id: r.id,
      cle: r.fichierCle,
      nomOriginal: r.fichierNomOriginal,
      date: r.dateRapport,
      etiquette: r.verification.equipement?.libelle ?? r.verification.libelleObligation,
    })),
    rapportsDeposes.length > 0 ? stockage() : null,
    "rapport.pdf",
  );

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
  const permisFeuList = await lire("06_Permis_de_feu.txt", [], () =>
    prisma.permisFeu.findMany({
    where: {
      etablissementId: id,
      dateDebut: { gte: ilYaUnAn },
      statut: { notIn: ["brouillon", "annule"] },
    },
    orderBy: { numero: "desc" },
  }));
  if (permisFeuList.length > 0) {
    const txt = [
      `PERMIS DE FEU — 12 derniers mois (${permisFeuList.length})`,
      // ~~« règle APSAD R43 »~~ — rayé le 2026-09-26 : `permis-feu/referentiel.ts`
      // ne tient plus rien d'APSAD, qui n'a jamais été lue.
      `Mesures tirées de la brochure INRS ED 6030 (2e édition, août 2019) — ni article de code, ni arrêté.`,
      // Pas pour un permis établi sur une liste antérieure, dont les
      // mesures ne viennent pas toutes de la brochure (contre-lecture du
      // 2026-09-26) : la ligne de chaque permis le dit.
      `Un permis établi sur une liste antérieure porte les libellés de celle-ci, qui ne viennent pas tous de la brochure.`,
      "",
      "────────────────────────────────────────────────────────────",
      ...permisFeuList.flatMap((p) => [
        `PF-${String(p.numero).padStart(3, "0")} · ${p.statut.toUpperCase()}`,
        `  Prestataire : ${p.prestataireRaison} (${p.prestataireContact})`,
        `  Lieu : ${p.lieu}`,
        `  Période : ${formaterDateHeureFr(p.dateDebut)} → ${formaterDateHeureFr(p.dateFin)}`,
        `  Surveillance : ${dureeHhMm(p.dureeSurveillanceMinutes)}`,
        `  Travaux : ${p.naturesTravaux.join(", ")}`,
        `  Description : ${p.descriptionTravaux}`,
        // ~~« Mesures validées : N »~~ : le compte mêlait mesures courantes et
        // retirées, sans libellé. Chaque mesure est nommée, telle que le permis
        // la porte.
        `  Mesures cochées (${p.mesuresValidees.length}) :`,
        ...p.mesuresValidees.map((m) => `    - ${mesureParId(m)?.libelle ?? m}`),
        ...(surListeAnterieure(p.mesuresValidees, p.createdAt)
          ? ["    (établi sur une liste antérieure de mesures)"]
          : []),
        "",
      ]),
    ].join("\n");
    zip.file("06_Permis_de_feu.txt", txt);
  }

  // ── 07 Plans de prévention (actifs 12 derniers mois) ────────────────
  const plansList = await lire("07_Plans_de_prevention.txt", [], () =>
    prisma.planPrevention.findMany({
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
  }));
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
        // « date non renseignée », pas « NON RÉALISÉE » : Rojer ne tient
        // que la date (`ligneInspectionZip`).
        ligneInspectionZip(p.inspectionDate, formaterDateFr),
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
        ...lignesR4512_12Zip(p, formaterDateFr),
        "",
      ]),
    ].join("\n");
    zip.file("07_Plans_de_prevention.txt", txt);
  }

  // ── 08 Carnet sanitaire (résumé) ─────────────────────────────────────
  const carnetSan = await lire("08_Carnet_sanitaire.txt", null, () =>
    prisma.carnetSanitaire.findUnique({
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
  }));
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
        `  ${formaterDateFr(a.dateAnalyse)} · ${a.valeurUfcParL ?? "—"} UFC/L · ${{ sous_limite: "sous la limite de qualité (< 1 000 UFC/L)", limite_atteinte: "LIMITE DE QUALITÉ ATTEINTE (≥ 1 000 UFC/L)", sans_valeur: "valeur non saisie" }[resultatAnalyse(a.valeurUfcParL)]}${a.laboratoire ? ` · ${a.laboratoire}` : ""}`,
        a.commentaire ? `    ${a.commentaire}` : "",
      ]),
      "",
    ]
      .filter((l) => l !== "")
      .join("\n");
    zip.file("08_Carnet_sanitaire.txt", txt);
  }
  // Les rapports de laboratoire des analyses listées au 08, quand ils ont
  // été déposés : ils vont avec (2026-09-27).
  const analysesAvecRapport = (carnetSan?.analyses ?? []).filter(
    (a): a is typeof a & { rapportCle: string } => Boolean(a.rapportCle),
  );
  const analysesZip = await joindreFichiers(
    zip,
    "08_Carnet_sanitaire_analyses",
    analysesAvecRapport.map((a) => ({
      id: a.id,
      cle: a.rapportCle,
      nomOriginal: a.rapportNom,
      date: a.dateAnalyse,
      etiquette: a.laboratoire,
    })),
    analysesAvecRapport.length > 0 ? stockage() : null,
    "rapport-analyse.pdf",
  );

  // ── 00 README ───────────────────────────────────────────────────────
  const readme = genererReadme({
    raisonSociale: etablissement.entreprise.raisonSociale,
    etablissement: etablissement.raisonDisplay,
    adresse: etablissement.adresse,
    dateNow,
    duerpNumeroVersion,
    // ~~`duerpNumeroVersion !== null`~~ : une version existante dont le rendu
    // a échoué était annoncée présente.
    aDuerpPdf:
      duerpNumeroVersion !== null && `02_DUERP_v${duerpNumeroVersion}.pdf` in zip.files,
    presents: new Set(Object.keys(zip.files)),
    regime: { estERP: etablissement.estERP, estIGH: etablissement.estIGH },
    duerpLu,
    echecs,
    piecesPrestatairesManquantes,
    piecesPrestataires,
    rapportsZip,
    rapportsSalariesEcartes,
    analysesZip,
    aRegistreAccessibilite: Boolean(registreAccess?.publie),
    nbPrestataires: prestataires.length,
    datesAttestations: echecs.has("Prestataires/")
      ? []
      : prestataires.map(datesAttestationZip),
    nbPermisFeu: permisFeuList.length,
    nbPlansPrevention: plansList.length,
    aCarnetSanitaire: Boolean(
      carnetSan && (carnetSan.pointsReleve.length > 0 || carnetSan.analyses.length > 0),
    ),
    nbEcheancesContractuelles: echeancesContractuelles.size,
    rythmesRetenus,
    visitesPourInformation,
    etatDuerp,
    retards: {
      nbEnRetard: nbVerifsEnRetard,
      calendrier: fraicheur,
      inventaire,
    },
    avertissementCalendrier: phraseFraicheur(fraicheur),
    inventaire,
  });
  zip.file("00_README.txt", readme);

  // ── Génération ──────────────────────────────────────────────────────
  // En flux : au-delà de 4,5 Mo, une réponse d'un bloc est refusée par Vercel
  // (`zipEnFlux`). Sans Content-Length, par construction.
  const filename = `Dossier_controle_${slugifyFilename(etablissement.raisonDisplay)}_${cleJourCivil(maintenant)}.zip`;

  return new NextResponse(zipEnFlux(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
