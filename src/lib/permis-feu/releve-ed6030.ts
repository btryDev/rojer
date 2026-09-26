// Le relevé de la brochure INRS ED 6030, fait UNE fois, dans le PDF — pas
// dans ce dépôt.
//
// POURQUOI CE FICHIER (contre-lecture du 2026-09-26). `referentiel.test.ts`
// vérifiait que le libellé affiché était l'« action » de la source ; or
// `inrs()` FABRIQUE le libellé depuis la source : une paraphrase écrite dans
// la source (« rayon de 5 m », « 6 litres … ou 1 CO2 de 5 kg », « Coupure de
// la ventilation ») passait, vraie par construction. Il fallait un témoin qui
// ne vienne pas du référentiel.
//
// CE QU'IL EST. Pour chaque extrait, le SHA-256 de la sous-chaîne LUE DANS LE
// PDF (`TI-ED-6030-2.pdf`, 2e édition révisée en août 2019, dont le SHA-256
// est donné plus bas), extraite par pdftotext et recoupée par pypdf. Le texte
// est ramené à sa forme de comparaison : blancs réduits à une espace,
// apostrophe typographique ramenée à la droite, puces retirées (le
// commentaire de `protection-combustibles` réunit deux puces). Le relevé ne
// porte pas les identifiants des mesures : il dit ce que la brochure contient,
// pas ce que le référentiel en a fait.
//
// CE QU'IL NE GARANTIT PAS : qu'on ne le recopie pas. Un hash se recalcule
// comme une liste se recopie. Il se refait depuis le PDF, et seulement depuis
// lui, quand l'INRS révise la brochure (journal C33).

// ⚠ Lu par AUCUN test : la brochure n'est pas au dépôt. Il dit quel fichier a
// servi au relevé ; le recoupement se fait en recalculant le SHA-256 du PDF
// téléchargé chez l'INRS (contre-lecture du 2026-09-26).
export const BROCHURE_ED6030_SHA256 =
  "fbcb6d2619b7eddc9655aab42f6523e718f9751d7d178e948c49aa8d992301ec";

export type ReleveExtrait = { page: number; champ: "action" | "commentaire"; sha256: string };

export const RELEVES_ED6030: readonly ReleveExtrait[] = [
  { page: 8, champ: "action", sha256: "82b3ce0e5d9bddc304e1228364b51e79acbb5e2e9f70b660dd68307135b62ed4" },
  { page: 8, champ: "commentaire", sha256: "3b96a194f9189ff75a366fb47c3b556f4997dda182d8d85a49f59630ae6e762d" },
  { page: 8, champ: "action", sha256: "3aa49935f4f97500b39473105ea1d229850abebe30bb7370649e56a5431c5e97" },
  { page: 8, champ: "commentaire", sha256: "7b508b28793c21f9f67a97e2e681ff91ba8d10a6d7e7c7c2f35867e88f2fbdb8" },
  { page: 8, champ: "action", sha256: "d0d2c12bbf081a647cdeff5201bc9ba22ce9810606c4bd2e6267a384e4b04218" },
  { page: 8, champ: "commentaire", sha256: "ba93bfbf7c4fc1a29a87de4a7da6ee4ead99ef67e863773e674e922c6ce30625" },
  { page: 8, champ: "action", sha256: "364fa518dca0e1d9ac2f07e2e7cf646642ec6c06ccea717263a7d7d8e932cc72" },
  { page: 8, champ: "commentaire", sha256: "bcc679832049974c11e2e604a3fcb96b04428b3b403ef9af893ff23da62fe9d9" },
  { page: 10, champ: "action", sha256: "f6351e270e4e8fcafcca93bcadf51ea45104908beae0ba617fe44b009bb328b4" },
  { page: 7, champ: "commentaire", sha256: "989249c715ecd00d0b191026e15c41d2773a430b28a36e7cf441e2f9869e1370" },
  { page: 8, champ: "action", sha256: "f35c17eed95d6d9f1695c6ee0d7b2a0dc94dfed53793a436962179b094efd0b7" },
  { page: 8, champ: "commentaire", sha256: "cdd65095a7a07f9ae29defd6bcd1fde71fb7c2a4b62771c95e4f26ace7c92d0e" },
  { page: 8, champ: "action", sha256: "742841f4877dbeda5cb0fa3da2e24b9d32d2ab53d680a68b6da39e54b9ae990c" },
  { page: 8, champ: "commentaire", sha256: "aa331fecc4adc64952d13bfc1febc39c2db3bb155d1018df842407853b0d3c03" },
  { page: 8, champ: "action", sha256: "f5e87a314d43e764a06bd637cdfe78cb9dc482379334603a80f577ffaedee3f1" },
  { page: 8, champ: "commentaire", sha256: "bc584a340f0fa9cb03ca659dc90d72193bf6f321c67866027dae804a59311161" },
  { page: 8, champ: "action", sha256: "dcd6a5823f89e8f3a3e50972cf3fb9cc03502f5bc72138c4aa710bec094d68fb" },
  { page: 8, champ: "commentaire", sha256: "7e7b2077ee3ef44db145f4f6197e8ba692887a3106285b11e185ab013af8e4b2" },
  { page: 9, champ: "action", sha256: "7dc3b6da458a3a9dbb674489d9da212c056b2c8c2db75f50ce630c2824d2b0b1" },
  { page: 9, champ: "commentaire", sha256: "4909c8934d137d3def57de02fd95ccf8ac0121f9070c53d00953cf730291eb02" },
  { page: 9, champ: "action", sha256: "e52b664ff12f4f67bc09cdb92f049f41ccbc44f24d02c13efc8f3dbe4dc46457" },
  { page: 9, champ: "commentaire", sha256: "09ac63c2a6f833c9d263cc79747bae623588e1fc380cf1056c94aad9a56adcda" },
  { page: 9, champ: "action", sha256: "235b5f98af411e05071419683961552074b9c87a5c235dc01c34292901874ead" },
  { page: 9, champ: "commentaire", sha256: "bf2de794228f24dfb0102f12be778f2a2fedebd890418d998457ddddd15a0a9e" },
  { page: 9, champ: "action", sha256: "5ca940d4109d1c861ec895bc6ed1cde07886083df74707f2c093bd56c9c280a0" },
];

/**
 * Les PAIRES action ↔ commentaire, telles qu'une ligne de tableau les réunit
 * (SHA-256 de « action \n commentaire », sous-chaînes lues dans le PDF). Sans
 * elles, deux commentaires de la même page s'échangeaient sans que rien ne
 * bouge (contre-lecture du 2026-09-26). Appariées dans l'ordre des lignes du
 * tableau ; dans « Étape d'après travaux », l'extraction rend les trois
 * actions avant les commentaires, et l'appariement suit l'ordre relu.
 * `composite` : la seule paire que la brochure ne réunit pas (action du
 * formulaire p. 10, commentaire du paragraphe p. 7) — un choix de Rojer, dit.
 */
export const LIGNES_ED6030: readonly { page: number; sha256: string; composite: boolean }[] = [
  { page: 8, sha256: "bcf4baf6e1b3ebac4177a89d1ee48bb75f7d057392440b06e2b518323c591703", composite: false },
  { page: 8, sha256: "7f7bfa1de8330f879a4374a843dbd56b3ec0cdc3af3e749f6e5816768ca13122", composite: false },
  { page: 8, sha256: "8a634ad7547c2d46cb0676d61ec506e930eaee9c48ad63d71f69b855bcc92735", composite: false },
  { page: 8, sha256: "b25639b0bead8f055e9dd3a20585c42a8e5059608d5c8b83490b93b870f61379", composite: false },
  { page: 10, sha256: "d91108bfbb878e57f965f3b65acfa3a0ec6f47b513d570eb30b1f48394d8e913", composite: true },
  { page: 8, sha256: "1724150383de6a78474bc3aed7678f46b0ca15f1391966ca31e1c22c7968b63e", composite: false },
  { page: 8, sha256: "4bb00a8c47e5f6d235d03d6c8fd5e7f37038765654f39c4c14da76159e67d2ec", composite: false },
  { page: 8, sha256: "5908234efe0d3aee2fe709039ec87bef4e0ec72c81cbe1343b3f6d592643f100", composite: false },
  { page: 8, sha256: "1136f52a1d057b2a3d39f8f4a433c8519e5ebfc2c5920284f71d78a20baccbbf", composite: false },
  { page: 9, sha256: "197427dfc0a8ddb4629012dd78696da6d9672d4732e5f69db52db20edd098f8f", composite: false },
  { page: 9, sha256: "1a006762252f3b601535226b649cf512b70396b3c72ad7ea391f73e2f1136002", composite: false },
  { page: 9, sha256: "af204c675952704ba4e1662ffc5e41694df29d3ea8200cd14f8ec6d95cbebea6", composite: false },
];
