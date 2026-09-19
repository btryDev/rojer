import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ecrituresExposees,
  estServerAction,
  fonctions,
  modulesServerAction,
} from "./tenancy-sonde";

/**
 * Toute écriture exposée par une server action établit que la donnée
 * appartient au demandeur.
 *
 * ## Pourquoi ce test existe
 *
 * Sept fichiers `isolation.test.ts` rattrapent chacun une action qui écrivait
 * sur un identifiant reçu du client sans le confronter au compte :
 * `supprimerUnite` détruisait l'unité d'un autre client et ses risques en
 * cascade, `supprimerActionPlan` faisait un `delete` sur l'id brut,
 * `validerTransverses` marquait n'importe quel DUERP. Chaque fois le défaut a
 * été trouvé après coup, puis gardé un par un. Ce fichier garde la classe.
 *
 * Le cloisonnement entre clients est ENTIÈREMENT APPLICATIF ici — Prisma passe
 * outre la RLS. Un `where` oublié est une fuite, sans filet. Et c'est le côté
 * où le dégât ne se répare pas : une lecture qui fuit se voit, une suppression
 * qui traverse ne se voit plus.
 *
 * ## Ce qu'une relecture par mutation a trouvé, le 2026-09-19
 *
 * La première rédaction de ce balayage a été éprouvée en injectant les défauts
 * qu'elle prétendait interdire. Elle en laissait passer quatre classes, et
 * c'est ce lot qui les ferme :
 *
 *  1. **les écritures en transaction** : `prisma\.\w+\.` ne reconnaissait pas
 *     `tx.salarie.delete` (`\w+` ne couvre pas `$transaction`). Sept server
 *     actions qui écrivent n'étaient donc JAMAIS examinées, dont
 *     `supprimerBatiment`, `uploadRapport` et `finaliserOnboarding` ;
 *  2. **les écritures déléguées** : la résolution transitive ne servait qu'à
 *     trouver un marqueur de portée, jamais à découvrir une écriture.
 *     `regenererSansInvalider` (qui passe par `regenererUnePasse`) et
 *     `supprimerRapport` (qui passe par `recalculerLigne`, dans un autre
 *     module) n'étaient pas examinées non plus ;
 *  3. **`requireUser` comme marqueur** : il prouve l'AUTHENTIFICATION, pas
 *     l'appartenance. `await requireUser(); await prisma.salarie.delete({
 *     where: { id } })` passait — la forme exacte du défaut de
 *     `supprimerActionPlan`, que cet en-tête cite pourtant en motif ;
 *  4. **`userId` reconnu comme sous-chaîne n'importe où**, `data` compris :
 *     `poserSignatureAvecToken` ne passait que grâce à un `userId: null`
 *     redondant. Une exemption de fait, trouvée par hasard, que personne
 *     n'avait décidée — et qui serait tombée au premier nettoyage.
 *
 * Ce que la sonde reconnaît désormais est décrit dans `tenancy-sonde.ts`, avec
 * ce qu'elle ne voit toujours pas. L'essentiel : l'écriture se propage de
 * fonction en fonction, y compris d'un module à l'autre ; la PORTÉE, elle, ne
 * se propage que dans le fichier. Un helper d'un autre module qui borne pour
 * nous ne se devine pas — il se nomme, ci-dessous, dans les exemptions.
 *
 * ## Les exemptions, et pourquoi elles nomment leur garde
 *
 * Une écriture peut être bornée autrement que par un helper de `scope.ts` :
 * une création pour soi, un jeton d'accès, un garde qui vit dans un autre
 * module. Chacune de ces actions est inscrite ici, avec sa raison ET LE NOM DE
 * CE QUI LA BORNE — et le second test vérifie que ce garde est toujours appelé
 * dans son corps. Une exemption qui ne nommerait que sa raison laisserait la
 * porte ouverte le jour où le garde disparaît : c'est exactement le scénario
 * qu'on vient de trouver sur `poserSignatureAvecToken`.
 */

type Exemption = {
  /** Ce qui borne l'écriture à la place d'un helper de `scope.ts`. */
  garde: string;
  raison: string;
};

const EXEMPTIONS = new Map<string, Exemption>([
  [
    "lib/entreprises/actions.ts:creerEntreprise",
    {
      garde: "requireUser",
      raison:
        "Crée la racine de la tenancy POUR SOI — `data: { userId: user.id }` " +
        "— : il n'y a pas encore d'appartenance à confronter, c'est cette " +
        "écriture qui la fonde.",
    },
  ],
  [
    "lib/onboarding/actions.ts:finaliserOnboarding",
    {
      garde: "requireUser",
      raison:
        "Même cas : l'entreprise et son premier établissement naissent dans " +
        "la même transaction, sous le `userId` du compte connecté.",
    },
  ],
  [
    "lib/signatures/actions.ts:poserSignatureAvecToken",
    {
      garde: "verifierAccessToken",
      raison:
        "Sans authentification par conception : la page publique " +
        "/acces/[token] sert un signataire externe, et c'est la connaissance " +
        "du jeton — plus l'OTP — qui vaut autorisation.",
    },
  ],
  [
    "lib/signatures/actions.ts:renvoyerCodeOtp",
    {
      garde: "verifierAccessToken",
      raison:
        "Même porte que la signature : le nouveau code part à l'adresse " +
        "enregistrée SUR le jeton, jamais à une adresse fournie par l'appelant.",
    },
  ],
  [
    "lib/versions/actions.ts:creerVersion",
    {
      garde: "construireSnapshot",
      raison:
        "`construireSnapshot` filtre le DUERP sur `entreprise: { userId }` et " +
        "rend `null` pour celui d'un tiers — l'action s'arrête là, avant la " +
        "transaction. Garde d'un autre module, donc nommé ici.",
    },
  ],
]);

/**
 * Le compte relevé le 2026-09-19, après correction de la sonde : 84 écritures
 * exposées (73 avant, parce que transactions et délégations lui échappaient).
 *
 * DESCENDU À 83 LE MÊME JOUR, délibérément : le lot `signatures-acces-externe`
 * a sorti `emettreAccessToken` de la surface exposée — elle vit désormais dans
 * `access-tokens/emission.ts`, qui n'est pas un module `"use server"`. Une
 * action exposée de moins, parce qu'elle n'est plus un point d'entrée réseau.
 *
 * BORNE BASSE, ET NON ÉGALITÉ : une action de plus ne doit pas faire rougir un
 * lot qui n'a touché à rien ici, et une égalité se « répare » en recopiant le
 * nouveau nombre — donc cesse de vérifier. Une action de MOINS, en revanche,
 * est soit une suppression réelle (qu'on descend ici délibérément, en le
 * disant), soit une expression régulière qui a cessé de voir : le mode d'échec
 * courant des gardes qui lisent du source, et celui contre lequel `> 50` ne
 * protégeait plus de rien avec 73 relevées.
 */
const PLANCHER = 83;

describe("les écritures des server actions", () => {
  it("établissent toutes l'appartenance, ou sont exemptées nommément", () => {
    const toutes = ecrituresExposees();

    expect(
      toutes.length,
      `Moins de ${PLANCHER} écritures exposées trouvées : soit la sonde a ` +
        "cessé de les voir — et la garde ne garde rien —, soit des actions " +
        "ont réellement disparu, auquel cas on descend ce plancher à la main.",
    ).toBeGreaterThanOrEqual(PLANCHER);

    const nues = toutes
      .filter((e) => !e.scopee && !EXEMPTIONS.has(e.cle))
      .map((e) =>
        e.chemin.length > 1 ? `${e.cle} (écrit par ${e.chemin.at(-1)})` : e.cle,
      );

    expect(
      nues,
      "Ces server actions écrivent en base — directement ou par un helper — " +
        "sans établir que la donnée appartient au demandeur. L'identifiant " +
        "vient du client : le confronter au compte avec un helper de " +
        "`auth/scope.ts` (`requireDuerp`, `requireUnite`, " +
        "`assertEtablissementOwnership`…) AVANT d'écrire. `requireUser` ne " +
        "suffit pas : il dit qu'il y a un utilisateur, pas que cette ligne " +
        "est la sienne. Un appelant déjà vérifié ne dispense pas : toute " +
        "fonction exportée d'un module `\"use server\"` est un point d'entrée " +
        "joignable depuis le navigateur. Si l'écriture est bornée autrement " +
        "— création pour soi, jeton d'accès, garde d'un autre module —, " +
        "l'inscrire dans EXEMPTIONS avec le nom de ce qui la borne.",
    ).toEqual([]);
  });

  it("chaque exemption désigne une écriture, et son garde est toujours là", () => {
    // Trois façons pour une exemption de devenir une porte ouverte pour
    // personne — ou pire, pour n'importe qui : la fonction a disparu, elle
    // s'est bornée depuis (l'exemption ne sert plus qu'à couvrir le jour où
    // elle se débornera), ou le garde qu'elle nomme n'est plus appelé.
    const parCle = new Map(ecrituresExposees().map((e) => [e.cle, e]));

    const orphelines = [...EXEMPTIONS.keys()].filter((k) => !parCle.has(k));
    expect(
      orphelines,
      "Ces exemptions ne désignent plus aucune écriture exposée : les retirer.",
    ).toEqual([]);

    const superflues = [...EXEMPTIONS.keys()].filter(
      (k) => parCle.get(k)?.scopee,
    );
    expect(
      superflues,
      "Ces fonctions établissent maintenant l'appartenance par elles-mêmes : " +
        "l'exemption ne couvre plus rien et doit partir, sans quoi elle " +
        "couvrira la prochaine régression en silence.",
    ).toEqual([]);

    const sansGarde: string[] = [];
    for (const [cle, { garde }] of EXEMPTIONS) {
      const [chemin, nom] = cle.split(":");
      const source = readFileSync(join(process.cwd(), "src", chemin), "utf8");
      const fn = fonctions(source).find((f) => f.nom === nom);
      if (!fn || !new RegExp(`\\b${garde}\\(`).test(fn.corps)) {
        sansGarde.push(`${cle} → ${garde}`);
      }
    }
    expect(
      sansGarde,
      "Ces exemptions nomment un garde que la fonction n'appelle plus. " +
        "L'exemption reposait sur lui : la relire avant de la réécrire.",
    ).toEqual([]);
  });

  it("aucune server action ne reçoit le `userId` de son appelant", () => {
    // La dernière porte que le balayage ne saurait pas fermer : une action qui
    // prendrait `userId` en paramètre et le porterait dans son `where`
    // passerait pour bornée, alors que le client choisirait lui-même à quel
    // compte il s'adresse. Tant qu'aucune n'en reçoit, le `userId` d'un `where`
    // ne peut venir que de la session.
    const coupables: string[] = [];
    for (const fichier of modulesServerAction()) {
      const source = readFileSync(fichier, "utf8");
      for (const fn of fonctions(source)) {
        if (!fn.exportee) continue;
        const parametres = fn.corps.slice(0, fn.corps.indexOf(")"));
        if (/\buserId\b/.test(parametres)) coupables.push(fn.nom);
      }
    }
    expect(
      coupables,
      "Ces server actions reçoivent un `userId` du client : il n'établit " +
        "alors plus rien, puisque l'appelant le choisit.",
    ).toEqual([]);
  });

  it("ne confond pas une directive avec sa mention", () => {
    // `reconciliation.ts` dit en commentaire pourquoi il n'est PAS un
    // `"use server"`. Un balayage au grep l'y rangeait, et dénonçait à tort
    // la seule fonction du fichier.
    expect(estServerAction("// une note qui dit \"use server\"\nexport {};")).toBe(
      false,
    );
    const chemins = modulesServerAction();
    expect(chemins.some((c) => c.endsWith("lib/calendrier/reconciliation.ts"))).toBe(
      false,
    );
    expect(chemins.some((c) => c.endsWith("lib/risques/actions.ts"))).toBe(true);
  });
});
