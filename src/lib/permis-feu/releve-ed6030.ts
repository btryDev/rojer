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
