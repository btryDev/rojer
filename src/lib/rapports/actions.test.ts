// Dépôt et retrait d'un rapport de vérification — server actions, sur le faux
// client Prisma du calendrier (`calendrier/faux-prisma.ts`) et le VRAI
// référentiel.
//
// DEPUIS LA BASCULE DE L'ADR-036 (lot 4, 2026-09-19), le dépôt et le retrait
// ne calculent plus de date eux-mêmes. ~~Le dépôt faisait « rouler » la ligne
// (`rouler`) et le retrait la faisait « reculer » en transmettant l'échéance
// honorée de rapport en rapport.~~ Les deux appellent `recalculerLigne`, qui
// rejoue la passe de régénération pour cette ligne : la date sort de
// `echeanceDeLigne`, sur les faits — le rapport qu'on vient d'écrire ou de
// retirer compris. Ce fichier tient trois choses :
//  · LES MÊMES RÈGLES qu'avant, là où elles tenaient : « non vérifiable » et
//    antidaté ne bougent rien, un rapport réalisé fait courir le rythme, un
//    ponctuel se solde ;
//  · LA CONFLUENCE : après un dépôt, puis après un retrait, l'état écrit,
//    repassé dans la réconciliation, rend la ligne « inchangée » — la
//    régénération qui suit ne peut pas la déplacer ;
//  · les PROTECTIONS de la transaction : verrou, écriture conditionnée,
//    annulation totale, frontière médicale, obligation éteinte.
//
// La régénération qui suit chaque action (`regenererApresMutation`) est
// bouchonnée : on éprouve ce que la TRANSACTION a écrit, pas ce qu'une passe
// ultérieure aurait réparé. C'est ce qui rend la confluence observable.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleJourCivil, depuisCleJourCivil } from "@/lib/dates";
import { estVerificationEnRetard } from "@/lib/dates/retard";
import { obligationParId } from "@/lib/referentiels/conformite";
import type { EquipementFaux, LigneFausse, RapportFaux } from "@/lib/calendrier/faux-prisma";
import { lireEntrees, planifier, type ClientLecture } from "@/lib/calendrier/passe";

const h = vi.hoisted(async () => {
  const { fauxPrisma, magasinVide } = await import("@/lib/calendrier/faux-prisma");
  const db = magasinVide();
  return {
    db,
    prisma: fauxPrisma(db),
    stockage: { fichiers: new Set<string>() },
    regenerer: vi.fn(async () => true),
  };
});

vi.mock("@/lib/prisma", async () => ({ prisma: (await h).prisma }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));
vi.mock("@/lib/auth/scope", () => ({
  assertEtablissementOwnership: vi.fn(async () => ({ id: "user-1" })),
}));
vi.mock("@/lib/calendrier/regeneration-sure", async () => ({
  regenererApresMutation: (await h).regenerer,
}));
vi.mock("@/lib/storage", async () => {
  const { stockage } = await h;
  return {
    getStorage: () => ({
      put: async (cle: string) => {
        stockage.fichiers.add(cle);
      },
      delete: async (cle: string) => {
        stockage.fichiers.delete(cle);
      },
    }),
    cleRapport: (etab: string, id: string, nom: string) => `rapports/${etab}/${id}-${nom}`,
  };
});

const { db, prisma, stockage, regenerer } = await h;
const client = prisma as unknown as ClientLecture;
const { supprimerRapport, uploadRapport } = await import("./actions");

const ETAB = "etab-1";
const d = (cle: string) => depuisCleJourCivil(cle);

/** Obligations RÉELLES du référentiel. */
const ELEC_ANNUELLE = "elec-travail-periodique-annuelle";
const ELEC_MISE_EN_SERVICE = "elec-travail-mise-en-service";
const PORTAIL_MAINTIEN = "porte-auto-maintien-en-etat";

/** L'origine du suivi des lignes de ces tests : le 15 janvier 2026. Sans autre
 *  fait, une ligne est « à planifier » à cette date — en retard depuis. */
const ORIGINE = d("2026-01-15");

function poserEtablissement(equipements: Partial<EquipementFaux>[] = [{ id: "eq-1" }]) {
  db.etablissements = [
    {
      id: ETAB,
      userId: "user-1",
      effectifSurSite: 5,
      estEtablissementTravail: true,
      estERP: false,
      estIGH: false,
      estHabitation: false,
      typeErp: null,
      categorieErp: null,
      classeIgh: null,
      familleHabitation: null,
      personnesPresentesHabituellement: null,
      manipuleMatieresR422722: null,
      comporteLocauxSommeilPublic: null,
      referentielVersionCalendrier: null,
      prescriptionsParticulieres: [],
      equipements: equipements.map((e) => ({
        libelle: `Équipement ${e.id}`,
        categorie: "INSTALLATION_ELECTRIQUE",
        caracteristiques: null,
        actif: true,
        dateMiseEnService: null,
        ...e,
      })) as EquipementFaux[],
    },
  ];
}

/** Une ligne alignée sur le référentiel — libellé, rythme, réalisateurs —,
 *  pour que la confluence ne parle que de la date et du statut. */
function poserLigne(partiel: Partial<LigneFausse> = {}): LigneFausse {
  const obligationId = partiel.obligationId ?? ELEC_ANNUELLE;
  const o = obligationParId(obligationId)!;
  const ligne: LigneFausse = {
    id: "v-1",
    etablissementId: ETAB,
    equipementId: "eq-1",
    salarieId: null,
    obligationId,
    libelleObligation: o.libelle,
    periodicite: o.periodicite,
    realisateurRequis: [...o.realisateurs],
    datePrevue: ORIGINE,
    statut: "a_planifier",
    prescriptionId: null,
    archiveLe: null,
    suiviDepuis: ORIGINE,
    rapports: [],
    nbRapports: 0,
    nbActions: 0,
    ...partiel,
  };
  ligne.nbRapports = partiel.nbRapports ?? ligne.rapports?.length ?? 0;
  db.verifications = [...db.verifications.filter((v) => v.id !== ligne.id), ligne];
  return ligne;
}

let horloge = 0;
function rapport(partiel: Partial<RapportFaux> & { id: string; dateRapport: Date }): RapportFaux {
  return {
    resultat: "conforme",
    echeanceHonoree: null,
    fichierCle: `rapports/${ETAB}/${partiel.id}-x.pdf`,
    // Croissant dans l'ordre de pose : deux rapports du même jour se
    // départagent comme en base.
    createdAt: new Date(2020, 0, 1, 0, 0, (horloge += 1)),
    ...partiel,
  };
}

function formulaire(resultat: string, dateRapport: string): FormData {
  const fd = new FormData();
  fd.set("dateRapport", dateRapport);
  fd.set("resultat", resultat);
  fd.set("organismeVerif", "");
  fd.set("commentaires", "");
  fd.set("fichier", new File([new Uint8Array([1, 2, 3])], "rapport.pdf", { type: "application/pdf" }));
  return fd;
}

/** La ligne telle que la base la porte MAINTENANT (la transaction peut avoir
 *  remplacé l'objet). */
const ligne = (id = "v-1") => db.verifications.find((v) => v.id === id)!;
const rapports = (id = "v-1") => ligne(id).rapports ?? [];
const deposer = (resultat: string, date: string, id = "v-1") =>
  uploadRapport(id, { status: "idle" }, formulaire(resultat, date));
const retirer = (rapportId: string) =>
  expect(supprimerRapport(rapportId)).rejects.toThrow("NEXT_REDIRECT");

function enRetard(id = "v-1"): boolean {
  const v = ligne(id);
  return estVerificationEnRetard({ ...v, archiveLe: v.archiveLe ?? null }, new Date());
}

/**
 * LA CONFLUENCE : ce que la régénération suivante déciderait pour la ligne.
 * Elle doit rendre la ligne « inchangée » sur sa date et son statut — sinon
 * deux chemins écrivent deux dates, l'état que l'ADR-036 existe pour quitter.
 */
async function decisionDeLaRegeneration(id = "v-1") {
  const plan = planifier(await lireEntrees(client, ETAB), new Date());
  return plan.aMettreAJour.find((m) => m.id === id);
}
async function attendreConfluence(id = "v-1") {
  expect(
    await decisionDeLaRegeneration(id),
    "la régénération déplacerait la ligne que le dépôt ou le retrait vient d'écrire",
  ).toBeUndefined();
}

beforeEach(() => {
  db.etablissements = [];
  db.salaries = [];
  db.titres = [];
  db.verifications = [];
  db.faireEchouer = null;
  db.apresLecture = null;
  db.journal = [];
  db.verrous = [];
  stockage.fichiers.clear();
  regenerer.mockClear();
  poserEtablissement();
  poserLigne();
});

// ---------------------------------------------------------------------------
// Le dépôt
// ---------------------------------------------------------------------------

describe("uploadRapport — résultat « non vérifiable »", () => {
  it("ne change aucun fait de date : la ligne reste où elle est, en retard", async () => {
    const res = await deposer("non_verifiable", "2026-06-01");

    expect(res.status).toBe("success");
    expect(ligne().datePrevue).toEqual(ORIGINE);
    expect(ligne().statut).toBe("a_planifier");
    expect(enRetard()).toBe(true);
    await attendreConfluence();
  });

  it("une vraie échéance « planifiée » le reste, et reste en retard", async () => {
    // Mise en service le 2025-06-01, suivie depuis le 2025-06-10 : la première
    // échéance, née pendant le suivi, est le 2026-06-01. Un déplacement sans
    // contrôle ne la transforme pas en date de génération.
    poserEtablissement([{ id: "eq-1", dateMiseEnService: d("2025-06-01") }]);
    poserLigne({ datePrevue: d("2026-06-01"), statut: "planifiee", suiviDepuis: d("2025-06-10") });

    await deposer("non_verifiable", "2026-08-01");

    expect(ligne().datePrevue).toEqual(d("2026-06-01"));
    expect(ligne().statut).toBe("planifiee");
    expect(enRetard()).toBe(true);
  });

  it("conserve le rapport et son fichier, sans échéance honorée", async () => {
    await deposer("non_verifiable", "2026-06-01");

    expect(rapports()).toHaveLength(1);
    expect(rapports()[0].resultat).toBe("non_verifiable");
    // Rien n'a été vérifié : ce rapport n'honore aucune échéance.
    expect(rapports()[0].echeanceHonoree).toBeNull();
    expect(stockage.fichiers.size).toBe(1);
  });
});

describe("uploadRapport — un rapport réalisé : la ligne se recalcule sur lui (ADR-036)", () => {
  it("le rapport garde l'échéance qu'il honorait (ADR-034 § 5)", async () => {
    await deposer("conforme", "2026-06-01");
    expect(rapports()[0].echeanceHonoree).toEqual(ORIGINE);
  });

  it("la ligne passe à l'échéance suivante, planifiée — et la régénération ne la déplace pas", async () => {
    await deposer("conforme", "2026-06-01");

    // Date du rapport + un an, et non l'ancienne échéance + un an : c'est
    // l'intervalle que le texte impose, il court depuis le contrôle.
    expect(ligne().datePrevue).toEqual(d("2027-06-01"));
    expect(ligne().statut).toBe("planifiee");
    expect(regenerer).toHaveBeenCalledWith(ETAB, "rapports/upload");
    await attendreConfluence();
  });

  it("la réalisation vit sur le rapport, en date civile — la ligne n'en porte plus", async () => {
    await deposer("conforme", "2026-06-01");
    // Minuit de Paris, pas minuit UTC (ADR-011).
    expect(rapports()[0].dateRapport).toEqual(d("2026-06-01"));
  });

  it("un résultat avec écart fait courir le rythme pareil : le résultat vit sur le rapport", async () => {
    await deposer("ecart_majeur", "2026-06-01");

    expect(rapports()[0].resultat).toBe("ecart_majeur");
    expect(ligne().statut).toBe("planifiee");
    expect(ligne().datePrevue).toEqual(d("2027-06-01"));
  });

  it("un rapport ANTIDATÉ entre au registre sans faire reculer la ligne", async () => {
    poserLigne({
      datePrevue: d("2027-06-01"),
      statut: "planifiee",
      rapports: [rapport({ id: "rap-2026", dateRapport: d("2026-06-01"), echeanceHonoree: ORIGINE })],
    });

    const res = await deposer("conforme", "2025-05-01");

    expect(res.status).toBe("success");
    expect(rapports()).toHaveLength(2);
    const antidate = rapports().find((r) => r.id !== "rap-2026")!;
    expect(antidate.echeanceHonoree).toBeNull();
    expect(ligne().datePrevue).toEqual(d("2027-06-01"));
    expect(ligne().statut).toBe("planifiee");
    await attendreConfluence();
  });

  it("un contrôle unique se SOLDE : statut du résultat, date de l'événement", async () => {
    // Mise en service le 2026-01-05, suivie depuis le 15 : le ponctuel est
    // daté de l'événement, « à planifier » (déjà passé à l'origine).
    poserEtablissement([{ id: "eq-1", dateMiseEnService: d("2026-01-05") }]);
    poserLigne({ obligationId: ELEC_MISE_EN_SERVICE, datePrevue: d("2026-01-05") });

    await deposer("conforme", "2026-06-01");

    expect(ligne().datePrevue).toEqual(d("2026-01-05"));
    expect(ligne().statut).toBe("realisee_conforme");
    expect(rapports()[0].echeanceHonoree).toEqual(d("2026-01-05"));
    await attendreConfluence();
  });

  it("un rythme `autre` sans titre se solde HORS de la fonction : statut du résultat, date inchangée (ADR-036 § 4)", async () => {
    // Le cas qui existe : une prescription donnait un rythme à une obligation
    // `autre` sur un portail, puis a été levée. La ligne reste — elle porte une
    // action —, sous un rythme sans rendez-vous, et on peut encore y déposer.
    poserEtablissement([{ id: "eq-portail", categorie: "PORTAIL_AUTO" }]);
    poserLigne({
      id: "v-portail",
      obligationId: PORTAIL_MAINTIEN,
      equipementId: "eq-portail",
      datePrevue: d("2021-03-01"),
      statut: "a_planifier",
      nbActions: 1,
    });

    const res = await deposer("conforme", "2026-06-01", "v-portail");

    expect(res.status).toBe("success");
    expect(ligne("v-portail").statut).toBe("realisee_conforme");
    expect(ligne("v-portail").datePrevue).toEqual(d("2021-03-01"));
    await attendreConfluence("v-portail");
  });

  it("verrouille la ligne AVANT de la relire", async () => {
    await deposer("conforme", "2026-06-01");
    expect(db.verrous.length).toBeGreaterThanOrEqual(1);
    expect(db.verrous[0]).toContain('FROM "Verification"');
    expect(db.verrous[0]).toContain("FOR UPDATE");
    // Le verrou précède la relecture de la ligne DANS la transaction — la
    // seconde `verification.findUnique`, la première étant le refus préalable.
    const ops = db.journal.map((j) => j.operation);
    const iVerrou = ops.indexOf("$queryRaw");
    const relectures = ops.flatMap((o, i) => (o === "verification.findUnique" ? [i] : []));
    expect(relectures.length).toBeGreaterThanOrEqual(2);
    expect(iVerrou).toBeGreaterThan(relectures[0]);
    expect(iVerrou).toBeLessThan(relectures[1]);
  });

  it("n'écrit rien si la ligne ne ressemble plus à ce que la lecture a vu : ni rapport, ni fichier", async () => {
    // L'écriture conditionnée de `recalculerLigne` ne prend pas : tout est
    // annulé — la transaction restaure le rapport déjà créé.
    db.faireEchouer = null;
    const verification = (prisma as { verification: { updateMany: unknown } }).verification;
    const original = verification.updateMany;
    verification.updateMany = () => Promise.resolve({ count: 0 });

    const res = await deposer("conforme", "2026-06-01");

    verification.updateMany = original;
    expect(res.status).toBe("error");
    expect(res.status === "error" && res.message).toMatch(/modifiée/);
    expect(rapports()).toEqual([]);
    expect(stockage.fichiers.size).toBe(0);
    expect(ligne().datePrevue).toEqual(ORIGINE);
  });

  it("n'écrit QUE la ligne visée, même quand le plan en déplacerait une autre", async () => {
    // `recalculerLigne` rejoue la passe entière : le plan peut vouloir
    // déplacer une ligne voisine désalignée. Ce n'est pas l'affaire du dépôt —
    // c'est celle de la régénération, avec son sceau et ses trois passes.
    poserEtablissement([{ id: "eq-1" }, { id: "eq-2" }]);
    poserLigne({ id: "v-2", equipementId: "eq-2", datePrevue: d("2030-01-01"), statut: "planifiee" });
    poserLigne({ datePrevue: d("2031-01-01"), statut: "planifiee" });
    db.journal = [];

    await deposer("conforme", "2026-06-01");

    expect(ligne().datePrevue).toEqual(d("2027-06-01"));
    expect(ligne("v-2").datePrevue).toEqual(d("2030-01-01"));
    expect(ligne("v-2").statut).toBe("planifiee");
    expect(db.journal.filter((j) => j.operation === "verification.updateMany")).toHaveLength(1);
  });

  it("l'écriture reste conditionnée à la date et au statut LUS : une ligne modifiée entre-temps annule tout", async () => {
    // Sans bouchon : la ligne change DANS le magasin juste après la lecture
    // de `recalculerLigne` (`apresLecture`), et c'est la condition de
    // l'`updateMany` qui doit la voir.
    db.apresLecture = () => {
      ligne().datePrevue = d("2029-01-01");
    };

    const res = await deposer("conforme", "2026-06-01");

    expect(res.status).toBe("error");
    expect(res.status === "error" && res.message).toMatch(/modifiée/);
    expect(rapports()).toEqual([]);
    expect(stockage.fichiers.size).toBe(0);
  });

  it("nettoie le fichier si la base refuse l'écriture", async () => {
    db.faireEchouer = (op) => op === "rapportVerification.create";

    await expect(deposer("conforme", "2026-06-01")).rejects.toThrow(/panne injectée/);
    expect(stockage.fichiers.size).toBe(0);
    expect(rapports()).toEqual([]);
  });
});

describe("uploadRapport — une obligation éteinte ne reçoit pas de rapport", () => {
  beforeEach(() => {
    poserLigne({ archiveLe: d("2026-02-01"), statut: "planifiee" });
  });

  it("refuse, avant tout stockage et toute écriture", async () => {
    const res = await deposer("conforme", "2026-06-01");
    expect(res.status === "error" && res.message).toMatch(/ne s'applique plus/i);
    expect(stockage.fichiers.size).toBe(0);
    expect(rapports()).toEqual([]);
    expect(ligne().datePrevue).toEqual(ORIGINE);
  });

  it("refuse aussi si la ligne est archivée ENTRE la lecture et l'écriture", async () => {
    // L'archivage n'écrit que `archiveLe`. Il survient pendant l'envoi du
    // fichier : la lecture a vu une ligne ouverte, la relecture sous verrou
    // la voit archivée (relecture externe du 2026-09-13).
    poserLigne({ archiveLe: null });
    const verrou = (prisma as { $queryRaw: unknown }).$queryRaw;
    (prisma as { $queryRaw: unknown }).$queryRaw = async () => {
      ligne().archiveLe = d("2026-08-19");
      return [];
    };

    const res = await deposer("conforme", "2026-06-01");

    (prisma as { $queryRaw: unknown }).$queryRaw = verrou;
    expect(res.status).toBe("error");
    expect(rapports()).toEqual([]);
    expect(ligne().datePrevue).toEqual(ORIGINE);
    expect(stockage.fichiers.size).toBe(0);
  });
});

describe("uploadRapport — la frontière médicale, tenue côté serveur", () => {
  // D'un titre de salarié, l'outil ne garde que l'existence, la date et
  // l'échéance — jamais le document (ADR-023 § 2, `docs/rgpd.md` § 2.3).
  beforeEach(() => {
    poserLigne({
      id: "v-titre",
      obligationId: "elec-salarie-attestation-medicale-voisinage",
      equipementId: null,
      salarieId: "sal-1",
    });
  });

  it("refuse un dépôt sur l'échéance d'une personne, sans rien stocker", async () => {
    const res = await deposer("conforme", "2026-06-01", "v-titre");
    expect(res.status).toBe("error");
    // Le refus porte sur le PORTEUR, pas sur le caractère médical.
    expect(res.status === "error" && res.message).toMatch(/personne/i);
    expect(stockage.fichiers.size).toBe(0);
    expect(rapports("v-titre")).toEqual([]);
  });
});

describe("uploadRapport — la date du rapport", () => {
  it("un contrôle daté d'AUJOURD'HUI est accepté", async () => {
    const res = await deposer("conforme", cleJourCivil(new Date()));
    expect(res.status).toBe("success");
    expect(rapports()).toHaveLength(1);
  });

  it("un rapport daté dans le futur est refusé", async () => {
    const res = await deposer("conforme", "2062-06-01");
    expect(res.status).toBe("error");
    expect(rapports()).toEqual([]);
    expect(stockage.fichiers.size).toBe(0);
    expect(ligne().datePrevue).toEqual(ORIGINE);
  });
});

// ---------------------------------------------------------------------------
// Le retrait
// ---------------------------------------------------------------------------

describe("supprimerRapport — la ligne se recalcule sur ce qui reste (ADR-036)", () => {
  /** Une ligne dont le contrôle de juin 2026 a fait courir l'échéance. */
  function ligneAvec(liste: RapportFaux[], datePrevue = d("2027-06-01")) {
    poserLigne({ datePrevue, statut: "planifiee", rapports: liste });
  }

  it("sans autre rapport ni mise en service : retour à l'origine, « à planifier », en retard", async () => {
    ligneAvec([rapport({ id: "rap-1", dateRapport: d("2026-06-01"), echeanceHonoree: ORIGINE })]);
    stockage.fichiers.add(`rapports/${ETAB}/rap-1-x.pdf`);

    await retirer("rap-1");

    // Plus de preuve → le retard court de nouveau depuis l'origine du suivi.
    // Avant l'ADR-034 la ligne restait à 2027 : le retard était blanchi par la
    // suppression de la pièce qui le justifiait.
    expect(ligne().datePrevue).toEqual(ORIGINE);
    expect(ligne().statut).toBe("a_planifier");
    expect(enRetard()).toBe(true);
    // Le fichier n'est libéré qu'après le commit.
    expect(stockage.fichiers.size).toBe(0);
    expect(regenerer).toHaveBeenCalledWith(ETAB, "rapports/suppression");
    await attendreConfluence();
  });

  it("une VRAIE échéance revient « planifiée », donc visible — plus masquée en « à planifier »", async () => {
    // ADR-036 § 5, « Suppression du dernier rapport ». Mise en service le
    // 2025-06-01, suivie depuis le 2025-06-10 : l'échéance du 2026-06-01 est
    // née pendant le suivi. ~~Le retrait la rendait « à planifier », faute de
    // savoir si elle était réelle~~ ; les faits le savent.
    poserEtablissement([{ id: "eq-1", dateMiseEnService: d("2025-06-01") }]);
    poserLigne({
      datePrevue: d("2027-06-01"),
      statut: "planifiee",
      suiviDepuis: d("2025-06-10"),
      rapports: [rapport({ id: "rap-1", dateRapport: d("2026-06-01"), echeanceHonoree: d("2026-06-01") })],
    });

    await retirer("rap-1");

    expect(ligne().datePrevue).toEqual(d("2026-06-01"));
    expect(ligne().statut).toBe("planifiee");
    expect(enRetard()).toBe(true);
    await attendreConfluence();
  });

  it("se rabat sur le rapport réalisé précédent quand celui-ci reste", async () => {
    ligneAvec([
      rapport({ id: "rap-2025", dateRapport: d("2025-05-01") }),
      rapport({ id: "rap-2026", dateRapport: d("2026-06-01") }),
    ]);

    await retirer("rap-2026");

    expect(ligne().datePrevue).toEqual(d("2026-05-01"));
    expect(ligne().statut).toBe("planifiee");
    expect(enRetard()).toBe(true);
    await attendreConfluence();
  });

  it("retirer un rapport ANTIDATÉ ne touche pas la ligne", async () => {
    ligneAvec([
      rapport({ id: "rap-2025", dateRapport: d("2025-05-01") }),
      rapport({ id: "rap-2026", dateRapport: d("2026-06-01"), echeanceHonoree: ORIGINE }),
    ]);

    await retirer("rap-2025");

    expect(rapports().map((r) => r.id)).toEqual(["rap-2026"]);
    expect(ligne().datePrevue).toEqual(d("2027-06-01"));
    expect(ligne().statut).toBe("planifiee");
  });

  it("retirer un rapport non vérifiable ne touche pas la ligne", async () => {
    ligneAvec([
      rapport({ id: "rap-1", dateRapport: d("2026-06-01") }),
      rapport({ id: "rap-nv", dateRapport: d("2026-08-01"), resultat: "non_verifiable" }),
    ]);

    await retirer("rap-nv");

    expect(ligne().datePrevue).toEqual(d("2027-06-01"));
    expect(ligne().statut).toBe("planifiee");
  });

  it("le retrait du seul contrôle d'un ponctuel le ROUVRE", async () => {
    // Vu de la ligne, un ponctuel soldé dont on retire le seul rapport réalisé
    // porte un statut réalisé sans aucun rapport. ~~La garde du legs le
    // conservait, sauf sous `garderLegs: false`.~~ Depuis le lot 5
    // (2026-09-19), un statut réalisé ne survit pas sans rapport réalisé.
    poserEtablissement([{ id: "eq-1", dateMiseEnService: d("2026-01-05") }]);
    poserLigne({
      obligationId: ELEC_MISE_EN_SERVICE,
      datePrevue: d("2026-01-05"),
      statut: "realisee_conforme",
      rapports: [rapport({ id: "rap-mes", dateRapport: d("2026-02-01") })],
    });

    await retirer("rap-mes");

    expect(ligne().statut).toBe("a_planifier");
    expect(ligne().datePrevue).toEqual(d("2026-01-05"));
    await attendreConfluence();
  });

  it("une ligne `autre` soldée par un dépôt rouvre au retrait de ce rapport, date inchangée (NB4)", async () => {
    // Relecture du lot 4 : la boucle NB4 gardait le statut réalisé que le
    // rapport retiré avait donné — « réalisée » sans pièce, et `porteUneTrace`
    // la comptait ensuite comme une trace que plus rien ne rouvrait.
    //
    // La ligne porte encore le rythme et la marque d'une prescription LEVÉE :
    // NB4 la met donc à jour pour une autre raison que le statut, et c'est
    // SA décision qui doit rouvrir la ligne — pas le repli de
    // `recalculerLigne` pour une ligne hors du plan, qui masquerait NB4.
    poserEtablissement([{ id: "eq-portail", categorie: "PORTAIL_AUTO" }]);
    poserLigne({
      id: "v-portail",
      obligationId: PORTAIL_MAINTIEN,
      equipementId: "eq-portail",
      periodicite: "semestrielle",
      prescriptionId: "presc-levee",
      datePrevue: d("2021-03-01"),
      statut: "a_planifier",
      nbActions: 1,
    });
    await deposer("conforme", "2026-06-01", "v-portail");
    expect(ligne("v-portail").statut).toBe("realisee_conforme");

    await retirer(rapports("v-portail")[0].id!);

    expect(ligne("v-portail").statut).toBe("a_planifier");
    expect(ligne("v-portail").datePrevue).toEqual(d("2021-03-01"));
    // La régénération réalignera le rythme et retirera la marque — pas le
    // statut ni la date, que le retrait a déjà écrits comme elle.
    const suite = await decisionDeLaRegeneration("v-portail");
    expect(suite?.periodicite).toBe("autre");
    expect(suite?.prescriptionId).toBeNull();
    expect(suite?.statut).toBe("a_planifier");
    expect(suite?.datePrevue).toEqual(d("2021-03-01"));
  });

  it("une ligne ARCHIVÉE dont on retire le seul rapport réalisé perd son statut réalisé, date inchangée", async () => {
    // Le cas voisin : l'appareil est retiré, la ligne archivée avec sa preuve.
    // Le plan ne la met pas à jour ; sans la règle de `recalculerLigne`, elle
    // restait « réalisée » sans aucune pièce.
    poserEtablissement([{ id: "eq-1", actif: false, dateMiseEnService: d("2026-01-05") }]);
    poserLigne({
      obligationId: ELEC_MISE_EN_SERVICE,
      datePrevue: d("2026-01-05"),
      statut: "realisee_conforme",
      archiveLe: d("2026-07-01"),
      rapports: [rapport({ id: "rap-mes", dateRapport: d("2026-02-01") })],
    });

    await retirer("rap-mes");

    expect(ligne().statut).toBe("a_planifier");
    expect(ligne().datePrevue).toEqual(d("2026-01-05"));
    expect(ligne().archiveLe).toEqual(d("2026-07-01"));
  });

  it("une ligne ARCHIVÉE qui garde un autre rapport réalisé reste réalisée quand on retire le plus récent", async () => {
    // La borne de la règle précédente : elle ne rouvre une ligne hors du plan
    // que s'il NE RESTE AUCUN rapport réalisé. Ici un contrôle reste : le
    // statut réalisé a encore sa pièce.
    poserEtablissement([{ id: "eq-1", actif: false, dateMiseEnService: d("2026-01-05") }]);
    poserLigne({
      obligationId: ELEC_MISE_EN_SERVICE,
      datePrevue: d("2026-01-05"),
      statut: "realisee_conforme",
      archiveLe: d("2026-07-01"),
      rapports: [
        rapport({ id: "rap-ancien", dateRapport: d("2026-02-01") }),
        rapport({ id: "rap-recent", dateRapport: d("2026-03-01") }),
      ],
    });

    await retirer("rap-recent");

    expect(rapports().map((r) => r.id)).toEqual(["rap-ancien"]);
    expect(ligne().statut).toBe("realisee_conforme");
    expect(ligne().datePrevue).toEqual(d("2026-01-05"));
  });

  it("un ponctuel au statut réalisé SANS rapport réalisé rouvre, quel que soit le rapport retiré", async () => {
    // INVERSÉ AU LOT 5 (2026-09-19). ~~« un non vérifiable retiré d'un
    // ponctuel au statut hérité (legs) ne le rouvre pas » : le statut ne
    // venait pas du rapport retiré, et la garde du legs le conservait.~~ La
    // garde est partie — aucun legs en production, aucun chemin qui en
    // fabrique. Un statut réalisé ne survit pas sans rapport réalisé : le
    // retrait recalcule la ligne sur ses faits, comme la régénération.
    poserLigne({
      obligationId: ELEC_MISE_EN_SERVICE,
      datePrevue: d("2025-04-20"),
      statut: "realisee_conforme",
      rapports: [rapport({ id: "rap-nv", dateRapport: d("2026-02-01"), resultat: "non_verifiable" })],
    });

    await retirer("rap-nv");

    expect(ligne().statut).toBe("a_planifier");
    // Sans mise en service connue, un ponctuel ouvert porte l'origine de son
    // suivi.
    expect(ligne().datePrevue).toEqual(ORIGINE);
  });

  it("l'origine est un FAIT : tous les ordres de retrait finissent au même état, antidaté compris", async () => {
    // ~~L'échéance d'origine se transmettait de rapport en rapport jusqu'à la
    // tête de chaîne, et deux rédactions successives l'avaient perdue selon
    // l'ordre des clics.~~ Elle est `suiviDepuis` : aucun ordre ne peut la
    // perdre. L'invariant, éprouvé sur les six ordres.
    const ordres = [
      ["a", "b", "c"],
      ["a", "c", "b"],
      ["b", "a", "c"],
      ["b", "c", "a"],
      ["c", "a", "b"],
      ["c", "b", "a"],
    ];
    for (const ordre of ordres) {
      ligneAvec([
        rapport({ id: "a", dateRapport: d("2026-04-01"), echeanceHonoree: ORIGINE }),
        rapport({ id: "b", dateRapport: d("2026-02-01") }),
        rapport({ id: "c", dateRapport: d("2026-06-01"), echeanceHonoree: d("2027-04-01") }),
      ]);
      for (const id of ordre) await retirer(id);

      const quand = `ordre ${ordre.join(" → ")}`;
      expect(rapports(), quand).toEqual([]);
      expect(ligne().datePrevue, quand).toEqual(ORIGINE);
      expect(ligne().statut, quand).toBe("a_planifier");
      expect(enRetard(), quand).toBe(true);
    }
  });

  it("deux rapports du MÊME JOUR : retirer l'un laisse l'autre commander", async () => {
    ligneAvec([
      rapport({ id: "rap-a", dateRapport: d("2026-06-01"), echeanceHonoree: ORIGINE }),
      rapport({ id: "rap-b", dateRapport: d("2026-06-01") }),
    ]);

    await retirer("rap-a");
    expect(ligne().datePrevue).toEqual(d("2027-06-01"));
    await retirer("rap-b");
    expect(ligne().datePrevue).toEqual(ORIGINE);
    expect(ligne().statut).toBe("a_planifier");
  });

  it("n'écrit plus d'échéance honorée sur les rapports qui restent (chaîne de transmission retirée)", async () => {
    // INVERSÉ (ADR-036, lot 4). ~~« l'échéance d'origine se transmet à la TÊTE
    // de chaîne, pas au successeur immédiat »~~ : le retrait réécrivait
    // `echeanceHonoree` sur le plus ancien rapport restant pour qu'elle
    // survive. L'échéance honorée n'est plus qu'une trace posée AU DÉPÔT ; le
    // retrait n'y touche pas.
    ligneAvec([
      rapport({ id: "ancien", dateRapport: d("2026-02-01") }),
      rapport({ id: "recent", dateRapport: d("2026-06-01"), echeanceHonoree: ORIGINE }),
    ]);

    await retirer("recent");

    expect(rapports().find((r) => r.id === "ancien")!.echeanceHonoree).toBeNull();
  });

  it("verrouille la ligne avant de la relire", async () => {
    ligneAvec([rapport({ id: "rap-1", dateRapport: d("2026-06-01") })]);
    await retirer("rap-1");
    expect(db.verrous[0]).toContain('FROM "Verification"');
    expect(db.verrous[0]).toContain("FOR UPDATE");
  });

  it("si la ligne a bougé malgré le verrou, rien n'est retiré : le rapport reste", async () => {
    ligneAvec([rapport({ id: "rap-1", dateRapport: d("2026-06-01"), echeanceHonoree: ORIGINE })]);
    const verification = (prisma as { verification: { updateMany: unknown } }).verification;
    const original = verification.updateMany;
    verification.updateMany = () => Promise.resolve({ count: 0 });

    await expect(supprimerRapport("rap-1")).rejects.toThrow("Cette échéance a été modifiée");

    verification.updateMany = original;
    expect(rapports().map((r) => r.id)).toEqual(["rap-1"]);
    expect(ligne().datePrevue).toEqual(d("2027-06-01"));
  });

  it("un rapport déjà retiré par une suppression concurrente ne fait rien", async () => {
    ligneAvec([rapport({ id: "rap-1", dateRapport: d("2026-06-01") })]);
    const rv = (prisma as { rapportVerification: { findUnique: (a: unknown) => Promise<unknown> } })
      .rapportVerification;
    const lecture = rv.findUnique;
    let appels = 0;
    rv.findUnique = async (a: unknown) => {
      appels += 1;
      // Première lecture (hors transaction) : le rapport existe. Relecture
      // sous le verrou : une autre suppression l'a emporté.
      return appels === 1 ? lecture(a) : null;
    };
    const avant = { ...ligne(), rapports: [...rapports()] };

    await retirer("rap-1");

    rv.findUnique = lecture;
    expect(ligne()).toEqual(avant);
  });
});

// ---------------------------------------------------------------------------
// La confluence, sur un aller-retour complet
// ---------------------------------------------------------------------------

describe("confluence — dépôt puis retrait, la régénération n'a jamais rien à redire", () => {
  it("après chaque étape, la ligne est « inchangée » pour la réconciliation", async () => {
    poserEtablissement([{ id: "eq-1", dateMiseEnService: d("2025-06-01") }]);
    poserLigne({ datePrevue: d("2026-06-01"), statut: "planifiee", suiviDepuis: d("2025-06-10") });
    await attendreConfluence();

    await deposer("conforme", "2026-07-01");
    expect(ligne().datePrevue).toEqual(d("2027-07-01"));
    await attendreConfluence();

    await deposer("non_verifiable", "2026-08-01");
    await attendreConfluence();

    const conforme = rapports().find((r) => r.resultat === "conforme")!;
    await retirer(conforme.id!);
    expect(ligne().datePrevue).toEqual(d("2026-06-01"));
    await attendreConfluence();
  });
});
