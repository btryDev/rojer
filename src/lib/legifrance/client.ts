// Client de l'API Légifrance (DILA), servie par PISTE. SERVEUR SEULEMENT.
//
// ---------------------------------------------------------------------------
// CE QUI A ÉTÉ LU AVANT D'ÉCRIRE CE MODULE (2026-09-27)
// ---------------------------------------------------------------------------
//
// - FAQ API Légifrance (DILA) :
//   https://www.legifrance.gouv.fr/contenu/pied-de-page/foire-aux-questions-api
//   → jeton : POST https://sandbox-oauth.piste.gouv.fr/api/oauth/token (bac à
//     sable), https://oauth.piste.gouv.fr/api/oauth/token (production) ;
//     API : https://sandbox-api.piste.gouv.fr/dila/legifrance/lf-engine-app et
//     https://api.piste.gouv.fr/dila/legifrance/lf-engine-app ; « expires_in »
//     en secondes (3600 dans l'exemple) ; 403 = CGU de l'API non acceptées
//     sur PISTE ; la production a « des quotas plus élevés » que le bac à sable.
// - « Exemples d'utilisation de l'API » (DILA, mis à jour le 17/09/2025) :
//   https://www.legifrance.gouv.fr/contenu/Media/Files/pied-de-page/exemples-d-utilisation-de-l-api.docx
//   → flux client_credentials, corps
//     `grant_type=client_credentials&client_id=…&client_secret=…&scope=openid`
//     en x-www-form-urlencoded ; en-tête `Authorization: Bearer <jeton>` ;
//     `accept` et `Content-Type: application/json` sur les POST ;
//     POST /consult/getArticle { id: "LEGIARTI…" } ; POST /search avec
//     `NUM_ARTICLE` + facette `NOM_CODE` / `DATE_VERSION`, fonds `CODE_DATE`.
// - « Open data et API » (DILA) :
//   https://www.legifrance.gouv.fr/contenu/pied-de-page/open-data-et-api
//   → les quotas sont « détaillés sur le portail PISTE » (onglet Applications)
//     et ne sont PUBLIÉS NULLE PART en chiffres. Le délai entre appels est donc
//     un réglage (`delaiMs`), prudent par défaut, et un 429 est repris.
// - Le contrat Swagger de l'API (Légifrance 2.4.2, basePath
//   /dila/legifrance/lf-engine-app), tel que PISTE le publie et que le projet
//   pylegifrance le recopie :
//   https://raw.githubusercontent.com/pylegifrance/pylegifrance/main/pylegifrance/models/generated/legifrance.json
//   → /consult/getArticle (ArticleRequest {id} → GetArticleResponse {article}),
//     /consult/getArticleWithIdAndNum (ArticleConsultWithIdAndNum {id: LEGITEXT,
//     num} ; « récupère uniquement les versions d'un article en vigueur » ;
//     « seuls les articles ne comportant pas de version en vigueur différée
//     peuvent être trouvés par cette méthode »), et le schéma `Article` :
//     `texte`, `etat`, `dateDebut`, `dateFin`, `articleVersions[]`
//     {id, etat, dateDebut, dateFin, version}, `lienModifications[]`
//     {linkType, linkOrientation, textCid, textTitle, dateSignaTexte,
//     datePubliTexte, dateDebutCible, natureText}, `textTitles[]`.
//
// ---------------------------------------------------------------------------
// SECRETS
// ---------------------------------------------------------------------------
//
// L'identifiant et le secret ne sortent de ce module que dans le corps de la
// requête de jeton. Aucune erreur ne cite une requête de jeton, et tout corps
// de réponse repris dans un message d'erreur est d'abord passé par
// `masquer()`, qui retire le secret, l'identifiant et le jeton courant — au
// cas où un serveur les renverrait en écho.

// Garde « serveur seulement ». `import "server-only"` n'est pas utilisable
// ici : le paquet n'est résolu que par Next (et l'alias de Vitest), et ce
// module est d'abord lancé par un script `tsx`. La garde équivalente : refuser
// d'être évalué dans un navigateur. Les variables lues ne sont de toute façon
// pas `NEXT_PUBLIC_`, donc jamais inlinées dans un bundle client.
if (typeof window !== "undefined") {
  throw new Error("src/lib/legifrance/client.ts est réservé au serveur.");
}

export type EnvironnementLegifrance = "sandbox" | "production";

export const POINTS_D_ENTREE: Record<
  EnvironnementLegifrance,
  { jeton: string; api: string }
> = {
  sandbox: {
    jeton: "https://sandbox-oauth.piste.gouv.fr/api/oauth/token",
    api: "https://sandbox-api.piste.gouv.fr/dila/legifrance/lf-engine-app",
  },
  production: {
    jeton: "https://oauth.piste.gouv.fr/api/oauth/token",
    api: "https://api.piste.gouv.fr/dila/legifrance/lf-engine-app",
  },
};

export type NatureErreurLegifrance =
  /** Variable absente ou invalide. Le message nomme la variable, jamais sa valeur. */
  | "configuration"
  /** Le jeton a été refusé, ou l'API refuse le jeton (401/403). */
  | "authentification"
  /** 429 après toutes les reprises. */
  | "quota"
  /** Autre statut HTTP non 2xx après les reprises éventuelles. */
  | "http"
  /** Pas de réponse (DNS, coupure, délai). */
  | "reseau"
  /** Réponse 2xx illisible. */
  | "reponse";

export class ErreurLegifrance extends Error {
  readonly nature: NatureErreurLegifrance;
  readonly statut?: number;
  readonly point?: string;
  constructor(
    nature: NatureErreurLegifrance,
    message: string,
    opts: { statut?: number; point?: string } = {},
  ) {
    super(message);
    this.name = "ErreurLegifrance";
    this.nature = nature;
    this.statut = opts.statut;
    this.point = opts.point;
  }
}

export type OptionsClientLegifrance = {
  clientId: string;
  clientSecret: string;
  env: EnvironnementLegifrance;
  /** Injectable pour les tests. Défaut : `globalThis.fetch`. */
  fetch?: typeof fetch;
  /**
   * Intervalle minimal entre deux appels à l'API (jeton exclu). Les quotas
   * PISTE ne sont pas publiés en chiffres : 300 ms par défaut, soit un peu
   * plus de trois appels par seconde, en série.
   */
  delaiMs?: number;
  /** Nombre total d'essais sur 429 / 5xx / panne réseau. Défaut : 4. */
  maxEssais?: number;
  /** Attente de base de la reprise exponentielle. Défaut : 1000 ms. */
  attenteBaseMs?: number;
  /** Plafond d'un `Retry-After`. Défaut : 60 s. */
  attenteMaxMs?: number;
  /** Marge avant expiration à laquelle le jeton est renouvelé. Défaut : 60 s. */
  margeJetonMs?: number;
  /** Horloge et attente, injectables pour les tests. */
  maintenant?: () => number;
  attendre?: (ms: number) => Promise<void>;
};

const STATUTS_REPRIS = new Set([429, 500, 502, 503, 504]);

/** Lit la configuration dans l'environnement. Ne rend jamais une valeur dans un message. */
export function configurationDepuisEnv(
  env: Record<string, string | undefined> = process.env,
): Pick<OptionsClientLegifrance, "clientId" | "clientSecret" | "env"> {
  const manquantes = ["LEGIFRANCE_CLIENT_ID", "LEGIFRANCE_CLIENT_SECRET"].filter(
    (k) => !env[k] || env[k]!.trim() === "",
  );
  if (manquantes.length > 0) {
    throw new ErreurLegifrance(
      "configuration",
      `Variable(s) absente(s) : ${manquantes.join(", ")}.`,
    );
  }
  const e = (env.LEGIFRANCE_ENV ?? "sandbox").trim();
  if (e !== "sandbox" && e !== "production") {
    throw new ErreurLegifrance(
      "configuration",
      "LEGIFRANCE_ENV doit valoir « sandbox » ou « production ».",
    );
  }
  return {
    clientId: env.LEGIFRANCE_CLIENT_ID!.trim(),
    clientSecret: env.LEGIFRANCE_CLIENT_SECRET!.trim(),
    env: e,
  };
}

// --- Types de réponse (sous-ensemble du Swagger, champs lus seulement) ----

export type VersionArticleApi = {
  id?: string;
  etat?: string;
  dateDebut?: number | string;
  dateFin?: number | string;
  version?: string;
  numero?: string;
};

export type LienModificationApi = {
  linkType?: string;
  linkOrientation?: string;
  textCid?: string;
  textTitle?: string;
  natureText?: string;
  dateSignaTexte?: number | string;
  datePubliTexte?: number | string;
  dateDebutCible?: number | string;
  articleId?: string;
  articleNum?: string;
};

export type TitreTexteApi = {
  id?: string;
  cid?: string;
  titre?: string;
  titreLong?: string;
  nature?: string;
  etat?: string;
  dateTexte?: number | string;
};

export type ArticleApi = {
  id?: string;
  cid?: string;
  num?: string;
  etat?: string;
  texte?: string;
  texteHtml?: string;
  dateDebut?: number | string;
  dateFin?: number | string;
  idTexte?: string;
  cidTexte?: string;
  versionArticle?: string;
  articleVersions?: VersionArticleApi[];
  lienModifications?: LienModificationApi[];
  textTitles?: TitreTexteApi[];
};

export type ClientLegifrance = {
  readonly env: EnvironnementLegifrance;
  /** POST brut sur un point de l'API (chemin relatif, ex. `/consult/getArticle`). */
  post<T>(chemin: string, corps: unknown): Promise<T>;
  /** L'article d'identifiant `LEGIARTI…` (ou `JORFARTI…`), ou `null` s'il n'existe pas. */
  getArticle(id: string): Promise<ArticleApi | null>;
  /** L'article en vigueur de numéro `num` dans le texte `LEGITEXT…`, ou `null`. */
  getArticleWithIdAndNum(idTexte: string, num: string): Promise<ArticleApi | null>;
  /** Nombre d'appels à l'API et de jetons obtenus — pour le rapport. */
  compteurs(): { appels: number; jetons: number; reprises: number };
};

export function creerClientLegifrance(o: OptionsClientLegifrance): ClientLegifrance {
  const f = o.fetch ?? globalThis.fetch;
  const points = POINTS_D_ENTREE[o.env];
  const delaiMs = o.delaiMs ?? 300;
  const maxEssais = Math.max(1, o.maxEssais ?? 4);
  const attenteBaseMs = o.attenteBaseMs ?? 1000;
  const attenteMaxMs = o.attenteMaxMs ?? 60_000;
  const margeJetonMs = o.margeJetonMs ?? 60_000;
  const maintenant = o.maintenant ?? Date.now;
  const attendre =
    o.attendre ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));

  let jeton: { valeur: string; expireA: number } | null = null;
  let jetonEnVol: Promise<string> | null = null;
  let dernierAppel = -Infinity;
  const c = { appels: 0, jetons: 0, reprises: 0 };

  /** Retire tout ce qui pourrait être un secret d'un texte destiné à un message. */
  function masquer(texte: string): string {
    let t = texte.slice(0, 300);
    for (const s of [o.clientSecret, o.clientId, jeton?.valeur]) {
      if (s && s.length >= 4) t = t.split(s).join("[masqué]");
    }
    return t;
  }

  async function obtenirJeton(): Promise<string> {
    if (jeton && maintenant() < jeton.expireA - margeJetonMs) return jeton.valeur;
    if (jetonEnVol) return jetonEnVol;
    jetonEnVol = (async () => {
      const corps = new URLSearchParams({
        grant_type: "client_credentials",
        client_id: o.clientId,
        client_secret: o.clientSecret,
        scope: "openid",
      });
      let r: Response;
      try {
        r = await f(points.jeton, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            accept: "application/json",
          },
          body: corps.toString(),
        });
      } catch {
        // L'erreur d'origine peut citer la requête : on ne la reprend pas.
        throw new ErreurLegifrance("reseau", "Jeton PISTE : pas de réponse.", {
          point: points.jeton,
        });
      }
      if (!r.ok) {
        // Le corps d'un refus OAuth (« invalid_client »…) est utile, mais passé au masque.
        const t = masquer(await r.text().catch(() => ""));
        throw new ErreurLegifrance(
          r.status === 401 || r.status === 400 || r.status === 403
            ? "authentification"
            : "http",
          `Jeton PISTE refusé (HTTP ${r.status}). ${t}`.trim(),
          { statut: r.status, point: points.jeton },
        );
      }
      const j = (await r.json().catch(() => null)) as {
        access_token?: unknown;
        expires_in?: unknown;
      } | null;
      if (!j || typeof j.access_token !== "string" || j.access_token === "") {
        throw new ErreurLegifrance("reponse", "Jeton PISTE : réponse sans access_token.", {
          point: points.jeton,
        });
      }
      const duree = typeof j.expires_in === "number" && j.expires_in > 0 ? j.expires_in : 3600;
      jeton = { valeur: j.access_token, expireA: maintenant() + duree * 1000 };
      c.jetons++;
      return j.access_token;
    })();
    try {
      return await jetonEnVol;
    } finally {
      jetonEnVol = null;
    }
  }

  async function espacer() {
    const reste = dernierAppel + delaiMs - maintenant();
    if (reste > 0) await attendre(reste);
    dernierAppel = maintenant();
  }

  function attenteReprise(essai: number, r?: Response): number {
    const ra = r?.headers.get("retry-after");
    if (ra) {
      const s = Number(ra);
      if (Number.isFinite(s) && s >= 0) return Math.min(s * 1000, attenteMaxMs);
      const d = Date.parse(ra);
      if (Number.isFinite(d)) return Math.min(Math.max(0, d - maintenant()), attenteMaxMs);
    }
    return Math.min(attenteBaseMs * 2 ** (essai - 1), attenteMaxMs);
  }

  async function post<T>(chemin: string, corpsRequete: unknown): Promise<T> {
    const url = points.api + chemin;
    let jetonRenouvele = false;
    for (let essai = 1; ; essai++) {
      const valeurJeton = await obtenirJeton();
      await espacer();
      c.appels++;
      let r: Response;
      try {
        r = await f(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${valeurJeton}`,
            accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(corpsRequete),
        });
      } catch {
        if (essai < maxEssais) {
          c.reprises++;
          await attendre(attenteReprise(essai));
          continue;
        }
        throw new ErreurLegifrance("reseau", `${chemin} : pas de réponse après ${essai} essai(s).`, {
          point: chemin,
        });
      }
      if (r.ok) {
        const texte = await r.text();
        if (texte.trim() === "") return null as T;
        try {
          return JSON.parse(texte) as T;
        } catch {
          throw new ErreurLegifrance("reponse", `${chemin} : réponse non JSON.`, {
            statut: r.status,
            point: chemin,
          });
        }
      }
      if (r.status === 401 && !jetonRenouvele) {
        // Jeton révoqué ou expiré avant l'heure annoncée : un seul renouvellement.
        jeton = null;
        jetonRenouvele = true;
        essai--;
        continue;
      }
      if (STATUTS_REPRIS.has(r.status) && essai < maxEssais) {
        c.reprises++;
        await attendre(attenteReprise(essai, r));
        continue;
      }
      const t = masquer(await r.text().catch(() => ""));
      throw new ErreurLegifrance(
        r.status === 429
          ? "quota"
          : r.status === 401 || r.status === 403
            ? "authentification"
            : "http",
        `${chemin} : HTTP ${r.status}${r.status === 403 ? " (CGU de l'API acceptées sur PISTE ?)" : ""}. ${t}`.trim(),
        { statut: r.status, point: chemin },
      );
    }
  }

  function article(rep: { article?: ArticleApi | null } | null): ArticleApi | null {
    const a = rep?.article ?? null;
    return a && (a.id || a.texte !== undefined) ? a : null;
  }

  return {
    env: o.env,
    post,
    async getArticle(id) {
      try {
        return article(await post<{ article?: ArticleApi | null }>("/consult/getArticle", { id }));
      } catch (e) {
        if (e instanceof ErreurLegifrance && e.statut === 404) return null;
        throw e;
      }
    },
    async getArticleWithIdAndNum(idTexte, num) {
      try {
        return article(
          await post<{ article?: ArticleApi | null }>("/consult/getArticleWithIdAndNum", {
            id: idTexte,
            num,
          }),
        );
      } catch (e) {
        if (e instanceof ErreurLegifrance && e.statut === 404) return null;
        throw e;
      }
    },
    compteurs: () => ({ ...c }),
  };
}
