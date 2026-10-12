import { describe, expect, it } from "vitest";
import { cleJourCivil } from "@/lib/dates";
import { obligationsConformite } from "@/lib/referentiels/conformite";
import { OBLIGATION_EMPLOYEUR } from "./obligation-employeur";
import { cataloguerTitres } from "./catalogue";
import {
  ceQuiManqueALaPersonne,
  etatDuManque,
  type TitreDeclareLu,
} from "./du-a-la-personne";

// Une date civile à midi UTC, comme `echeance.test.ts` : `prochaineEcheance`
// conserve l'heure civile (ADR-011), et minuit UTC glisserait d'un jour au
// passage à l'heure d'été.
const jour = (iso: string) => new Date(`${iso}T12:00:00.000Z`);
const VIP = "sante-travail-salarie-vip";
const ACCUEIL = "formation-securite-salarie-accueil";
const SIR = "sante-travail-salarie-sir";
const INTERMEDIAIRE = "sante-travail-salarie-sir-visite-intermediaire";
const AUTORISATION = "conduite-salarie-autorisation";
const ATTESTATION = "conduite-salarie-attestation-medicale";

const present = (entreLe: string | null) => ({
  actif: true,
  entreLe: entreLe === null ? null : jour(entreLe),
});
const titre = (obligationId: string, iso: string): TitreDeclareLu => ({
  obligationId,
  delivreLe: jour(iso),
});
// Le jour civil d'une échéance, sans l'heure : c'est ce que l'écran affiche.
const civil = (d: Date | null | undefined) => (d ? cleJourCivil(d) : d);
const ids = (l: { obligation: { id: string } }[]) => l.map((m) => m.obligation.id);

describe("ce qui est dû à l'entrée (R. 4624-10, R. 4141-20)", () => {
  it("date la VIP à trois mois et la formation à un mois de l'entrée", () => {
    const manques = ceQuiManqueALaPersonne(present("2026-01-31"), []);
    const vip = manques.find((m) => m.obligation.id === VIP);
    const accueil = manques.find((m) => m.obligation.id === ACCUEIL);
    // Mois calendaires écrêtés en fin de mois (ADR-011) : le 31 janvier plus
    // un mois tombe le 28 février, pas le 3 mars.
    expect(civil(vip?.echeance)).toBe("2026-04-30");
    expect(civil(accueil?.echeance)).toBe("2026-02-28");
    expect(vip?.origine).toEqual({ type: "entree", entreLe: jour("2026-01-31") });
  });

  it("ne date rien quand l'entrée n'est pas renseignée — et ne conclut à aucun retard", () => {
    const manques = ceQuiManqueALaPersonne(present(null), []);
    expect(ids(manques)).toEqual(expect.arrayContaining([VIP, ACCUEIL]));
    for (const m of manques.filter((m) => m.origine.type === "entree")) {
      expect(m.echeance, m.obligation.id).toBeNull();
      expect(etatDuManque(m, jour("2030-01-01")), m.obligation.id).toBeNull();
    }
  });

  it("se tait dès que le titre est déclaré, même ancien : le cycle du titre prend le relais", () => {
    const manques = ceQuiManqueALaPersonne(present("2026-01-01"), [
      titre(VIP, "2019-05-01"),
    ]);
    expect(ids(manques)).not.toContain(VIP);
    expect(ids(manques)).toContain(ACCUEIL);
  });

  it("ne réclame pas la VIP à qui détient le suivi renforcé, qui s'y substitue (R. 4624-24)", () => {
    const manques = ceQuiManqueALaPersonne(present("2026-01-01"), [
      titre(SIR, "2026-01-02"),
    ]);
    expect(ids(manques)).not.toContain(VIP);
  });

  it("ne réclame rien à une personne sortie de l'effectif", () => {
    expect(
      ceQuiManqueALaPersonne({ actif: false, entreLe: jour("2026-01-01") }, []),
    ).toEqual([]);
  });

  it("classe le retard avec la règle commune : le jour de l'échéance n'est pas en retard", () => {
    const [vip] = ceQuiManqueALaPersonne(present("2026-01-15"), []).filter(
      (m) => m.obligation.id === VIP,
    );
    expect(etatDuManque(vip, jour("2026-04-15"))).not.toBe("enRetard");
    expect(etatDuManque(vip, jour("2026-04-16"))).toBe("enRetard");
  });
});

describe("ce qu'un titre détenu appelle (ADR-024 lu, ADR-043)", () => {
  it("le suivi renforcé appelle la visite intermédiaire deux ans après la visite du médecin (R. 4624-28)", () => {
    const manques = ceQuiManqueALaPersonne(present("2024-01-01"), [
      titre(SIR, "2023-12-01"),
      titre(SIR, "2025-03-10"),
    ]);
    const m = manques.find((x) => x.obligation.id === INTERMEDIAIRE);
    // Depuis la visite du médecin la PLUS RÉCENTE.
    expect(civil(m?.echeance)).toBe("2027-03-10");
    expect(m?.origine.type).toBe("transmis");
  });

  it("l'autorisation de conduite appelle l'attestation dès sa délivrance (R. 4323-56)", () => {
    const manques = ceQuiManqueALaPersonne(present("2026-01-01"), [
      titre(AUTORISATION, "2026-02-01"),
    ]);
    const m = manques.find((x) => x.obligation.id === ATTESTATION);
    expect(civil(m?.echeance)).toBe("2026-02-01");
    expect(etatDuManque(m!, jour("2026-02-02"))).toBe("enRetard");
  });

  it("ne rappelle pas un titre transmis déjà détenu", () => {
    const manques = ceQuiManqueALaPersonne(present("2026-01-01"), [
      titre(AUTORISATION, "2026-02-01"),
      titre(ATTESTATION, "2025-06-01"),
    ]);
    expect(ids(manques)).not.toContain(ATTESTATION);
  });

  it("toute transmission d'un titre salarié vers un titre salarié dit son délai", () => {
    // Sans `delai`, le module saute la transmission : elle se tairait. Cette
    // garde la rend impossible à oublier, sans liste recopiée.
    const titres = new Set(cataloguerTitres().map((o) => o.id));
    const muettes = cataloguerTitres().flatMap((o) =>
      o.transmet
        .filter(
          (t) =>
            t.vers === "salarie_designe" &&
            t.titre !== null &&
            titres.has(t.titre) &&
            t.delai === undefined,
        )
        .map((t) => `${o.id} → ${t.vers === "salarie_designe" ? t.titre : ""}`),
    );
    expect(muettes).toEqual([]);
  });
});

describe("dû à l'entrée = dû à tout l'effectif, deux sources qui doivent s'accorder", () => {
  // `premierDelai` sur un titre salarié dit « dû à tous dès l'entrée » ;
  // `OBLIGATION_EMPLOYEUR[id].condition === null` dit « sans condition » au
  // texte remis au salarié (E8). Deux écritures du même fait : elles se
  // contrôlent l'une l'autre, sans liste d'identifiants.
  const catalogue = cataloguerTitres();

  it("un titre dû à l'entrée n'a pas de condition au tableau de l'employeur", () => {
    const enDesaccord = catalogue
      .filter((o) => o.premierDelai !== undefined)
      .filter((o) => OBLIGATION_EMPLOYEUR[o.id]?.condition !== null)
      .map((o) => o.id);
    expect(enDesaccord).toEqual([]);
  });

  it("un titre sans condition est dû à l'entrée", () => {
    const enDesaccord = catalogue
      .filter((o) => OBLIGATION_EMPLOYEUR[o.id]?.condition === null)
      .filter((o) => o.premierDelai === undefined)
      .map((o) => o.id);
    expect(enDesaccord).toEqual([]);
  });

  it("au moins la VIP et la formation à la sécurité sont dues à l'entrée (borne basse)", () => {
    const dus = catalogue.filter((o) => o.premierDelai !== undefined).map((o) => o.id);
    expect(dus).toEqual(expect.arrayContaining([VIP, ACCUEIL]));
  });

  it("aucun titre au niveau audit n'est réclamé (ADR-042)", () => {
    const vip = catalogue.find((o) => o.id === VIP)!;
    const audit = { ...vip, niveau: "audit" as const };
    expect(ceQuiManqueALaPersonne(present("2026-01-01"), [], [audit])).toEqual([]);
    // Et le référentiel réel n'en porte aucun parmi les titres dus à l'entrée.
    expect(
      obligationsConformite.filter(
        (o) => o.porteur === "salarie" && o.premierDelai !== undefined && o.niveau === "audit",
      ),
    ).toEqual([]);
  });
});
