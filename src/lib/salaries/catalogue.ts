import {
  obligationsConformite,
  estPorteeParSalarie,
  type ObligationPorteeParSalarie,
} from "@/lib/referentiels/conformite";

/**
 * Les titres que l'employeur peut déclarer.
 *
 * Le catalogue n'est pas une liste maintenue à la main : il se dérive du
 * référentiel, filtré sur le porteur. Une obligation salarié ajoutée demain à
 * `conformite/` apparaît ici sans qu'on y touche — et une obligation retirée
 * disparaît, plutôt que de rester proposée à la saisie alors que plus rien ne
 * la génère.
 *
 * Il a compté **une seule ligne** jusqu'au 2026-08-31 — l'attestation médicale
 * quinquennale de `R. 4544-11-1` (ADR-023) — et le lot 7 l'a porté à onze en
 * dépouillant `R. 4141-*`, `R. 4624-*`, `R. 4224-14` à `-16` et `R. 4323-55` à
 * `-57`.
 *
 * Ne réécrivez pas de compte ici. Cette note en portait un, il est devenu faux
 * le jour où le catalogue a grandi, et il l'est resté sur trois écrans à la
 * fois — c'est un défaut de ce module, pas un accident. Le catalogue se dérive :
 * son contenu se lit en appelant `cataloguerTitres()`, et les écrans l'affichent
 * plutôt que de le décrire.
 *
 * Ce qui reste vrai et doit continuer d'être dit à l'utilisateur : ce qu'il voit
 * n'est pas tout ce qui existe en droit. Le cliquet de `corpus.test.ts` interdit
 * d'encoder sur un texte que personne n'a lu, donc un titre dont le texte n'est
 * pas dépouillé est absent — et son absence ne veut pas dire qu'il n'est pas dû.
 * Lui laisser croire l'inverse serait le tromper sur sa propre couverture.
 */
export function cataloguerTitres(): ObligationPorteeParSalarie[] {
  return obligationsConformite
    .filter(estPorteeParSalarie)
    .sort((a, b) => a.libelle.localeCompare(b.libelle, "fr"));
}

/**
 * Index des titres par identifiant, construit une fois : le référentiel est du
 * TypeScript figé à la compilation (ADR-003), il ne change pas d'un appel à
 * l'autre. `titreParId` refaisait filtre et tri `localeCompare` à chaque titre
 * — une fois par titre de chaque salarié, à chaque rendu du rail, depuis que le
 * badge classe en mémoire (relecture du lot, 2026-09-14).
 */
let INDEX_TITRES: ReadonlyMap<string, ObligationPorteeParSalarie> | null = null;

export function titreParId(
  obligationId: string,
): ObligationPorteeParSalarie | undefined {
  INDEX_TITRES ??= new Map(cataloguerTitres().map((o) => [o.id, o]));
  return INDEX_TITRES.get(obligationId);
}

/**
 * Un titre que le droit interdit de cumuler avec celui qu'on interroge, et la
 * phrase qui le fonde.
 */
export type TitreExclu = {
  titre: ObligationPorteeParSalarie;
  motif: string;
};

/**
 * La table des exclusions, **fermée par symétrie**.
 *
 * Le référentiel ne déclare chaque couple qu'une fois, du côté dérogatoire —
 * `-sir` déclare écarter `-vip` parce que c'est R. 4624-24, qu'il cite, qui
 * substitue. Recopier la réciproque dans `-vip` aurait produit une liste tenue
 * à la main dans deux fichiers, dont une moitié finit par manquer ; la
 * fermeture ici la rend vraie par construction, et il n'y a plus de symétrie à
 * vérifier parce qu'elle ne peut plus être fausse.
 *
 * Recalculée à chaque appel, comme `cataloguerTitres()` : treize titres, cinq
 * déclarations. Un cache serait une optimisation sans mesure et un piège de
 * plus en test.
 */
function tableExclusions(): Map<string, Map<string, string>> {
  const table = new Map<string, Map<string, string>>();
  const noter = (de: string, vers: string, motif: string) => {
    const ligne = table.get(de) ?? new Map<string, string>();
    // Premier motif conservé : si les deux côtés déclaraient le même couple,
    // le motif du côté dérogatoire, lu en premier, est celui qui cite le texte
    // d'exception. Le cas ne se présente pas — c'est une règle de rédaction,
    // pas une garantie de type.
    if (!ligne.has(vers)) ligne.set(vers, motif);
    table.set(de, ligne);
  };
  for (const o of cataloguerTitres()) {
    for (const x of o.exclut) {
      noter(o.id, x.titre, x.motif);
      noter(x.titre, o.id, x.motif);
    }
  }
  return table;
}

/**
 * Les titres que le droit interdit de cumuler avec `obligationId`.
 *
 * Rend `[]` pour un identifiant inconnu ou pour un titre qui n'exclut rien :
 * les deux se lisent « rien ne s'oppose », ce qui est le cas.
 */
export function exclusionsDuTitre(obligationId: string): TitreExclu[] {
  const ligne = tableExclusions().get(obligationId);
  if (!ligne) return [];
  const exclus: TitreExclu[] = [];
  for (const [id, motif] of ligne) {
    const titre = titreParId(id);
    // Un identifiant mort est impossible — `exclusion.test.ts` l'interdit au
    // référentiel — mais le taire ici vaut mieux que de lever : ce chemin sert
    // à REFUSER une saisie, et planter dessus empêcherait aussi les saisies
    // légitimes.
    if (titre) exclus.push({ titre, motif });
  }
  return exclus;
}

/**
 * Les couples interdits présents dans un ensemble de titres **déjà déclarés**.
 *
 * C'est la moitié du remède qui regarde le passé. Refuser les saisies futures
 * ne répare aucun dossier où les deux titres sont déjà là — et c'est de ceux-là
 * que sort aujourd'hui l'échéance que le droit écarte.
 *
 * Chaque couple est rendu **une seule fois**, dans l'ordre où les titres
 * arrivent : l'écran affiche un avertissement par cumul, pas deux.
 */
export function conflitsExclusion(
  obligationIds: readonly string[],
): { titres: [ObligationPorteeParSalarie, ObligationPorteeParSalarie]; motif: string }[] {
  const table = tableExclusions();
  const presents = obligationIds.filter((id) => titreParId(id) !== undefined);
  const conflits: {
    titres: [ObligationPorteeParSalarie, ObligationPorteeParSalarie];
    motif: string;
  }[] = [];
  for (let i = 0; i < presents.length; i++) {
    for (let j = i + 1; j < presents.length; j++) {
      const motif = table.get(presents[i])?.get(presents[j]);
      if (motif === undefined) continue;
      const a = titreParId(presents[i]);
      const b = titreParId(presents[j]);
      if (a && b) conflits.push({ titres: [a, b], motif });
    }
  }
  return conflits;
}
