/**
 * Les mots d'une question de suppression — construits sur une mesure, jamais
 * sur un souvenir du schéma.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI CE MODULE EXISTE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * La carte de confirmation de l'entreprise a annoncé « L'établissement s'en va
 * avec elle » du 2026-09-01 au 2026-09-04 : au singulier, écrit en dur, sans
 * rien compter. L'ADR-028 a retiré l'unicité de `Etablissement.entrepriseId`,
 * le dossier de démonstration en porte deux, et la phrase a continué d'en
 * annoncer un seul pendant que la cascade les emportait tous. C'est le même
 * défaut, mot pour mot, que l'aperçu de `scripts/remettre-en-onboarding.ts`
 * réparé le même jour — celui qui lisait `etablissements[0]`.
 *
 * Le remède est le même : **ne rien écrire qui ne soit pas mesuré**. Ce module
 * ne fait que la mise en mots ; les nombres viennent de `cascade.ts`, qui les
 * dérive du schéma. Il est pur — aucune dépendance à Prisma — pour deux
 * raisons : il est appelé depuis des composants client, et une phrase qui
 * décide d'un singulier se teste sans base.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUE LA PHRASE DOIT DIRE, ET DANS QUEL ORDRE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Une question de suppression dit **ce qui sera perdu**, jamais « êtes-vous
 * sûr » (`ui-kit/Confirmation.tsx`). Ici elle dit deux choses, et il en faut
 * deux : ce qui part, et **ce qui refusera**. La seconde manquait à l'écran
 * `/entreprises/<id>/modifier`, dont le paragraphe promettait la suppression
 * « de tous les DUERP et versions associés » à cent pixels d'une carte qui
 * disait l'inverse. C'est la carte qui avait raison : `DuerpVersion.duerpId`
 * est en `onDelete: Restrict`, et une seule version archivée fait échouer la
 * suppression entière.
 */

/** Nombres mesurés sur le dossier d'une entreprise. Aucun n'est écrit en dur. */
export type PerimetreEntreprise = {
  /**
   * Le nom de CHAQUE établissement, jamais le premier. Un tableau plutôt qu'un
   * compte : la phrase les nomme, et nommer est ce qui rend la mesure
   * vérifiable par celui qui lit.
   */
  etablissements: string[];
  /**
   * Les enregistrements emportés par la cascade, établissements et entreprise
   * exclus — ceux-là sont nommés à part. Dérivé du graphe des arêtes
   * `onDelete: Cascade` du schéma.
   */
  lignes: number;
  /** Ce qui fera REFUSER la suppression. Zéro veut dire « rien ne s'y oppose ». */
  versionsDuerp: number;
};

/** Nombres mesurés sur le dossier d'un établissement. */
export type PerimetreEtablissement = {
  nom: string;
  /** Enregistrements emportés, l'établissement lui-même exclu. */
  lignes: number;
  versionsDuerp: number;
};

/**
 * Ce que la conservation légale fera de la demande — au présent quand c'est
 * déjà joué, au futur quand ça ne l'est pas encore.
 *
 * Les deux branches sont vraies, et c'est le point : dire « si des versions
 * sont archivées » à un compte qui n'en a aucune lui fait douter sans raison,
 * et le dire à un compte qui en a douze lui laisse croire qu'il a une chance.
 */
function clauseConservation(versionsDuerp: number): string {
  if (versionsDuerp === 0) {
    return (
      "Aucune version du DUERP n'est archivée ici : rien ne s'oppose à la " +
      "suppression. Dès qu'une version le sera, elle deviendra impossible — " +
      "le Code du travail les fait conserver (art. L. 4121-3-1 fixe un plancher de quarante ans, et R. 4121-4 une durée de 40 ans à compter de leur élaboration)."
    );
  }
  const pluriel = versionsDuerp > 1;
  return (
    `La suppression sera refusée : ${versionsDuerp} version` +
    `${pluriel ? "s" : ""} du DUERP ${pluriel ? "sont archivées" : "est archivée"} ` +
    "ici, et le Code du travail les fait conserver 40 ans (art. R. 4121-4 du Code du " +
    "travail)."
  );
}

/** « 412 enregistrements » / « 1 enregistrement » / rien du tout. */
function groupeLignes(lignes: number): string {
  return `${lignes} enregistrement${lignes > 1 ? "s" : ""}`;
}

/**
 * Le détail de la carte de suppression d'une entreprise.
 *
 * La liste des établissements est celle qui a été mesurée, toute entière : si
 * le compte en porte trois, la phrase en nomme trois. Le jour où un quatrième
 * apparaît, la phrase le nomme sans que personne touche ce fichier — c'est
 * exactement ce que le `[0]` ne savait pas faire.
 */
export function detailSuppressionEntreprise(p: PerimetreEntreprise): string {
  const n = p.etablissements.length;
  const noms = p.etablissements.join(", ");

  const cePartant =
    n === 0
      ? "Ce compte ne porte aucun établissement ; il ne reste que la fiche de " +
        "l'entreprise, et elle part."
      : n === 1
        ? `Son établissement, ${noms}, part avec elle, et avec lui les ` +
          `${groupeLignes(p.lignes)} de son dossier : équipements, ` +
          "vérifications, rapports téléversés, plan d'actions, registres."
        : `Ses ${n} établissements — ${noms} — partent avec elle, et avec eux ` +
          `les ${groupeLignes(p.lignes)} de leur dossier : équipements, ` +
          "vérifications, rapports téléversés, plan d'actions, registres.";

  return `${cePartant} Rien ne se récupère ensuite. ${clauseConservation(p.versionsDuerp)}`;
}

/** Le détail de la carte de suppression d'un établissement. */
export function detailSuppressionEtablissement(
  p: PerimetreEtablissement,
): string {
  return (
    `${p.nom} part, et avec lui les ${groupeLignes(p.lignes)} de son ` +
    "dossier : équipements, vérifications, rapports téléversés, plan " +
    `d'actions, registre. Rien ne se récupère ensuite. ${clauseConservation(p.versionsDuerp)}`
  );
}
