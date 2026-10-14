// Délai maximal des appels sortants (audit Next.js du 2026-10-14, M9).
//
// Sans délai, un service tiers qui accepte la connexion puis ne répond plus
// garde la requête de l'utilisateur ouverte jusqu'au plafond de la plateforme
// (`maxDuration` sur Vercel) — et, sur un Node permanent comme chez Clever
// Cloud, sans autre plafond que celui du reverse proxy, en retenant la
// mémoire et la connexion à la base de la requête en attente.
//
// `fetchAvecDelai` enveloppe un `fetch` : chaque appel reçoit un signal qui
// abandonne au bout de `delaiMs`, combiné au signal éventuel de l'appelant
// (le premier des deux qui tombe l'emporte). Le délai couvre la réponse
// ENTIÈRE, corps compris : un téléchargement lent compte.
//
// Un abandon lève une `DOMException` « TimeoutError » : les appelants qui
// traitent déjà la panne réseau (supabase-js rend une erreur, le client
// Légifrance la reprend) la traitent sans rien de plus.

export function fetchAvecDelai(delaiMs: number, base?: typeof fetch): typeof fetch {
  return (entree, init) => {
    const delai = AbortSignal.timeout(delaiMs);
    const signal = init?.signal ? AbortSignal.any([init.signal, delai]) : delai;
    // `globalThis.fetch` lu à l'appel, pas à la construction : un client
    // construit une fois (singleton de stockage) suit le `fetch` du moment.
    return (base ?? globalThis.fetch)(entree, { ...init, signal });
  };
}
