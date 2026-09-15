import { describe, expect, it } from "vitest";
import {
  echeancesDuTableauDeBord,
  prochaineEcheanceConnue,
} from "./prochaine-echeance";

// 10 septembre 2026, midi à Paris : l'horloge est injectée (ADR-011).
const NOW = new Date("2026-09-10T10:00:00.000Z");
const jour = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

const ligne = (
  id: string,
  datePrevue: string,
  o: { statut?: string; periodicite?: string; archiveLe?: string } = {},
) => ({
  id,
  statut: o.statut ?? "planifiee",
  datePrevue: jour(datePrevue),
  periodicite: o.periodicite ?? "annuelle",
  archiveLe: o.archiveLe ? jour(o.archiveLe) : null,
  libelleObligation: `Obligation ${id}`,
});

describe("prochaineEcheanceConnue — une définition pour tous les écrans", () => {
  it("un retard DATÉ passe devant une échéance à venir", () => {
    // Le cas qui départageait les deux copies : le tableau de bord rendait le
    // 01/12, la vue du parc le 01/06. Le contrôle est dû depuis le 01/06.
    const r = prochaineEcheanceConnue(
      [ligne("a-venir", "2026-12-01"), ligne("manquee", "2026-06-01")],
      NOW,
    );
    expect(r?.ligne.id).toBe("manquee");
    expect(r?.date).toEqual(jour("2026-06-01"));
    expect(r?.registre).toBe("enRetard");
  });

  it("parmi plusieurs retards datés, le plus ancien", () => {
    const r = prochaineEcheanceConnue(
      [ligne("recent", "2026-08-01"), ligne("ancien", "2026-03-01")],
      NOW,
    );
    expect(r?.ligne.id).toBe("ancien");
  });

  it("une « à planifier » en retard n'est jamais la prochaine échéance — sa date est une date de génération", () => {
    // LA GARDE PRINCIPALE. Classée « en retard », elle passait le filtre de la
    // vue du parc, qui lisait le classement : l'appareil annonçait comme
    // échéance manquée le jour où le dossier avait été créé.
    const r = prochaineEcheanceConnue(
      [
        ligne("generee", "2026-09-01", { statut: "a_planifier" }),
        ligne("vraie", "2026-10-15"),
      ],
      NOW,
    );
    expect(r?.ligne.id).toBe("vraie");
    expect(r?.registre).toBe("lointain");
  });

  it("ni une « à planifier » à venir, ni une ligne archivée, ni une ponctuelle consommée", () => {
    expect(
      prochaineEcheanceConnue(
        [
          ligne("a-dater", "2026-09-20", { statut: "a_planifier" }),
          ligne("eteinte", "2026-09-15", { archiveLe: "2026-09-01" }),
          ligne("consommee", "2026-09-12", {
            statut: "realisee_conforme",
            periodicite: "mise_en_service_uniquement",
          }),
        ],
        NOW,
      ),
    ).toBeNull();
  });

  it("une rangée périodique sur un statut réalisé reste une échéance due (la date décide)", () => {
    const r = prochaineEcheanceConnue(
      [ligne("gelee", "2026-05-01", { statut: "realisee_conforme" })],
      NOW,
    );
    expect(r?.registre).toBe("enRetard");
  });

  it("à date égale, la première rencontrée", () => {
    const r = prochaineEcheanceConnue(
      [ligne("premiere", "2026-09-20"), ligne("seconde", "2026-09-20")],
      NOW,
    );
    expect(r?.ligne.id).toBe("premiere");
  });
});

describe("echeancesDuTableauDeBord — la prochaine se choisit avant la coupe à cinq", () => {
  // LE SCÉNARIO DE LA RELECTURE DE CONTRÔLE DU LOT C. Cinq lignes « à
  // planifier » datées avant une vraie échéance au 15/10 : le widget filtrait
  // les cinq déjà coupées et annonçait « Sans échéance connue pour
  // l'instant ».
  const lignes = [
    ligne("vraie", "2026-10-15"),
    ligne("p1", "2026-09-01", { statut: "a_planifier" }),
    ligne("p2", "2026-09-02", { statut: "a_planifier" }),
    ligne("p3", "2026-09-20", { statut: "a_planifier" }),
    ligne("p4", "2026-09-21", { statut: "a_planifier" }),
    ligne("p5", "2026-10-01", { statut: "a_planifier" }),
  ];

  it("rend la vraie échéance du 15/10", () => {
    expect(echeancesDuTableauDeBord(lignes, NOW).prochaineEcheance?.id).toBe(
      "vraie",
    );
  });

  it("les cinq prochaines rangent la vraie échéance en tête, les lignes sans échéance ensuite", () => {
    // CE TEST A CHANGÉ DE RÉPONSE (2026-09-15). Il attendait p1…p5 : les cinq
    // « à planifier » cachaient la vraie échéance du 15/10 au widget
    // « Prochaines échéances ». Elles y restent, derrière elle.
    expect(
      echeancesDuTableauDeBord(lignes, NOW).prochainesVerifs.map((l) => l.id),
    ).toEqual(["vraie", "p1", "p2", "p3", "p4"]);
  });

  it("rend `null` quand aucune ligne n'a d'échéance connue", () => {
    expect(
      echeancesDuTableauDeBord(lignes.slice(1), NOW).prochaineEcheance,
    ).toBeNull();
  });
});
