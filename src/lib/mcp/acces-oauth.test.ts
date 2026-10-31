import { describe, expect, it, vi } from "vitest";
import {
  extraireJetonPorteur,
  lireConfigOauthMcp,
  metadonneesRessourceProtegee,
  reponseAuthentificationRequise,
  reponseChoixEtablissementRequis,
  resoudreScopeDepuisJeton,
  urlsRessource,
  type ChercheurEtablissement,
} from "./acces-oauth";

/**
 * Accès OAuth au serveur MCP distant (ADR-013, amendée par l'ADR-028).
 *
 * Ce qui est couvert ici, ce sont les façons de servir un client qu'on
 * aurait dû refuser, ou de refuser sans le dire comme il faut :
 *
 *   1. accepter un jeton qu'on n'a pas vérifié, ou dont le sujet est vide ;
 *   2. servir un utilisateur qui n'a pas d'établissement ;
 *   3. laisser une panne du vérificateur ouvrir la porte ;
 *   4. refuser sans l'en-tête qui déclenche le flux OAuth — auquel cas
 *      l'utilisateur voit une erreur au lieu d'un bouton « Connecter » ;
 *   5. **choisir à la place du porteur** quand il a plusieurs établissements,
 *      ou servir celui qu'un paramètre d'URL désigne sans le confronter à ce
 *      que ce porteur possède.
 */

const SUB = "3f1c8a52-9d44-4b7e-8e21-0c6f5b2a7d19";
const ETAB = "etab_1";
const AUTRE = "etab_2";

/** L'établissement du porteur, dans la forme que la recherche rend. */
const unEtab = (id: string, nom = `Site ${id}`) => ({ id, nom });

const env = (over: Record<string, string | undefined> = {}) =>
  ({
    NEXT_PUBLIC_SUPABASE_URL: "https://abcdef.supabase.co",
    MCP_HOTES: "rojer.fr",
    ...over,
  }) as unknown as NodeJS.ProcessEnv;

const requete = (autorisation?: string, url = "https://rojer.fr/api/mcp") =>
  new Request(url, {
    method: "POST",
    headers: autorisation ? { authorization: autorisation } : {},
  });

/** Cherche qui rend la liste donnée — la forme d'`ChercheurEtablissement`. */
const cherche = (...ids: string[]): ChercheurEtablissement =>
  vi.fn(async () => ids.map((id) => unEtab(id)));

const deps = (over: Partial<Parameters<typeof resoudreScopeDepuisJeton>[1]> = {}) => ({
  verifier: vi.fn(async () => ({ sub: SUB })),
  chercherEtablissement: cherche(ETAB),
  ...over,
});

describe("lireConfigOauthMcp", () => {
  it("refuse de se configurer sans projet Supabase", () => {
    expect(
      lireConfigOauthMcp(env({ NEXT_PUBLIC_SUPABASE_URL: undefined })),
    ).toBeNull();
  });

  it("désigne l'émetteur Supabase comme serveur d'autorisation", () => {
    expect(lireConfigOauthMcp(env())?.issuer).toBe(
      "https://abcdef.supabase.co/auth/v1",
    );
  });

  it("déclare l'origine publique en https", () => {
    expect(lireConfigOauthMcp(env())?.origineDeclaree).toBe("https://rojer.fr");
  });

  it("tolère une URL Supabase terminée par une barre oblique", () => {
    const config = lireConfigOauthMcp(
      env({ NEXT_PUBLIC_SUPABASE_URL: "https://abcdef.supabase.co/" }),
    );
    expect(config?.issuer).toBe("https://abcdef.supabase.co/auth/v1");
  });

  it("ne déclare aucune origine quand seule la boucle locale est connue", () => {
    // Le port de développement n'est pas déclaré et varie : l'origine sera
    // lue sur la requête, seul endroit où il est connu.
    expect(lireConfigOauthMcp(env({ MCP_HOTES: undefined }))?.origineDeclaree)
      .toBeNull();
  });
});

describe("urlsRessource", () => {
  it("construit des URLs absolues depuis l'origine déclarée", () => {
    // RFC 9728 : `resource` est une URL, pas un chemin, et doit correspondre
    // exactement à ce que le client a saisi.
    expect(urlsRessource(lireConfigOauthMcp(env()), requete())).toEqual({
      ressource: "https://rojer.fr/api/mcp",
      urlMetadonnees:
        "https://rojer.fr/.well-known/oauth-protected-resource/api/mcp",
    });
  });

  it("préfère l'origine déclarée à l'hôte de la requête", () => {
    // Derrière un proxy, l'hôte de la requête est celui du dernier saut —
    // pas celui que le client a saisi.
    const interne = new Request("http://10.0.0.4:8080/api/mcp", {
      method: "POST",
      headers: { host: "10.0.0.4:8080" },
    });
    expect(urlsRessource(lireConfigOauthMcp(env()), interne).ressource).toBe(
      "https://rojer.fr/api/mcp",
    );
  });

  it("conserve le port en développement, faute d'origine déclarée", () => {
    // Le cas qui casserait la correspondance exacte : sans le port, le
    // client refuserait le document.
    const config = lireConfigOauthMcp(env({ MCP_HOTES: undefined }));
    const locale = new Request("http://localhost:3000/api/mcp", {
      method: "POST",
      headers: { host: "localhost:3000" },
    });
    expect(urlsRessource(config, locale).ressource).toBe(
      "http://localhost:3000/api/mcp",
    );
  });

  it("honore les en-têtes de transfert quand rien n'est déclaré", () => {
    const config = lireConfigOauthMcp(env({ MCP_HOTES: undefined }));
    const derriereProxy = new Request("http://10.0.0.4/api/mcp", {
      method: "POST",
      headers: {
        host: "10.0.0.4",
        "x-forwarded-host": "rojer.fr",
        "x-forwarded-proto": "https",
      },
    });
    expect(urlsRessource(config, derriereProxy).ressource).toBe(
      "https://rojer.fr/api/mcp",
    );
  });
});

describe("extraireJetonPorteur", () => {
  it("lit un jeton porteur", () => {
    expect(extraireJetonPorteur(requete("Bearer abc.def.ghi"))).toBe(
      "abc.def.ghi",
    );
  });

  it("accepte le schéma quelle que soit la casse", () => {
    // RFC 6750 : le schéma est insensible à la casse.
    expect(extraireJetonPorteur(requete("bearer abc"))).toBe("abc");
    expect(extraireJetonPorteur(requete("BEARER abc"))).toBe("abc");
  });

  it("ignore un autre schéma d'autorisation", () => {
    expect(extraireJetonPorteur(requete("Basic abc"))).toBeUndefined();
  });

  it("ignore un en-tête sans jeton", () => {
    expect(extraireJetonPorteur(requete("Bearer"))).toBeUndefined();
    expect(extraireJetonPorteur(requete("Bearer   "))).toBeUndefined();
  });

  it("ignore l'absence d'en-tête", () => {
    expect(extraireJetonPorteur(requete())).toBeUndefined();
  });

  it("ne lit jamais le jeton dans l'URL", () => {
    // La spécification MCP interdit le jeton en paramètre de requête.
    // L'accepter « pour dépanner » recréerait le défaut que la bascule OAuth
    // corrige justement.
    const avecParametre = new Request(
      "https://rojer.fr/api/mcp?access_token=abc",
      { method: "POST" },
    );
    expect(extraireJetonPorteur(avecParametre)).toBeUndefined();
  });
});

describe("resoudreScopeDepuisJeton", () => {
  it("donne la portée quand le porteur n'a qu'un établissement", async () => {
    // Un seul : rien à désambiguïser. Exiger le paramètre ici casserait tous
    // les connecteurs déjà configurés, sans rien protéger.
    const d = deps();
    await expect(
      resoudreScopeDepuisJeton(requete("Bearer jeton"), d),
    ).resolves.toEqual({ statut: "ok", scope: { etablissementId: ETAB, userId: SUB } });
    expect(d.chercherEtablissement).toHaveBeenCalledWith(SUB);
  });

  it("refuse une requête sans jeton, sans rien vérifier", async () => {
    const d = deps();
    await expect(resoudreScopeDepuisJeton(requete(), d)).resolves.toEqual({
      statut: "refus",
    });
    expect(d.verifier).not.toHaveBeenCalled();
  });

  it("refuse un jeton que le vérificateur rejette", async () => {
    const d = deps({ verifier: vi.fn(async () => null) });
    await expect(
      resoudreScopeDepuisJeton(requete("Bearer faux"), d),
    ).resolves.toEqual({ statut: "refus" });
  });

  it("refuse un jeton sans sujet", async () => {
    // Un jeton valide mais sans `sub` n'identifie personne : il ne doit
    // surtout pas retomber sur un établissement par défaut.
    const d = deps({ verifier: vi.fn(async () => ({})) });
    await expect(
      resoudreScopeDepuisJeton(requete("Bearer jeton"), d),
    ).resolves.toEqual({ statut: "refus" });
  });

  it("refuse un sujet qui n'est pas une chaîne", async () => {
    const d = deps({ verifier: vi.fn(async () => ({ sub: 42 })) });
    await expect(
      resoudreScopeDepuisJeton(requete("Bearer jeton"), d),
    ).resolves.toEqual({ statut: "refus" });
  });

  it("refuse un utilisateur sans établissement", async () => {
    // Compte créé mais onboarding non terminé : il n'y a rien à lire, et
    // certainement pas l'établissement de quelqu'un d'autre.
    const d = deps({ chercherEtablissement: cherche() });
    await expect(
      resoudreScopeDepuisJeton(requete("Bearer jeton"), d),
    ).resolves.toEqual({ statut: "refus" });
  });

  it("refuse quand le vérificateur tombe en panne", async () => {
    // JWKS injoignable : de l'extérieur c'est un refus, pas un 500. Une
    // panne ne doit jamais ouvrir la porte.
    const d = deps({
      verifier: vi.fn(async () => {
        throw new Error("JWKS injoignable");
      }),
    });
    await expect(
      resoudreScopeDepuisJeton(requete("Bearer jeton"), d),
    ).resolves.toEqual({ statut: "refus" });
  });
});

/**
 * La désambiguïsation (ADR-028).
 *
 * Ce que ces tests protègent tient en une phrase : **le serveur ne choisit
 * jamais parmi plusieurs.** Il choisissait, et le faisait en s'appuyant sur un
 * `@unique` qui n'existe plus — le `[0]` d'une liste, documenté comme sûr. Le
 * défaut aurait été muet : le porteur aurait toujours lu le même établissement,
 * le plus ancien, sans jamais rien voir qui l'indique.
 */
describe("le porteur de plusieurs établissements les désigne lui-même", () => {
  const aDeux = { chercherEtablissement: cherche(ETAB, AUTRE) };

  it("ne choisit pas : il rend la liste, entière", async () => {
    const d = deps(aDeux);
    await expect(
      resoudreScopeDepuisJeton(requete("Bearer jeton"), d),
    ).resolves.toEqual({
      statut: "choix_requis",
      etablissements: [unEtab(ETAB), unEtab(AUTRE)],
    });
  });

  it("sert celui que l'URL désigne, quand il lui appartient", async () => {
    const d = deps(aDeux);
    await expect(
      resoudreScopeDepuisJeton(
        requete("Bearer jeton", `https://rojer.fr/api/mcp?etablissement=${AUTRE}`),
        d,
      ),
    ).resolves.toEqual({ statut: "ok", scope: { etablissementId: AUTRE, userId: SUB } });
  });

  it("ne sert jamais un établissement que le porteur ne possède pas", async () => {
    // La seule attaque que le paramètre ouvre : deviner l'identifiant d'un
    // établissement d'autrui. Le jeton est bon, la cible ne l'est pas — et la
    // réponse ne dit rien de plus que ce que le porteur possède déjà.
    const d = deps(aDeux);
    await expect(
      resoudreScopeDepuisJeton(
        requete("Bearer jeton", "https://rojer.fr/api/mcp?etablissement=etab_du_voisin"),
        d,
      ),
    ).resolves.toEqual({
      statut: "choix_requis",
      etablissements: [unEtab(ETAB), unEtab(AUTRE)],
    });
  });

  it("ne retombe pas sur l'unique établissement quand l'URL en désigne un autre", async () => {
    // Le cas qui se plaide le mieux et qu'il faut refuser quand même : le
    // porteur n'en a qu'un, l'URL en nomme un inconnu. Servir « le sien »
    // ignorerait silencieusement une demande explicite — l'utilisateur lirait
    // un dossier en croyant en lire un autre, ce qui est pire que l'échec.
    const d = deps();
    await expect(
      resoudreScopeDepuisJeton(
        requete("Bearer jeton", "https://rojer.fr/api/mcp?etablissement=etab_inconnu"),
        d,
      ),
    ).resolves.toEqual({
      statut: "choix_requis",
      etablissements: [unEtab(ETAB)],
    });
  });
});

describe("reponseChoixEtablissementRequis", () => {
  it("répond 400 et non 401 — le jeton, lui, est valide", async () => {
    // Un 401 relancerait le flux OAuth : le client se réauthentifierait avec
    // succès, reviendrait, et se ferait « refuser » à nouveau, indéfiniment.
    const res = reponseChoixEtablissementRequis(requete("Bearer jeton"), [
      unEtab(ETAB),
      unEtab(AUTRE),
    ]);
    expect(res.status).toBe(400);
    expect(res.headers.get("www-authenticate")).toBeNull();
  });

  it("nomme les établissements et dit comment en désigner un", async () => {
    // « Choisissez » sans dire parmi quoi ni comment est une autre façon de ne
    // pas répondre.
    const res = reponseChoixEtablissementRequis(requete("Bearer jeton"), [
      unEtab(ETAB, "Le Bistrot"),
      unEtab(AUTRE, "La Cave"),
    ]);
    const corps = await res.json();

    expect(corps.etablissements).toEqual([
      { id: ETAB, nom: "Le Bistrot" },
      { id: AUTRE, nom: "La Cave" },
    ]);
    expect(corps.exemple).toBe(
      `https://rojer.fr/api/mcp?etablissement=${ETAB}`,
    );
  });
});

describe("reponseAuthentificationRequise", () => {
  const config = lireConfigOauthMcp(env())!;

  it("répond 401 — le seul statut qui déclenche le flux OAuth", () => {
    // Un 200 portant une erreur d'outil laisserait l'utilisateur devant un
    // message d'échec, sans jamais lui proposer de se connecter.
    expect(reponseAuthentificationRequise(config, requete()).status).toBe(401);
  });

  it("désigne les métadonnées de ressource dans WWW-Authenticate", () => {
    const entete = reponseAuthentificationRequise(
      config,
      requete(),
    ).headers.get("www-authenticate");
    expect(entete).toContain("Bearer");
    expect(entete).toContain(
      'resource_metadata="https://rojer.fr/.well-known/oauth-protected-resource/api/mcp"',
    );
  });

  it("répond 401 même sans configuration, sans en-tête inventé", () => {
    // Déploiement mal configuré : on refuse, mais on ne désigne pas un
    // document de métadonnées dont on ne connaît pas l'URL.
    const reponse = reponseAuthentificationRequise(null, requete());
    expect(reponse.status).toBe(401);
    expect(reponse.headers.get("www-authenticate")).toBeNull();
  });
});

describe("metadonneesRessourceProtegee", () => {
  const config = lireConfigOauthMcp(env())!;

  it("annonce la ressource et son unique serveur d'autorisation", () => {
    // Une seule entrée : les clients ne garantissent pas d'essayer les
    // suivantes, la première doit être la bonne.
    expect(metadonneesRessourceProtegee(config, requete())).toEqual({
      resource: "https://rojer.fr/api/mcp",
      authorization_servers: ["https://abcdef.supabase.co/auth/v1"],
      bearer_methods_supported: ["header"],
      scopes_supported: ["openid", "email"],
    });
  });
});
