import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  cheminDEcriture,
  etablitLAppartenance,
  modulesServerAction,
} from "./tenancy-sonde";
import {
  borneeParConstruction,
  decoupe,
  fonctionsExposees,
  etablitSaPorteeLocale,
  LECTURE,
  exportsDeValeur,
  litDansLeFichier,
  portePortee,
} from "./tenancy-portee";

/**
 * Toute lecture d'une ligne rattachée à un établissement établit sa portée.
 *
 * ## Pourquoi ce test existe
 *
 * Huit lectures sans prédicat d'appartenance ont été corrigées la semaine du
 * 2026-08-25. La règle a été écrite dans le dépôt — `batiments/queries.ts` la
 * formule ainsi : « une lecture qui ne le porte pas devient une fuite le jour
 * où quelqu'un rend la fonction publique », et `batimentParDefaut` porte le
 * prédicat MALGRÉ un appelant déjà vérifié, avec la note « décrit l'usage, pas
 * une dispense ».
 *
 * Un neuvième cas a été écrit le 2026-08-31, dans le seul module qui ait ajouté
 * des appels Prisma ce jour-là. **Une convention écrite ne se fait pas
 * respecter par un lot pressé** : c'est le constat qui a fait écrire ce test,
 * plus que le défaut lui-même.
 *
 * ## Ce que le test vérifie, et pourquoi cette formulation
 *
 * Une première rédaction cherchait `userId` dans le `where` de chaque appel.
 * Elle rendait **treize faux positifs** : le dépôt porte la portée de plusieurs
 * façons légitimes, et exiger une seule forme aurait crié à tort — ce qui est
 * la façon la plus sûre de faire désactiver un garde-fou.
 *
 * Les trois formes recensées, toutes justes :
 *
 *  1. le prédicat dans le `where` — `etablissement: { entreprise: { userId } }` ;
 *  2. un helper de portée qui l'encapsule — `where: { etablissementId, etablissement }`
 *     où `etablissement` vient de `portee()` (`salaries/queries.ts`) ;
 *  3. la fonction établit elle-même l'appartenance et n'emploie ensuite que
 *     l'identifiant vérifié — `const { etablissement } = await requireEtablissement(id)`
 *     puis `where: { etablissementId: etablissement.id }` (`prestataires/queries.ts`).
 *
 * L'invariant retenu est donc plus faible et plus vrai : **une fonction qui lit
 * une ligne rattachée à un établissement doit établir sa portée d'une manière ou
 * d'une autre.** Il n'attrape pas tout — une fonction qui appellerait
 * `requireUser()` sans se servir du résultat le passerait — mais il attrape
 * exactement la forme des neuf défauts constatés : une lecture qui ne mentionne
 * la portée nulle part.
 *
 * ## Élargissement du 2026-10-13 (vérification ASVS 5.0.0, V8.4.1)
 *
 * La vérification a retiré le prédicat `userId` de `getEtablissement` (M2),
 * entrée d'une vingtaine de pages : ce test est resté VERT. Deux raisons :
 *
 *  - il ne regardait que les fonctions dont le corps mentionne
 *    `etablissementId` — `getEtablissement` lit par `id` ; sur les lectures
 *    exportées des `queries.ts`, moins d'une sur deux était examinée ;
 *  - `requireUser` comptait comme portée, et le corps muté le gardait.
 *
 * Il ne voyait pas non plus les server actions qui ne font que lire : une
 * lecture sans session ni portée injectée dans `lignesEtatsPermanentsPourWidget`
 * (aujourd'hui `resumeEtatsPermanentsPourWidget`)
 * (M3) passait les deux balayages, celui-ci ne lisant que des `queries.ts`,
 * `tenancy-ecritures` que des écritures.
 *
 * D'où la règle actuelle, plus étroite sur le critère et plus large sur le
 * champ : TOUTE fonction exportée d'un `queries.ts` qui lit en base, et TOUTE
 * fonction exportée d'un module `"use server"` qui n'écrit pas, établit sa
 * portée au propriétaire — par un helper `require…`/`assert…` de `scope.ts`,
 * `portee(`, ou un prédicat `userId` posé dans la requête (`where: { … userId`,
 * ou `entreprise: { userId` hors littéral `where`, forme des lectures bornées
 * au compte comme `permisDuCompte`). `requireUser` seul ne compte plus : il
 * prouve l'authentification, pas l'appartenance.
 *
 * Ce test ne vérifie pas l'ORDRE (une lecture placée avant le contrôle
 * d'appartenance) : c'est l'objet d'une autre garde, `tenancy-oracle`.
 *
 * ## L'exemption, et pourquoi elle est nommée une par une
 *
 * `getRegistrePublicParSlug` lit sans authentification, délibérément : le
 * registre d'accessibilité a une page publique, c'est sa raison d'être. Elle est
 * inscrite ci-dessous plutôt que détectée par une heuristique — une exemption
 * qui se devine est une exemption qu'on s'accorde sans y penser.
 */

type Exemption = {
  /** Ce qui borne la lecture à la place d'un prédicat propriétaire. */
  garde: string;
  raison: string;
};

/**
 * Les lectures qui ne portent pas le prédicat propriétaire, chacune avec ce qui
 * la borne. La liste NE PEUT QUE RÉTRÉCIR : `PLAFOND_EXEMPTIONS` est figé à sa
 * taille, et une exemption devenue superflue (la fonction s'est mise à porter
 * sa portée) fait échouer le test jusqu'à ce qu'on la retire.
 */
const EXEMPTIONS = new Map<string, Exemption>([
  [
    "accessibilite/queries.ts:getRegistrePublicParSlug",
    {
      garde: "registre.publie",
      raison:
        "Lecture publique par slug, sans auth : le registre d'accessibilité est " +
        "consultable par un tiers, c'est l'objet du module. Elle ne rend que des " +
        "champs publiables et `null` si le registre n'est pas publié.",
    },
  ],
  [
    "signatures/queries.ts:getSignature",
    {
      garde: "SELECT_PREUVE",
      raison:
        "Lecture publique par identifiant `sig_…` (page /verifier/[id], ADR-006) : " +
        "un tiers contrôle la preuve sans compte. La projection se limite à la preuve.",
    },
  ],
  [
    "signatures/queries.ts:listSignatures",
    {
      garde: "objetId",
      raison:
        "Contrat d'appel : la clé (objetType, objetId) vient d'un objet déjà " +
        "chargé par une query scopée. ~~Un seul appelant au 2026-10-13 " +
        "(`verifications/[verificationId]/page.tsx`, `r.id` d'une vérification " +
        "scopée).~~ [2026-10-27 : cette page passe par `listSignaturesDesObjets`, " +
        "scopée dans la requête ; restent `permis-feu/queries.ts` et " +
        "`plan-prevention/queries.ts`, objets chargés scopés.] Dette : la doctrine " +
        "du module veut le prédicat dans la requête.",
    },
  ],
  ...(
    [
      "getFraicheurCalendrier",
      "getFicheEtablissement",
      "getEtatDuerp",
      "listerActions",
      "listerEquipements",
      "listerVerifications",
      "getNomEtablissement",
      // 2026-10-14 : entrée par `lot/mcp-inventaire`, même garde — `where:
      // { etablissementId }`.
      "getParcEquipements",
    ] as const
  ).map(
    (nom) =>
      [
        `mcp/queries.ts:${nom}`,
        {
          garde: "etablissementId",
          raison:
            "Serveur MCP, hors runtime Next (pas de session) : la portée est " +
            "l'`etablissementId` tiré du jeton ou de la clé par la route, et " +
            "chaque `where` le porte (en-tête de `mcp/queries.ts`).",
        },
      ] as const,
  ),
  [
    "lib/auth/actions.ts:definirMotDePasseAction",
    {
      garde: "supabase.auth",
      raison:
        "Nouveau mot de passe au retour du lien de réinitialisation : agit sur " +
        "le compte de la session de récupération, ne lit aucune donnée de dossier.",
    },
  ],
  [
    "lib/auth/actions.ts:signOutAction",
    { garde: "supabase.auth", raison: "Déconnexion : ne lit aucune donnée de dossier." },
  ],
]);

/** Taille figée : on retire une exemption, on n'en ajoute pas sans le voir. */
// ~~15~~ → 16 le 2026-10-14 (intégration) : `mcp/queries.ts:getParcEquipements`,
// entrée par `lot/mcp-inventaire` sous la même garde que ses sept sœurs MCP.
// ~~16~~ → 13 le 2026-10-14 (`lot/nextjs-securite-1014`) : 16 − 4 + 1. Les
// trois actions d'entrée (connexion, inscription, mot de passe oublié)
// écrivent désormais — la limitation de débit — et passent aux exemptions de
// `tenancy-ecritures.test.ts` ; `verifierIntegriteSignature` n'est plus une
// action serveur (`signatures/verification-publique.ts`) ; entre
// `definirMotDePasseAction`, la réinitialisation passée côté serveur.
const PLAFOND_EXEMPTIONS = 13;

const RACINE = join(process.cwd(), "src/lib");
const SRC = join(process.cwd(), "src");

type Lecture = { cle: string; scopee: boolean; corps: string };

/**
 * La portée de `nom` : établie dans le fichier (helper, prédicat), ou par
 * construction — tout ce qu'elle lit passe par le client borné
 * (`borneeParConstruction`, `tenancy-portee.ts`, depuis le 2026-10-30).
 */
function porteeDe(fichier: string, fns: ReturnType<typeof decoupe>, nom: string): boolean {
  return etablitSaPorteeLocale(fns, nom) || borneeParConstruction(fichier, nom, LECTURE);
}

function modulesQueries(): { chemin: string; source: string }[] {
  return readdirSync(RACINE, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((d) => {
      try {
        const source = readFileSync(join(RACINE, d.name, "queries.ts"), "utf8");
        return [{ chemin: `${d.name}/queries.ts`, source }];
      } catch {
        return [];
      }
    });
}

/** Toutes les fonctions exportées d'un `queries.ts` qui lisent en base. */
function lecturesDesQueries(): Lecture[] {
  const out: Lecture[] = [];
  for (const { chemin, source } of modulesQueries()) {
    const fns = decoupe(source);
    for (const fn of fns.values()) {
      if (!fn.exportee || !litDansLeFichier(fns, fn.nom)) continue;
      out.push({
        cle: `${chemin}:${fn.nom}`,
        scopee: porteeDe(join(RACINE, chemin), fns, fn.nom),
        corps: fn.corps,
      });
    }
  }
  return out;
}

/**
 * Toutes les fonctions exportées d'un module `"use server"` qui n'écrivent
 * pas : ce sont des points d'entrée appelables par n'importe quel client, au
 * même titre qu'une route. Qu'elles lisent ici ou par une query importée,
 * elles établissent leur portée elles-mêmes.
 */
function actionsEnLecture(): Lecture[] {
  const out: Lecture[] = [];
  for (const fichier of modulesServerAction()) {
    const fns = decoupe(readFileSync(fichier, "utf8"));
    for (const fn of fns.values()) {
      if (!fn.exportee || cheminDEcriture(fichier, fn.nom)) continue;
      out.push({
        cle: fichier.slice(SRC.length + 1) + ":" + fn.nom,
        scopee: porteeDe(fichier, fns, fn.nom),
        corps: fn.corps,
      });
    }
  }
  return out;
}

const toutes = () => [...lecturesDesQueries(), ...actionsEnLecture()];

describe("les lectures exportées et les server actions qui ne font que lire", () => {
  it("le découpage voit toutes les fonctions exportées des queries", () => {
    // Contre-épreuve : `fonctions` ne voyait ni `cache(async function`, ni les
    // génériques. Tout export de valeur doit être découpé — sinon il échappe.
    const manquees = modulesQueries().flatMap(({ chemin, source }) => {
      const vues = decoupe(source);
      return exportsDeValeur(source)
        .filter((nom) => !vues.has(nom))
        .filter((nom) => !/^[A-Z_]+$/.test(nom)) // constantes
        .map((nom) => `${chemin}:${nom}`);
    });
    expect(manquees, "Exports non découpés : la garde ne les voit pas.").toEqual([]);
  });

  it("établissent toutes leur portée au propriétaire, ou sont exemptées nommément", () => {
    const lectures = lecturesDesQueries();
    const actions = actionsEnLecture();

    // Bornes basses : une découpe qui cesserait de trouver les fonctions
    // rendrait ce test vert et vide.
    expect(lectures.length, "Lectures de queries trouvées").toBeGreaterThan(50);
    // ~~> 5~~ → > 3 le 2026-10-14 : quatre des actions en lecture seule ont
    // quitté le champ (voir `PLAFOND_EXEMPTIONS`), il en reste cinq.
    expect(actions.length, "Actions en lecture seule trouvées").toBeGreaterThan(3);
    // Et les deux défauts qui ont fait élargir ce test sont dans le champ.
    const cles = new Set([...lectures, ...actions].map((l) => l.cle));
    expect(cles).toContain("etablissements/queries.ts:getEtablissement");
    expect(cles).toContain(
      "lib/etats-permanents/lecture-widget.ts:resumeEtatsPermanentsPourWidget",
    );

    const nues = [...lectures, ...actions]
      .filter((l) => !l.scopee && !EXEMPTIONS.has(l.cle))
      .map((l) => l.cle);

    expect(
      nues,
      "Ces fonctions lisent sans établir leur portée au propriétaire. Portez le " +
        "prédicat dans la requête — `etablissement: { entreprise: { userId } }` — " +
        "ou appelez un helper de `scope.ts` avant de lire. `requireUser` seul ne " +
        "suffit pas : il prouve qui appelle, pas à qui est la donnée.",
    ).toEqual([]);
  });

  it("chaque exemption désigne une lecture nue, et son garde est toujours là", () => {
    const parCle = new Map(toutes().map((l) => [l.cle, l]));
    const orphelines = [...EXEMPTIONS.keys()].filter((k) => !parCle.has(k));
    expect(orphelines, "Exemptions sans fonction : les retirer.").toEqual([]);

    const superflues = [...EXEMPTIONS.keys()].filter((k) => parCle.get(k)?.scopee);
    expect(
      superflues,
      "Ces fonctions portent désormais leur portée : retirer leur exemption.",
    ).toEqual([]);

    const sansGarde = [...EXEMPTIONS]
      .filter(([k, { garde }]) => {
        const l = parCle.get(k);
        return l && !l.corps.includes(garde.split(".")[0]);
      })
      .map(([k]) => k);
    expect(sansGarde, "Le garde nommé n'est plus dans le corps.").toEqual([]);
  });

  it("la liste des exemptions ne fait que rétrécir", () => {
    expect(
      EXEMPTIONS.size,
      "Une exemption de plus : ce plafond se relève à la main, et se justifie.",
    ).toBeLessThanOrEqual(PLAFOND_EXEMPTIONS);
  });

  it("reconnaît la portée par la chaîne `etablissement: { entreprise: { userId } }`", () => {
    // Coexistence avec les lectures bornées au compte d'une autre branche
    // (`appareilDuCompte`, `permisDuCompte`) : leur forme doit compter.
    const permisDuCompte = `async function permisDuCompte(permisFeuId) {
      const user = await requireUser();
      const permis = await prisma.permisFeu.findFirst({
        where: { id: permisFeuId, etablissement: { entreprise: { userId: user.id } } },
      });
    }`;
    expect(etablitLAppartenance(permisDuCompte)).toBe(true);
    const horsWhere = `const scope = { etablissementId, etablissement: { entreprise: { userId: user.id } } };`;
    expect(portePortee(horsWhere)).toBe(true);

    const appelant = decoupe(
      `${permisDuCompte}\nexport async function lire(id) { const p = await permisDuCompte(id); return p; }`,
    );
    expect(etablitSaPorteeLocale(appelant, "lire")).toBe(true);

    // Et ce qui ne doit pas compter : l'authentification seule.
    const nue = decoupe(
      `export async function lire(id) { await requireUser(); return prisma.etablissement.findFirst({ where: { id } }); }`,
    );
    expect(etablitSaPorteeLocale(nue, "lire")).toBe(false);
  });

  it("la portée par construction : le client borné compte, le brut et ce qu'il peut joindre non", () => {
    // 2026-10-30, lot 2b de l'isolation. Bornes, pas liste : un module migré
    // compte, un module qui détient le brut ne compte pas même s'il lit par
    // `db`, et une fonction qui reçoit son client d'un module au brut est
    // exposée (`lireX(prisma)` → `lireXDuCompte(prisma, …)`).
    const lib = (f: string) => join(RACINE, f);
    expect(borneeParConstruction(lib("versions/queries.ts"), "getVersion", LECTURE)).toBe(true);
    expect(borneeParConstruction(lib("rapports/queries.ts"), "getRapport", LECTURE)).toBe(false);
    const exposees = fonctionsExposees();
    expect(exposees).toContain("lib/calendrier/passe.ts:lireEntrees");
    expect(exposees).toContain("lib/etablissements/marques-a-confirmer.ts:marquesAConfirmerDuDossier");
    expect(exposees).not.toContain("lib/controle/queries.ts:versionsDuDuerpDuDossier");
  });
});
