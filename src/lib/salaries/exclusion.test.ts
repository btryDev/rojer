// Le produit ne peut plus fabriquer l'échéance que le droit écarte.
//
// Le défaut, tel qu'il était atteignable en usage ordinaire — sans requête
// forgée, sans droit particulier : l'employeur ouvre la fiche d'une personne,
// déclare « Suivi individuel renforcé », puis déclare « Visite d'information et
// de prévention ». `declarerTitre` acceptait les deux, `genererCalendrier`
// produisait deux lignes, et le calendrier affichait un rendez-vous que
// `R. 4624-24` supprime en écrivant que l'examen du suivi renforcé « se
// substitue à la visite d'information et de prévention ».
//
// Ce fichier tient les deux moitiés du remède :
//   - la table d'exclusions est SYMÉTRIQUE, alors que le référentiel ne déclare
//     chaque couple qu'une fois ;
//   - `declarerTitre` REFUSE le second titre, en nommant le premier.
//
// Chaque garantie est éprouvée en réinjectant le défaut : on déclare les deux
// titres exclusifs et on vérifie que ça rougit. Une garde qu'on n'a pas cassée
// exprès est une décoration.

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cataloguerTitres,
  conflitsExclusion,
  exclusionsDuTitre,
} from "./catalogue";

const VIP = "sante-travail-salarie-vip";
const VIP_ADAPTEE = "sante-travail-salarie-vip-adaptee";
const SIR = "sante-travail-salarie-sir";
const SIR_INTERMEDIAIRE = "sante-travail-salarie-sir-visite-intermediaire";
const SIR_CATEGORIE_A = "sante-travail-salarie-sir-categorie-a";
const SST = "secours-salarie-secouriste";

const ids = (id: string) => exclusionsDuTitre(id).map((x) => x.titre.id).sort();

describe("la table d'exclusions se ferme par symétrie", () => {
  it("le référentiel ne déclare chaque couple qu'une fois", () => {
    // La prémisse de tout ce fichier, vérifiée plutôt que supposée : si
    // quelqu'un recopiait la réciproque dans l'autre obligation, la fermeture
    // deviendrait un doublon silencieux et ce test le dirait.
    const catalogue = cataloguerTitres();
    const declares = new Set<string>();
    for (const o of catalogue) {
      for (const x of o.exclut) declares.add(`${o.id}|${x.titre}`);
    }
    const recopies = [...declares].filter((c) => {
      const [de, vers] = c.split("|");
      return declares.has(`${vers}|${de}`);
    });
    expect(
      recopies,
      "un couple déclaré des deux côtés : la symétrie se ferme à la lecture, elle ne se recopie pas",
    ).toEqual([]);
  });

  it("le titre qui ne déclare rien connaît quand même ceux qui l'écartent", () => {
    // Le cas décisif. `-vip` porte `exclut: []` — c'est l'obligation
    // dérogatoire qui déclare —, et pourtant l'interroger doit rendre les trois
    // titres qui l'écartent. Une fermeture manquante rendrait `[]` ici, et le
    // produit accepterait « SIR puis VIP » dans cet ordre-là seulement : un
    // défaut qui ne se voit qu'une fois sur deux.
    expect(ids(VIP)).toEqual([SIR, SIR_CATEGORIE_A, VIP_ADAPTEE].sort());
  });

  it("chaque couple déclaré se retrouve dans les deux sens, avec son motif", () => {
    for (const o of cataloguerTitres()) {
      for (const x of o.exclut) {
        const aller = exclusionsDuTitre(o.id).find((e) => e.titre.id === x.titre);
        const retour = exclusionsDuTitre(x.titre).find((e) => e.titre.id === o.id);
        expect(aller?.motif, `${o.id} → ${x.titre}`).toBe(x.motif);
        expect(retour?.motif, `${x.titre} → ${o.id}`).toBe(x.motif);
      }
    }
  });

  it("un titre sans exclusion n'en reçoit aucune", () => {
    // Contre-épreuve : sans elle, une fermeture qui rendrait TOUT le catalogue
    // pour n'importe quel identifiant passerait les tests précédents.
    expect(ids(SST)).toEqual([]);
    expect(ids("titre-qui-n-existe-pas")).toEqual([]);
  });

  it("la relation n'est pas fermée transitivement", () => {
    // `-vip-adaptee` écarte `-vip`, et `-vip` est écarté par `-sir`. Si la
    // table se fermait transitivement, elle inventerait des couples que
    // personne n'a lus dans un texte. Ici les deux couples existent, mais
    // parce qu'ils sont DÉCLARÉS — et la visite intermédiaire le prouve : elle
    // n'est écartée QUE par la catégorie A, pas par la VIP, alors que la
    // transitivité l'y conduirait.
    expect(ids(SIR_INTERMEDIAIRE)).toEqual([SIR_CATEGORIE_A]);
  });

  it("la visite intermédiaire reste cumulable avec le suivi renforcé", () => {
    // `-sir` TRANSMET vers `-sir-visite-intermediaire` (ADR-024) : les deux se
    // cumulent, et doivent se cumuler. Le jour où quelqu'un confondrait
    // « transmet » et « exclut », la moitié du dispositif de R. 4624-28
    // disparaîtrait du calendrier.
    expect(conflitsExclusion([SIR, SIR_INTERMEDIAIRE])).toEqual([]);
  });
});

describe("les cumuls déjà en place sont nommés", () => {
  it("rend chaque couple une seule fois", () => {
    const conflits = conflitsExclusion([VIP, SIR]);
    expect(conflits).toHaveLength(1);
    expect(conflits[0].titres.map((t) => t.id).sort()).toEqual([SIR, VIP].sort());
    expect(conflits[0].motif).toContain("se substitue");
  });

  it("voit les trois cumuls d'un dossier qui les porte tous", () => {
    const conflits = conflitsExclusion([VIP, VIP_ADAPTEE, SIR]);
    expect(
      conflits.map((c) => c.titres.map((t) => t.id).sort().join(" + ")).sort(),
    ).toEqual(
      [
        [VIP, VIP_ADAPTEE].sort().join(" + "),
        [VIP, SIR].sort().join(" + "),
        [VIP_ADAPTEE, SIR].sort().join(" + "),
      ].sort(),
    );
  });

  it("ne voit rien là où il n'y a rien", () => {
    expect(conflitsExclusion([VIP, SST])).toEqual([]);
    expect(conflitsExclusion([VIP])).toEqual([]);
    expect(conflitsExclusion([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// La réinjection du défaut, au niveau où il était atteignable : l'action.
// ---------------------------------------------------------------------------

const h = vi.hoisted(() => ({
  titreSalarie: { upsert: vi.fn(async () => ({})) },
  salarie: {
    findFirst: vi.fn(
      async (): Promise<{ id: string; titres: { obligationId: string }[] }> => ({
        id: "sal-1",
        titres: [],
      }),
    ),
  },
  genererCalendrier: vi.fn(async () => {}),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { salarie: h.salarie, titreSalarie: h.titreSalarie },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/scope", () => ({
  assertEtablissementOwnership: vi.fn(async () => {}),
  // La garde rend aussi le client borné (ADR-051) : ici, le client simulé.
  assertEtablissementDuCompte: async (...a: unknown[]) => ({
    user: (await (vi.fn(async () => {}) as (...x: unknown[]) => unknown)(...a)) ?? { id: "u1" },
    db: (await import("@/lib/prisma")).prisma,
  }),
}));
vi.mock("@/lib/calendrier/actions", () => ({
  genererCalendrier: h.genererCalendrier,
}));
vi.mock("@/lib/calendrier/reconciliation", () => ({
  marquerCalendrierPerime: vi.fn(async () => {}),
}));

const { declarerTitre } = await import("./actions");

function saisie(obligationId: string): FormData {
  const fd = new FormData();
  fd.set("obligationId", obligationId);
  fd.set("delivreLe", "2026-01-15");
  fd.set("echeanceLe", "");
  fd.set("note", "");
  return fd;
}

/** La personne porte déjà ces titres. */
function porte(...obligationIds: string[]) {
  h.salarie.findFirst.mockResolvedValue({
    id: "sal-1",
    titres: obligationIds.map((obligationId) => ({ obligationId })),
  });
}

beforeEach(() => {
  h.titreSalarie.upsert.mockClear();
  h.genererCalendrier.mockClear();
  porte();
});

describe("declarerTitre refuse le cumul que le droit écarte", () => {
  it("accepte le premier titre", async () => {
    const res = await declarerTitre("etab-1", "sal-1", { status: "idle" }, saisie(SIR));
    expect(res.status).toBe("success");
    expect(h.titreSalarie.upsert).toHaveBeenCalledTimes(1);
  });

  it("refuse la VIP à qui porte déjà le suivi renforcé — le défaut du lot A", async () => {
    porte(SIR);
    const res = await declarerTitre("etab-1", "sal-1", { status: "idle" }, saisie(VIP));
    expect(res.status).toBe("error");
    // Rien n'est écrit : c'est ce qui empêche le générateur d'inscrire
    // l'échéance. Un refus qui enregistrerait quand même serait décoratif.
    expect(h.titreSalarie.upsert).not.toHaveBeenCalled();
    expect(h.genererCalendrier).not.toHaveBeenCalled();
    if (res.status !== "error") throw new Error("inatteignable");
    // Le refus nomme le titre en conflit et cite le texte : sans cela,
    // l'employeur ne saurait pas quoi retirer.
    expect(res.message).toContain("Suivi individuel renforcé");
    expect(res.message).toContain("R. 4624-24");
    expect(res.fieldErrors?.obligationId?.[0]).toContain("Incompatible");
  });

  it("refuse dans l'AUTRE sens aussi, alors que `-vip` ne déclare rien", async () => {
    // La contre-épreuve de la symétrie, prise là où elle compte. Sans la
    // fermeture, ce sens-ci passerait et l'employeur qui commence par la VIP
    // fabriquerait quand même l'échéance.
    porte(VIP);
    const res = await declarerTitre("etab-1", "sal-1", { status: "idle" }, saisie(SIR));
    expect(res.status).toBe("error");
    expect(h.titreSalarie.upsert).not.toHaveBeenCalled();
  });

  it("refuse la visite intermédiaire au travailleur de catégorie A", async () => {
    // R. 4451-82 : « La visite intermédiaire mentionnée au même article n'est
    // pas requise. » C'est l'exclusion la plus littérale des trois.
    porte(SIR_CATEGORIE_A);
    const res = await declarerTitre(
      "etab-1",
      "sal-1",
      { status: "idle" },
      saisie(SIR_INTERMEDIAIRE),
    );
    expect(res.status).toBe("error");
    if (res.status !== "error") throw new Error("inatteignable");
    expect(res.message).toContain("R. 4451-82");
  });

  it("laisse passer le cumul que le droit impose", async () => {
    // Le faux positif à ne pas fabriquer : `-sir` transmet vers la visite
    // intermédiaire, les deux vont ensemble. Un mécanisme trop large les
    // séparerait et retirerait du calendrier un rendez-vous réel — l'exact
    // inverse du défaut réparé.
    porte(SIR);
    const res = await declarerTitre(
      "etab-1",
      "sal-1",
      { status: "idle" },
      saisie(SIR_INTERMEDIAIRE),
    );
    expect(res.status).toBe("success");
    expect(h.titreSalarie.upsert).toHaveBeenCalledTimes(1);
  });

  it("laisse passer le renouvellement du même titre", async () => {
    // Redéclarer un titre déjà porté est le geste normal quand l'attestation
    // expire (`upsert`). Un mécanisme qui prendrait un titre pour son propre
    // exclusif casserait le renouvellement de tout le catalogue.
    porte(VIP);
    const res = await declarerTitre("etab-1", "sal-1", { status: "idle" }, saisie(VIP));
    expect(res.status).toBe("success");
    expect(h.titreSalarie.upsert).toHaveBeenCalledTimes(1);
  });

  it("laisse passer deux titres sans rapport", async () => {
    porte(SST);
    const res = await declarerTitre("etab-1", "sal-1", { status: "idle" }, saisie(VIP));
    expect(res.status).toBe("success");
  });
});
