import { CHAMP_COMPTE_ATTENDU } from "@/lib/auth/compte-attendu";

/**
 * Le compte que la page montre, posté avec le formulaire : le serveur refuse
 * le geste si un autre onglet en a changé depuis (`memeCompteQueLaPage`).
 * `null` : la personne n'a encore aucun compte.
 */
export function ChampCompteAttendu({ compteId }: { compteId: string | null }) {
  return <input type="hidden" name={CHAMP_COMPTE_ATTENDU} value={compteId ?? ""} />;
}
