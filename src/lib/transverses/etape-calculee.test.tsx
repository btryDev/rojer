// L'étape « Questions transverses » du DUERP, CALCULÉE (décision de la
// propriétaire du 2026-10-12, chantiers-ouverts § 17.5).
//
// Le défaut que ce fichier garde : `Duerp.transversesRepondues` restait vrai
// sur les DUERP validés avant l'ADR-038, alors que deux questions y étaient
// neuves et sans réponse. L'avancement mentait, et seule la fiche salarié s'en
// apercevait. Chaque cas part donc d'un DUERP qui PORTE encore la colonne à
// `true` : elle doit ne plus rien décider.
//
// Les fixtures se construisent depuis le référentiel, pas d'une liste écrite
// ici : une question ajoutée demain entre dans les cas sans qu'on recopie rien.
// Les deux questions nommées le sont parce qu'elles sont l'objet du défaut.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WizardSteps } from "@/components/duerps/WizardSteps";
import { construireEtapes } from "@/lib/duerps/etapes";
import {
  faitDeLaQuestion,
  type ReponsesFaitsActivite,
} from "@/lib/etablissements/faits-activite";
import { questionsDetectionTransverses, risquesTransverses } from "@/lib/referentiels";
import { etatEtapeTransverses, signalQuestionsARepondre } from "./etat";

const TOUS_NON: ReponsesFaitsActivite = {
  manutentionManuelle: false,
  travailSurEcran: false,
  operationsElectriques: false,
  conduiteEngins: false,
  expositionCMR: false,
  epiPresents: false,
};

/** Un « non » écrit au DUERP pour chaque question qui ne pose pas de fait. */
const nonAuDuerp = () =>
  Object.fromEntries(
    questionsDetectionTransverses
      .filter((q) => !faitDeLaQuestion(q.id))
      .map((q) => [q.id, false]),
  );

const duerp = (o: {
  risques?: string[];
  reponsesTransverses?: unknown;
  etablissement?: ReponsesFaitsActivite;
}) => ({
  // La colonne inerte est là, vraie, et ne doit rien décider.
  transversesRepondues: true,
  unites: [
    {
      estTransverse: true,
      risques: (o.risques ?? []).map((referentielId) => ({ referentielId })),
    },
  ],
  // `in`, pas `??` : un `null` passé est la colonne d'un DUERP d'avant elle.
  reponsesTransverses: "reponsesTransverses" in o ? o.reponsesTransverses : nonAuDuerp(),
  etablissement: o.etablissement ?? TOUS_NON,
});

/** Le DUERP d'avant l'ADR-038 : tout répondu, sauf les deux faits neufs. */
const ANCIEN = duerp({
  etablissement: { ...TOUS_NON, operationsElectriques: null, conduiteEngins: null },
});

const etapes = (d: ReturnType<typeof duerp>, actuelle: "unites" | "transverses" = "unites") =>
  construireEtapes("d1", actuelle, {
    secteurOk: true,
    unitesOk: true,
    risquesOk: true,
    transverses: etatEtapeTransverses(d),
    activitesPosees: false,
    activitesOk: false,
    versionValidee: false,
  });

const etape = (d: ReturnType<typeof duerp>, id: string) => etapes(d).find((e) => e.id === id);

describe("étape « Questions transverses » — calculée, plus stockée (§ 17.5)", () => {
  it("un DUERP ancien, colonne à vrai et deux questions sans réponse : l'étape n'est pas faite", () => {
    const etat = etatEtapeTransverses(ANCIEN);
    expect(etat.faite).toBe(false);
    expect(etat.sansReponse).toEqual(["q-operations-electriques", "q-conduite-engins"]);
    // ~~La synthèse n'est plus « atteinte » : c'est ce que l'avancement lisait
    // de la colonne.~~ [2026-10-12, relecture indépendante : la synthèse ne
    // se verrouille plus sur cette étape — la page reste atteignable et une
    // version se valide sans condition ; c'est le signal qui le dit.]
    expect(etape(ANCIEN, "synthese")?.atteinte).toBe(true);
  });

  it("le signale : « 2 questions sans réponse », vers la première question sans réponse", () => {
    expect(etape(ANCIEN, "transverses")?.signal).toEqual({
      texte: "2 questions sans réponse",
      href: "/duerp/d1/transverses#q-operations-electriques",
    });
  });

  it("le signal est RENDU dans le fil d'étapes, en lien", () => {
    const html = renderToStaticMarkup(<WizardSteps etapes={etapes(ANCIEN)} />);
    expect(html).toContain(
      '<a class="mt-1.5 inline-block text-[12.5px] leading-[1.4] text-[color:var(--board-blue-ink)] underline-offset-4 hover:underline" href="/duerp/d1/transverses#q-operations-electriques">2 questions sans réponse →</a>',
    );
  });

  it("toutes répondues — des oui et des non : l'étape est faite, sans signal", () => {
    const d = duerp({
      risques: ["trv-routier"],
      etablissement: { ...TOUS_NON, operationsElectriques: true, conduiteEngins: false },
    });
    expect(etatEtapeTransverses(d)).toEqual({ faite: true, sansReponse: [] });
    expect(etape(d, "synthese")?.atteinte).toBe(true);
    expect(etape(d, "transverses")?.signal).toBeUndefined();
    expect(renderToStaticMarkup(<WizardSteps etapes={etapes(d)} />)).not.toContain(
      "à répondre",
    );
  });

  it("un « non » compte comme répondu — au DUERP comme sur l'établissement", () => {
    // Que des « non » : aucun risque, aucun « oui ».
    expect(etatEtapeTransverses(duerp({})).faite).toBe(true);
  });

  it("un silence ne compte pas — au DUERP", () => {
    const q = questionsDetectionTransverses.find((x) => !faitDeLaQuestion(x.id))!;
    const reponses = nonAuDuerp();
    delete reponses[q.id];
    const etat = etatEtapeTransverses(duerp({ reponsesTransverses: reponses }));
    expect(etat).toEqual({ faite: false, sansReponse: [q.id] });
    expect(signalQuestionsARepondre(etat.sansReponse.length)).toBe(
      "1 question sans réponse",
    );
  });

  it("un silence ne compte pas — sur l'établissement, même avec un risque au document", () => {
    // Le fait se lit sur la colonne d'établissement (ADR-041) : un risque
    // resté au DUERP n'est pas une réponse.
    const etat = etatEtapeTransverses(
      duerp({
        risques: ["trv-tms-ecran"],
        etablissement: { ...TOUS_NON, travailSurEcran: null },
      }),
    );
    expect(etat.sansReponse).toEqual(["q-ecran"]);
  });

  it("un DUERP neuf, sans aucune réponse : toutes les questions comptent", () => {
    const etat = etatEtapeTransverses(
      duerp({
        reponsesTransverses: null,
        etablissement: {
          manutentionManuelle: null,
          travailSurEcran: null,
          operationsElectriques: null,
          conduiteEngins: null,
          expositionCMR: null,
          epiPresents: null,
        },
      }),
    );
    expect(etat.sansReponse).toHaveLength(questionsDetectionTransverses.length);
  });

  it("pas de signal sur une étape encore fermée (aucune unité)", () => {
    const e = construireEtapes("d1", "unites", {
      secteurOk: true,
      unitesOk: false,
      risquesOk: false,
      transverses: etatEtapeTransverses(ANCIEN),
      activitesPosees: false,
      activitesOk: false,
      versionValidee: false,
    }).find((x) => x.id === "transverses");
    expect(e?.atteinte).toBe(false);
    expect(e?.signal).toBeUndefined();
  });

  it("chaque question comptée est affichée : son risque existe au référentiel", () => {
    // L'écran des questions saute une question dont le risque manque
    // (`if (!risque) return null`) : elle compterait sans réponse sans qu'on
    // puisse y répondre, et l'étape ne serait jamais faite.
    const ids = new Set(risquesTransverses.map((r) => r.id));
    for (const q of questionsDetectionTransverses) {
      expect(ids.has(q.risqueIdAssocie), q.id).toBe(true);
    }
  });
});
