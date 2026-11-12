import { describe, expect, it } from "vitest";
import type { ActiviteNonCouverte } from "@/lib/referentiels/types";
import type { QuestionActivite } from "./reponses";
import {
  activitesDeclareesSnapshot,
  activitesSansReponseSnapshot,
  figerCouverture,
  mentionSansReponseIsolee,
} from "./snapshot";

function activite(id: string): ActiviteNonCouverte {
  return {
    id,
    libelle: `Activité ${id}`,
    question: `Exercez-vous ${id} ?`,
    cequiManque: `ce que le référentiel ne dit pas de ${id}.`,
    pourquoi: `pourquoi le référentiel s'arrête avant ${id}.`,
    aFaire: { uniteExistante: "u", risques: [`risque de ${id}`] },
  };
}

describe("figerCouverture", () => {
  const questions: QuestionActivite[] = [
    { activite: activite("decoupe"), exercee: true },
    { activite: activite("station"), exercee: false },
    { activite: activite("pressing"), exercee: undefined },
  ];

  it("recopie le libellé, le « ce qui manque » et le pourquoi, sans se contenter de l'id", () => {
    // Les trois textes voyagent ensemble jusqu'au document : le référentiel
    // sera réécrit, et une version relue dans trente ans doit citer la
    // formulation qui avait été montrée au dirigeant, pas la courante.
    const fige = figerCouverture("commerce", questions);
    expect(fige.activites[0]).toEqual({
      id: "decoupe",
      libelle: "Activité decoupe",
      cequiManque: "ce que le référentiel ne dit pas de decoupe.",
      pourquoi: "pourquoi le référentiel s'arrête avant decoupe.",
      exercee: true,
    });
  });

  it("transforme l'absence de réponse en `null`, jamais en `false`", () => {
    // `undefined` ne survit pas à JSON.stringify : la clé disparaîtrait du
    // snapshot et une question posée deviendrait indistinguable d'une question
    // jamais posée. `null` la garde visible et muette.
    const fige = figerCouverture("commerce", questions);
    expect(fige.activites.map((a) => a.exercee)).toEqual([true, false, null]);
    expect(JSON.parse(JSON.stringify(fige)).activites).toHaveLength(3);
  });

  it("fige une liste vide quand le secteur ne déclare aucune activité", () => {
    // Fait à part entière : aucune question n'a été posée. Ce n'est pas
    // l'absence du champ, qui elle veut dire « on ne sait pas ».
    expect(figerCouverture("bureau", []).activites).toEqual([]);
  });
});

describe("lecture d'un snapshot", () => {
  const couverture = figerCouverture("commerce", [
    { activite: activite("decoupe"), exercee: true },
    { activite: activite("station"), exercee: false },
    { activite: activite("pressing"), exercee: undefined },
  ]);

  it("ne mentionne que les activités déclarées exercées", () => {
    expect(activitesDeclareesSnapshot(couverture).map((a) => a.id)).toEqual([
      "decoupe",
    ]);
  });

  it("compte les questions restées sans réponse", () => {
    expect(activitesSansReponseSnapshot(couverture).map((a) => a.id)).toEqual([
      "pressing",
    ]);
  });
});

describe("mentionSansReponseIsolee", () => {
  // La décision que ce prédicat porte : sur un dossier où rien n'a été déclaré,
  // un « non » à toutes les questions et un silence à toutes les questions
  // produisaient le même document — aucune mention. Or la première absence est
  // une réponse et la seconde n'en est pas une. Les confondre laissait un
  // silence prendre l'apparence d'une réponse, dans le document même dont c'est
  // le rôle de ne pas le faire.

  it("dit oui quand toutes les questions sont restées sans réponse", () => {
    const fige = figerCouverture("commerce", [
      { activite: activite("decoupe"), exercee: undefined },
      { activite: activite("poisson"), exercee: undefined },
    ]);
    expect(mentionSansReponseIsolee(fige)).toBe(true);
  });

  it("dit non quand tout a été tranché, même par des « non »", () => {
    // Le cas symétrique, et c'est lui qui justifie le prédicat : ici le
    // document n'a rien à ajouter, parce que le dirigeant a répondu.
    const fige = figerCouverture("commerce", [
      { activite: activite("decoupe"), exercee: false },
      { activite: activite("poisson"), exercee: false },
    ]);
    expect(mentionSansReponseIsolee(fige)).toBe(false);
  });

  it("dit non dès qu'une activité est déclarée : la liste porte déjà la nuance", () => {
    const fige = figerCouverture("commerce", [
      { activite: activite("decoupe"), exercee: true },
      { activite: activite("poisson"), exercee: undefined },
    ]);
    expect(mentionSansReponseIsolee(fige)).toBe(false);
  });

  it("dit non sur un snapshot antérieur au champ", () => {
    // Quarante ans de conservation : une version validée avant l'introduction
    // de la couverture ne dit rien du périmètre, et le document régénéré ne
    // doit rien en dire non plus — ni manque, ni complétude.
    expect(mentionSansReponseIsolee(undefined)).toBe(false);
  });

  it("dit non quand le secteur ne déclarait aucune activité", () => {
    expect(mentionSansReponseIsolee(figerCouverture("bureau", []))).toBe(false);
  });
});
