/**
 * Le nom d'un signataire n'apprend rien quand il n'est que son adresse — un
 * compte sans autre nom, un lien adressé sans nom de destinataire. Les
 * fenêtres de signature ne l'écrivent alors qu'une fois (retour de test du
 * 2026-11-21 : « x@y.fr <x@y.fr> »).
 */
export function nomSansAdresse(nom: string | null | undefined, email: string): string | null {
  const n = nom?.trim() ?? "";
  if (!n || n.toLowerCase() === email.trim().toLowerCase()) return null;
  return n;
}
