/**
 * L'adresse que porte un lien d'activation (`?token=…`, un JWT de Better
 * Auth dont la charge contient `email`), lue SANS vérifier la signature :
 * pour l'affichage seulement — dire qu'une AUTRE adresse est connectée, et
 * donner l'identifiant au gestionnaire de mots de passe. Better Auth juge le
 * jeton à l'envoi du formulaire ; un jeton forgé ne change que ce que voit
 * celui qui l'ouvre. `null` si la charge est illisible.
 */
export function adresseDuJeton(jeton: string | null | undefined): string | null {
  const charge = jeton?.split(".")[1];
  if (!charge) return null;
  try {
    const email = (JSON.parse(Buffer.from(charge, "base64url").toString("utf8")) as { email?: unknown }).email;
    return typeof email === "string" && email.includes("@") ? email.toLowerCase() : null;
  } catch {
    return null;
  }
}
