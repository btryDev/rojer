/**
 * En-têtes de sécurité HTTP.
 *
 * Aucune page n'a à être encadrée : le dépôt ne contient aucun `<iframe>`, le
 * registre public d'accessibilité s'ouvre par lien ou QR code et n'offre
 * aucun code d'intégration, et les pages `/verifier`, `/signe`, `/acces` sont
 * des pages de premier niveau. L'interdiction d'encadrement vaut donc partout,
 * sans exception — vérifié le 2026-09-19.
 *
 * Deux sources, et c'est voulu :
 * - `next.config.ts` (`reglesEntetes`) pose sur TOUTES les réponses les
 *   en-têtes fixes, dont une CSP réduite à `frame-ancestors 'none'` — le
 *   plancher qui vaut aussi pour les fichiers statiques et les routes que le
 *   proxy ne voit pas ;
 * - le proxy (`src/proxy.ts`) pose la CSP complète, BLOQUANTE, avec un nonce
 *   tiré à chaque requête (audit OWASP S7, audit Next.js M11, 2026-10-14).
 *   Next lit le nonce dans l'en-tête de requête et l'appose à ses propres
 *   scripts ; `'strict-dynamic'` étend la confiance aux morceaux qu'ils
 *   chargent. Plus de `'unsafe-inline'` en `script-src` : un script injecté
 *   n'a pas le nonce et ne s'exécute pas.
 *
 * Ce qui reste permis, et pourquoi :
 * - `style-src 'unsafe-inline'` : React rend des attributs `style`, qu'aucun
 *   nonce ne couvre (un nonce ne vaut que pour un élément `<style>`). Une
 *   injection de style ne fait pas exécuter de code ;
 * - ~~`connect-src` vers l'origine Supabase : le navigateur échange le code du
 *   lien de réinitialisation (PKCE) avec le serveur Auth.~~ [2026-10-30,
 *   ADR-052 : le navigateur n'appelle plus aucun service d'authentification ;
 *   `connect-src` revient à l'app seule.]
 *
 * Les browsers d'avant CSP 3 ignorent `'strict-dynamic'` et retombent sur
 * `'self'` : ils chargent les morceaux de l'app, et refusent tout script en
 * ligne sans nonce.
 */

type Entete = { key: string; value: string };

export function politiqueContenu(options: {
  developpement: boolean;
  /** Le nonce de la requête, tiré par le proxy (`nonceCsp`). */
  nonce: string;
}): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // 'unsafe-eval' : React en développement seulement (piles d'appel).
    "script-src": [
      "'self'",
      `'nonce-${options.nonce}'`,
      "'strict-dynamic'",
      ...(options.developpement ? ["'unsafe-eval'"] : []),
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    // next/font/google auto-héberge les polices : rien ne part chez Google.
    "font-src": ["'self'", "data:"],
    "connect-src": [
      "'self'",
      ...(options.developpement ? ["ws:"] : []),
    ],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  return Object.entries(directives)
    .map(([nom, valeurs]) => `${nom} ${valeurs.join(" ")}`)
    .join("; ");
}

/**
 * Les routes qui servent un fichier déposé (`storage/servir.ts`), en syntaxe
 * `source` de Next.
 *
 * Pourquoi la politique des fichiers vit ICI et pas seulement dans la route
 * (ASVS V3.2.1, audit du 2026-10-13) : Next pose les en-têtes de
 * `next.config.ts` avant que la route réponde, et n'ajoute ceux de la route
 * que s'ils sont absents (`server/send-response.js`). La CSP `sandbox` posée
 * par `servirFichier` était donc écrasée par la `frame-ancestors 'none'` de la
 * règle `/:path*`, et n'avait jamais atteint un navigateur.
 *
 * Choix : une seconde règle, plus bas que `/:path*`, qui porte la politique
 * FUSIONNÉE (la dernière règle qui correspond l'emporte). Écartée : exclure
 * ces chemins de la règle globale et laisser la route poser sa CSP — un 401,
 * un 404 ou une erreur rendus avant `servirFichier` sortiraient alors sans
 * aucune CSP, `frame-ancestors` compris. Ici, tout ce que sert le chemin
 * reçoit les deux directives, quel que soit le chemin de code.
 *
 * Une route ajoutée plus tard qui appelle `servirFichier` sans figurer ici
 * fait tomber `entetes-servis.test.ts` : la liste n'est pas tenue à la main
 * sans garde.
 */
export const SOURCES_FICHIERS_DEPOSES = [
  "/api/rapports/:id/fichier",
  "/api/analyses-legionelles/:id/rapport",
  "/api/prestataires/:id/pieces/:piece",
  "/api/prestataires/:id/pieces-precedentes/:pieceId",
  // La pièce qui prouve la correction d'un point (ADR-048).
  "/api/points/:id/piece",
  // La photo du lieu, dans le hero du tableau de bord (2026-10-25).
  "/api/etablissements/:id/photo",
] as const;

/** La CSP d'un fichier déposé : n'exécute rien dans notre origine, ne s'encadre pas. */
export const CSP_FICHIER_DEPOSE = "sandbox; frame-ancestors 'none'";

/**
 * Un nonce par requête : 128 bits tirés par l'aléa cryptographique de la
 * plateforme (Web Crypto, disponible dans le runtime Node du proxy comme
 * ailleurs), en base64 — l'alphabet que la grammaire CSP accepte.
 */
export function nonceCsp(): string {
  const octets = new Uint8Array(16);
  crypto.getRandomValues(octets);
  return btoa(String.fromCharCode(...octets));
}

type RegleEntetes = { source: string; headers: Entete[] };

/** Ce que `next.config.ts` rend dans `headers()` — l'ordre compte. */
export function reglesEntetes(): RegleEntetes[] {
  return [
    { source: "/:path*", headers: entetesSecurite() },
    ...SOURCES_FICHIERS_DEPOSES.map((source) => ({
      source,
      headers: [{ key: "Content-Security-Policy", value: CSP_FICHIER_DEPOSE }],
    })),
  ];
}

export function entetesSecurite(): Entete[] {
  return [
    { key: "X-Frame-Options", value: "DENY" },
    // Le plancher : la CSP complète, à nonce, vient du proxy (voir en tête).
    { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    // includeSubDomains (ASVS 5.0.0 V3.4.1, L2 ; audit du 2026-10-13) : HSTS
    // couvre l'hôte qui émet l'en-tête et SES sous-domaines, jamais le domaine
    // parent. Servi par `test-duerp-hazel.vercel.app` — ou demain par un
    // sous-domaine de `rojer.fr` —, il n'engage pas `rojer.fr` lui-même ni ses
    // autres noms gérés chez OVH. Le commentaire qui le refusait ici affirmait
    // le contraire : il était faux.
    // Pas de `preload` : il engage la soumission à la liste des navigateurs,
    // décision de la propriétaire et non d'un en-tête.
    {
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains",
    },
    // clipboard-write reste permis à l'app : trois écrans copient un lien ou
    // un texte (accessibilité, connexion MCP, information des salariés).
    {
      key: "Permissions-Policy",
      value: [
        "camera=()",
        "microphone=()",
        "geolocation=()",
        "payment=()",
        "usb=()",
        "browsing-topics=()",
        "clipboard-write=(self)",
      ].join(", "),
    },
  ];
}
