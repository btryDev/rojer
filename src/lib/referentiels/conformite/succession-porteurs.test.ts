import { describe, expect, it } from "vitest";
import {
  OBLIGATIONS_RETIREES,
  obligationParId,
  obligationsConformite,
  porteurDe,
} from "./index";
import type { PorteurObligation } from "./types";

/**
 * Deux fusibles sur la succession d'une obligation — posés le 2026-09-15
 * (`lot/fusibles-referentiel`), sans construire le mécanisme qui leur manque.
 *
 * LA RÉCONCILIATION NE SAIT CONTINUER UNE LIGNE QUE DANS DEUX CAS
 * (`calendrier/generateur.ts`, `reconcilierCalendrier`) :
 *
 *  · l'ADOPTION — même porteur des deux côtés : la rangée continue, seul son
 *    identifiant d'obligation est réécrit (`adopter`, qui exige le même
 *    équipement, le même salarié, ou l'établissement des deux côtés) ;
 *  · le REPORT D'ÉCHÉANCE — N lignes d'ÉQUIPEMENT retirées au profit d'une
 *    ligne d'ÉTABLISSEMENT (`heritageDesRetirees`, table `parObligation`,
 *    consultée par la seule ligne d'établissement).
 *
 * Tout le reste casse la continuité EN SILENCE : l'ancienne ligne est archivée
 * (« Ne s'applique plus ») et la nouvelle naît « à planifier », sans rien
 * hériter. Et le porteur SALARIÉ n'est servi par aucun des deux, pour une raison
 * de plus : ses lignes naissent d'un `TitreSalarie`, dont l'`obligationId` est
 * saisi par l'employeur et qu'aucune succession ne réécrit. Le titre resterait
 * sur l'identifiant retiré — plus de ligne au calendrier, « Ne s'applique plus »
 * sur Équipe (`etatDuTitre`), hors du badge du rail.
 *
 * Aucun de ces cas n'existe au référentiel aujourd'hui. Ces tests ne corrigent
 * rien : ils font tomber la suite le jour où l'un d'eux entrerait, avec le
 * message qui dit où lire. Voir `docs/chantiers-ouverts.md` § 11, lot 2
 * (« DEUX MÉCANISMES, ET LE PREMIER PREND LE PAS »), et l'ADR-034, N4, point 5
 * (« Laissé ouvert, écrit »).
 */

/**
 * Le porteur de chaque obligation qui N'EST PAS portée par un équipement,
 * VIVANTE OU RETIRÉE. Absent = `"equipement"`.
 *
 * POURQUOI UN REGISTRE, ET POURQUOI SEULEMENT CELLES-LÀ. Un identifiant ne dit
 * pas son porteur, et une obligation retirée n'est plus là pour le dire : il
 * faut une mémoire, et rien dans le référentiel n'en tient une. Le 2026-08-31,
 * le lot « faux négatifs d'ancrage » a fait passer des obligations de
 * l'équipement à l'établissement EN GARDANT LEUR IDENTIFIANT — le registre de
 * sécurité (`incendie-registre-securite`, id inchangé depuis avril), la
 * consigne, les exercices — et aucun test n'a rien vu :
 * l'empreinte a bougé, son message dit « ajoutez une ligne à l'historique », et
 * les lignes ancrées sur un appareil seront archivées sans que la nouvelle
 * ligne d'établissement en hérite.
 *
 * Les obligations d'équipement n'y sont pas, pour ne pas taxer le cas le plus
 * fréquent (une obligation d'appareil ajoutée) : l'absence vaut « équipement »,
 * et c'est ce qui rend détectable le passage d'un appareil à autre chose.
 *
 * NE RETIREZ JAMAIS UNE LIGNE, même quand l'obligation quitte le référentiel :
 * c'est ici que son porteur survit, et le fusible des retraits le lit.
 * Construit le 2026-09-15 en appelant `porteurDe` sur le référentiel, jamais au
 * grep : 65 vivantes (51 établissement, 14 salarié) et une retirée.
 */
const PORTEURS_HORS_EQUIPEMENT: Readonly<
  Record<string, Exclude<PorteurObligation, "equipement">>
> = {
  "aeration-controle-installations-r4222-20": "etablissement",
  "co-activite-etablissement-protocole-securite": "etablissement",
  "conduite-salarie-attestation-medicale": "salarie",
  "conduite-salarie-autorisation": "salarie",
  "conduite-salarie-formation": "salarie",
  "eclairage-etablissement-regles-entretien": "etablissement",
  "elec-erp-presence-personne-qualifiee": "etablissement",
  "elec-salarie-attestation-medicale-voisinage": "salarie",
  "elec-salarie-habilitation": "salarie",
  "epi-etablissement-consigne-utilisation": "etablissement",
  "formation-securite-etablissement-information": "etablissement",
  "formation-securite-etablissement-manutention": "etablissement",
  "formation-securite-etablissement-organisation": "etablissement",
  "formation-securite-etablissement-travail-sur-ecran": "etablissement",
  "formation-securite-salarie-accueil": "salarie",
  "formation-securite-salarie-cse-sst": "salarie",
  "formation-securite-salarie-designe-competent": "salarie",
  "habitation-consignes-plans-intervention": "etablissement",
  "habitation-registre-securite": "etablissement",
  "habitation-verification-annuelle-installations-securite": "etablissement",
  "incendie-erp-5-sommeil-consigne-chambres": "etablissement",
  "incendie-erp-5-sommeil-contrat-entretien-sdi": "etablissement",
  "incendie-erp-5-sommeil-plans-affiches": "etablissement",
  "incendie-erp-5-visite-commission": "etablissement",
  "incendie-erp-pe4-entretien-installations-techniques": "etablissement",
  "incendie-erp-visite-commission-cat1-2-quinquennale": "etablissement",
  "incendie-erp-visite-commission-cat1-2-triennale": "etablissement",
  "incendie-erp-visite-commission-cat3-quinquennale": "etablissement",
  "incendie-erp-visite-commission-cat3-triennale": "etablissement",
  "incendie-erp-visite-commission-cat4-quinquennale": "etablissement",
  "incendie-erp-visite-commission-cat4-r-avec-hebergement-triennale":
    "etablissement",
  "incendie-erp-visite-commission-cat4-r-sans-hebergement-quinquennale":
    "etablissement",
  "incendie-erp-visite-commission-cat4-triennale": "etablissement",
  "incendie-igh-charge-calorifique-quinquennale": "etablissement",
  "incendie-registre-securite": "etablissement",
  "incendie-travail-consigne-affichee": "etablissement",
  "incendie-travail-exercice-semestriel": "etablissement",
  "information-etablissement-affichages-obligatoires": "etablissement",
  "information-etablissement-avis-acces-duerp": "etablissement",
  "locaux-etablissement-eau-potable": "etablissement",
  "locaux-etablissement-emplacement-restauration": "etablissement",
  "locaux-etablissement-installations-sanitaires": "etablissement",
  "locaux-etablissement-local-restauration": "etablissement",
  "prevention-etablissement-cse": "etablissement",
  "prevention-etablissement-liste-personnes-qualifiees": "etablissement",
  "prevention-etablissement-reglement-interieur": "etablissement",
  "prevention-etablissement-salarie-designe": "etablissement",
  "sante-travail-etablissement-adhesion-spst": "etablissement",
  "sante-travail-etablissement-fiche-entreprise": "etablissement",
  "sante-travail-etablissement-liste-postes-risques": "etablissement",
  "sante-travail-salarie-sir": "salarie",
  "sante-travail-salarie-sir-categorie-a": "salarie",
  "sante-travail-salarie-sir-visite-intermediaire": "salarie",
  "sante-travail-salarie-vip": "salarie",
  "sante-travail-salarie-vip-adaptee": "salarie",
  "secours-etablissement-materiel": "etablissement",
  "secours-etablissement-mesures": "etablissement",
  "secours-salarie-secouriste": "salarie",
  "signalisation-etablissement-alimentation-secours-presence": "etablissement",
  "signalisation-etablissement-alimentations-secours-annuelle": "etablissement",
  "signalisation-etablissement-cheminements-evacuation": "etablissement",
  "signalisation-etablissement-entretien": "etablissement",
  "signalisation-etablissement-obstacles-zones-dangereuses": "etablissement",
  "signalisation-etablissement-risques-residuels": "etablissement",
  "signalisation-etablissement-signaux-lumineux-acoustiques-semestrielle":
    "etablissement",
  // RETIRÉES. Portée par l'établissement dès sa création le 2026-09-01
  // (`767b862`), retirée le 2026-09-02. Les quatre autres retraits datent
  // d'avant l'ADR-022, quand tout était porté par un équipement.
  "incendie-erp-cat1-4-visite-commission": "etablissement",
};

const porteurConnu = (id: string): PorteurObligation =>
  PORTEURS_HORS_EQUIPEMENT[id] ?? "equipement";

const RENVOI =
  "Voir `docs/chantiers-ouverts.md` § 11, lot 2 (« DEUX MÉCANISMES ») et " +
  "l'ADR-034, N4, point 5 (« Laissé ouvert, écrit »).";

/**
 * Une succession que la réconciliation sait CONTINUER, entre deux porteurs.
 * `null` = elle la sait ; sinon, pourquoi pas. Recopie délibérée de ce que fait
 * `reconcilierCalendrier`, pas un appel : le jour où le mécanisme s'étend, cette
 * table s'étend avec lui, dans le même commit, et c'est ce qui rend l'extension
 * visible.
 */
function successionNonServie(
  de: PorteurObligation,
  vers: PorteurObligation,
): string | null {
  if (de === "salarie" || vers === "salarie") {
    return (
      "PORTEUR SALARIÉ : ses lignes naissent d'un `TitreSalarie`, dont " +
      "l'`obligationId` n'est réécrit par aucune succession. Les titres " +
      "resteraient sur l'ancien identifiant : plus de ligne au calendrier, " +
      "« Ne s'applique plus » sur Équipe (`etatDuTitre`), hors du badge du rail. " +
      "Il faut d'abord faire suivre la succession aux titres — lecture " +
      "(`etatDuTitre`, `compterTitresEnRetard`, `genererVerificationsDepuisTitres`) " +
      "ou migration des `TitreSalarie` — et trancher le titre qui prime quand " +
      "une personne détient les deux."
    );
  }
  if (de === vers) return null; // adoption
  if (de === "equipement" && vers === "etablissement") return null; // report
  return (
    `CHANGEMENT DE PORTEUR ${de} → ${vers} : ni l'adoption (même porteur) ni ` +
    "le report d'échéance (équipement → établissement) ne le servent. " +
    "L'ancienne ligne serait archivée et la nouvelle naîtrait « à planifier », " +
    "sans rien hériter."
  );
}

describe("fusible — une obligation ne change pas de porteur sans le dire", () => {
  it("chaque obligation vivante a le porteur que le registre lui connaît", () => {
    const ecarts = obligationsConformite
      .filter((o) => porteurDe(o) !== porteurConnu(o.id))
      .map((o) => {
        const avant = porteurConnu(o.id);
        const apres = porteurDe(o);
        return avant === "equipement" && !(o.id in PORTEURS_HORS_EQUIPEMENT)
          ? `${o.id} — porté par ${apres}, absent du registre. NEUVE : ajoutez ` +
              `la ligne à \`PORTEURS_HORS_EQUIPEMENT\`. Si elle EXISTAIT déjà ` +
              `portée par un équipement, c'est un changement de porteur, voir plus bas.`
          : `${o.id} — ${avant} → ${apres}.`;
      });

    expect(
      ecarts,
      "Une obligation a changé de porteur en gardant son identifiant (ou une " +
        "obligation hors équipement est entrée sans être inscrite). Changer de " +
        "porteur SANS traitement explicite archive les lignes de l'ancien porteur " +
        "et fait naître la nouvelle « à planifier », sans rien hériter — c'est " +
        "ce qu'a fait le lot « faux négatifs d'ancrage » le 2026-08-31, en " +
        "silence. Avant de mettre le registre à jour : soit un NOUVEL " +
        "identifiant, l'ancien inscrit à `OBLIGATIONS_RETIREES` avec `absorbePar` " +
        "(servi pour équipement → établissement, voir le test des retraits), soit " +
        "la décision écrite d'accepter la perte de continuité. " +
        RENVOI,
    ).toEqual([]);
  });

  it("chaque entrée du registre est vivante ou déclarée retirée", () => {
    // Sans ceci, une ligne effacée du registre au retrait de son obligation
    // ferait lire « équipement » au fusible des retraits — qui laisserait alors
    // passer un salarié absorbé par l'établissement.
    const vivants = new Set(obligationsConformite.map((o) => o.id));
    const fantomes = Object.keys(PORTEURS_HORS_EQUIPEMENT).filter(
      (id) => !vivants.has(id) && !(id in OBLIGATIONS_RETIREES),
    );
    expect(
      fantomes,
      "Un identifiant du registre n'existe plus et n'est pas inscrit à `OBLIGATIONS_RETIREES`.",
    ).toEqual([]);
  });

  it("chaque retrait avec absorbant relie deux porteurs que la réconciliation sait continuer", () => {
    const nonServis = Object.entries(OBLIGATIONS_RETIREES).flatMap(
      ([id, r]) => {
        if (r.absorbePar === null) return [];
        const absorbant = obligationParId(r.absorbePar);
        // Absorbant disparu : `conformite.test.ts` le signale déjà.
        if (absorbant === undefined) return [];
        const raison = successionNonServie(
          porteurConnu(id),
          porteurDe(absorbant),
        );
        return raison === null ? [] : [`${id} → ${r.absorbePar} : ${raison}`];
      },
    );
    expect(
      nonServis,
      "`absorbePar` déclare une succession que `reconcilierCalendrier` ne sait " +
        "pas continuer. " +
        RENVOI,
    ).toEqual([]);
  });

  it("chaque `succedeA` relie deux porteurs que la réconciliation sait continuer", () => {
    // `adopter` exige le même porteur, et `succedeA` ne passe pas par le report
    // d'échéance, réservé aux obligations retirées : pour une scission, seule
    // l'identité de porteur est servie — et jamais pour un salarié.
    const nonServis = obligationsConformite.flatMap((o) =>
      (o.succedeA ?? []).flatMap((pred) => {
        const predecesseur = obligationParId(pred);
        if (predecesseur === undefined) return [];
        const de = porteurDe(predecesseur);
        const vers = porteurDe(o);
        const raison =
          de === vers && de !== "salarie"
            ? null
            : (successionNonServie(de, vers) ??
              `CHANGEMENT DE PORTEUR ${de} → ${vers} par scission : \`adopter\` ` +
                "exige le même porteur, et le report d'échéance ne sert que les retraits.");
        return raison === null ? [] : [`${o.id} succède à ${pred} : ${raison}`];
      }),
    );
    expect(
      nonServis,
      "`succedeA` déclare une succession que `reconcilierCalendrier` ne sait " +
        "pas continuer. " +
        RENVOI,
    ).toEqual([]);
  });
});
