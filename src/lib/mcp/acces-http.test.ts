import { describe, expect, it } from "vitest";
import {
  clesEgales,
  lireConfigAccesHttp,
  resoudreScopeDepuisCle,
} from "./acces-http";

/**
 * Accès au serveur MCP distant.
 *
 * Le secret vit dans l'URL : c'est le seul rempart devant des données
 * métier, et il n'y a pas de seconde barrière derrière lui. Ce fichier
 * couvre les trois façons de le perdre :
 *
 *   1. démarrer avec une configuration incomplète et servir quand même ;
 *   2. accepter une clé faible, qu'un balayage finirait par trouver ;
 *   3. comparer les clés caractère par caractère, ce qui laisse le temps de
 *      réponse trahir le secret.
 */

const CLE_VALIDE = "K7dQx2mNpR4vTzL9wYbF3sJhC6nAeU8gXtM1oPqW5rE";
const ETAB = "etab_1";

const env = (over: Record<string, string | undefined> = {}) =>
  ({
    MCP_CLE: CLE_VALIDE,
    MCP_ETABLISSEMENT_ID: ETAB,
    ...over,
  }) as unknown as NodeJS.ProcessEnv;

describe("lireConfigAccesHttp", () => {
  it("refuse de configurer un accès sans clé", () => {
    expect(lireConfigAccesHttp(env({ MCP_CLE: undefined }))).toBeNull();
  });

  it("refuse de configurer un accès sans établissement", () => {
    expect(
      lireConfigAccesHttp(env({ MCP_ETABLISSEMENT_ID: undefined })),
    ).toBeNull();
  });

  it("refuse une clé trop courte pour être le seul secret", () => {
    expect(lireConfigAccesHttp(env({ MCP_CLE: "secret123" }))).toBeNull();
  });

  it("n'invente jamais de clé par défaut", () => {
    // Un secret par défaut est un secret public : sans MCP_CLE, la route
    // doit rester fermée, pas retomber sur une valeur connue.
    const config = lireConfigAccesHttp({} as unknown as NodeJS.ProcessEnv);
    expect(config).toBeNull();
  });

  it("déclare l'hôte de PUBLIC_APP_URL parmi les hôtes autorisés", () => {
    const config = lireConfigAccesHttp(
      env({ PUBLIC_APP_URL: "https://app.rojer.fr" }),
    );
    expect(config?.hotesAutorises).toContain("app.rojer.fr");
    // localhost reste accepté pour le développement.
    expect(config?.hotesAutorises).toContain("localhost");
  });

  it("accepte des hôtes déclarés à la main, sans schéma ni chemin", () => {
    const config = lireConfigAccesHttp(
      env({ MCP_HOTES: "rojer.fr, mcp.rojer.fr" }),
    );
    expect(config?.hotesAutorises).toEqual(
      expect.arrayContaining(["rojer.fr", "mcp.rojer.fr"]),
    );
  });
});

describe("clesEgales", () => {
  it("reconnaît la bonne clé", () => {
    expect(clesEgales(CLE_VALIDE, CLE_VALIDE)).toBe(true);
  });

  it("rejette une clé différente", () => {
    expect(clesEgales("autre", CLE_VALIDE)).toBe(false);
  });

  it("rejette une clé de longueur différente sans lever", () => {
    // timingSafeEqual refuse deux tampons de tailles différentes : en
    // comparant des empreintes, la longueur du candidat ne peut plus
    // provoquer d'exception — ni donc distinguer « mauvaise longueur » de
    // « mauvaise valeur ».
    expect(() => clesEgales("", CLE_VALIDE)).not.toThrow();
    expect(clesEgales("", CLE_VALIDE)).toBe(false);
    expect(clesEgales(CLE_VALIDE + "x", CLE_VALIDE)).toBe(false);
  });

  it("rejette un préfixe correct", () => {
    // Le cas que casserait une comparaison naïve : une clé qui commence
    // bien ne doit pas se distinguer d'une clé qui ne commence pas bien.
    expect(clesEgales(CLE_VALIDE.slice(0, -1), CLE_VALIDE)).toBe(false);
  });
});

describe("resoudreScopeDepuisCle", () => {
  const config = lireConfigAccesHttp(env());

  it("donne la portée configurée pour la bonne clé", () => {
    expect(resoudreScopeDepuisCle(CLE_VALIDE, config)).toEqual({
      etablissementId: ETAB,
    });
  });

  it("refuse une mauvaise clé", () => {
    expect(resoudreScopeDepuisCle("pas-la-bonne", config)).toBeNull();
  });

  it("refuse une clé absente", () => {
    expect(resoudreScopeDepuisCle(undefined, config)).toBeNull();
  });

  it("refuse tout quand la configuration est absente", () => {
    // Déploiement sans variables d'environnement : la route existe dans le
    // code mais ne doit servir personne, y compris avec une clé qui serait
    // valide ailleurs.
    expect(resoudreScopeDepuisCle(CLE_VALIDE, null)).toBeNull();
  });
});
