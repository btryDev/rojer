// Champs d'une signature qui constituent la preuve, et rien d'autre : ceux
// qu'affichent `SignatureBlock`, la page publique de vérification et la
// confirmation. Module sans effet de bord, partagé par les lectures de session
// (`queries.ts`) et le module public (`verification-publique.ts`).
export const SELECT_PREUVE = {
  id: true,
  signataireNom: true,
  signataireEmail: true,
  signataireRole: true,
  horodatageIso: true,
  methode: true,
  hashDocument: true,
  nomDocument: true,
} as const;
