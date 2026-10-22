// Le bloc « lieu » du hero — l'identité de l'établissement et ses zones.
//
// **Ce que ce bloc est, et n'est pas.** Une plaque unique : en tête l'enseigne
// (logo, nom, nombre de zones), dessous UN dessin — l'établissement est un
// bâtiment (2026-10-17) — et la liste de ses zones avec leur parc et leur
// charge. C'est un **état**, pas une commande : rien ne s'y clique pour
// filtrer. Le filtre par zone reste piloté par le sélecteur posé sous le
// hero, qui porte son propre « Tout l'établissement ».
//
// **Ce que le dessin dit, et ne dit pas.** L'application ne sait rien du bâti
// — ni hauteur, ni étages, ni forme. Le dessin est donc décoratif ; ce qui
// varie d'une zone à l'autre est ce qu'on sait vraiment : le nom, le parc et
// la charge.

import Image from "next/image";
import type { BatimentCharge } from "@/lib/batiments/queries";
import { etatCharge, libelleCharge } from "@/lib/batiments/etat-charge";
import { nomDeZone } from "@/lib/batiments/nom-zone";

type Props = {
  /** Le nom d'usage de l'établissement. L'adresse ne figure pas ici : elle
   *  est celle de l'établissement, et au-dessus de la liste des zones
   *  elle se lirait comme celle de l'une d'elles. */
  nomEtablissement: string;
  /** Le logo de l'entreprise, quand elle en a déposé un. `null` → monogramme.
   *  Cf. la note d'implémentation sous `Enseigne`. */
  logoUrl: string | null;
  batiments: BatimentCharge[];
  /** Le dessin de l'établissement. */
  srcIllustration: string;
  /**
   * Ce que les pastilles comptent, et ce qu'elles laissent au relevé d'à côté.
   *
   * Elle arrive toute faite depuis le serveur (`DashboardBundle.perimetreHero`)
   * et non calculée ici : sa dérivation passe par le référentiel des
   * obligations, qui n'a rien à faire dans un composant client — et la plaque
   * n'a pas à savoir comment on obtient une phrase, seulement à la porter.
   */
  legende: string;
};

/**
 * Le monogramme de repli, quand aucun logo n'est déposé.
 *
 * Les initiales des deux premiers mots, ou les deux premières lettres d'un
 * mot unique. Dérivé du nom, donc jamais faux — là où une icône générique
 * de bâtiment aurait fait croire à un logo par défaut.
 */
export function monogramme(nom: string): string {
  const mots = nom.trim().split(/\s+/).filter(Boolean);
  if (mots.length === 0) return "—";
  if (mots.length === 1) return mots[0].slice(0, 2).toUpperCase();
  return (mots[0][0] + mots[1][0]).toUpperCase();
}

/* — L'enseigne : logo, nom, nombre de zones. ─────────────────────
 *
 * NOTE D'IMPLÉMENTATION — le logo n'est pas encore persisté. `Entreprise`
 * n'a pas de colonne pour lui et aucun écran ne permet d'en déposer un ;
 * `logoUrl` vaut donc `null` partout aujourd'hui, et le monogramme s'affiche.
 * L'emplacement existe pour que le jour où le champ arrive, seule la valeur
 * change — pas la composition.
 */
function Enseigne({
  nom,
  logoUrl,
  nbZones,
}: {
  nom: string;
  logoUrl: string | null;
  nbZones: number;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      {logoUrl != null ? (
        <Image
          src={logoUrl}
          alt=""
          aria-hidden
          width={88}
          height={88}
          className="size-11 flex-none rounded-[13px] object-contain"
        />
      ) : (
        <span
          aria-hidden
          className="flex size-11 flex-none items-center justify-center rounded-[13px] bg-[color:var(--board-ink)] indent-[0.06em] font-mono text-[13px] font-medium leading-none tracking-[0.06em] text-white"
        >
          {monogramme(nom)}
        </span>
      )}

      <div className="min-w-0">
        <p className="m-0 truncate text-[17px] font-semibold tracking-[-0.02em] text-[color:var(--board-ink)]">
          {nom}
        </p>
        <p className="board-eyebrow m-0 mt-1 text-[color:var(--board-slate-soft)]">
          {nbZones} zone{nbZones > 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}

/**
 * La pastille de charge — trois états, jamais deux.
 *
 * La règle est dans `lib/batiments/etat-charge.ts`, avec la raison : une zone
 * sans équipement déclaré n'est ni à jour ni en retard, elle est **sans objet**,
 * et l'annoncer « à jour » était une affirmation fausse sur un écran de
 * conformité. Le composant ne rejuge rien, il rend l'état qu'on lui donne.
 */
function PastilleCharge({
  nbEquipements,
  nbEnRetard,
}: {
  nbEquipements: number;
  nbEnRetard: number;
}) {
  const etat = etatCharge({ nbEquipements, nbEnRetard });

  if (etat.nature === "sansObjet") {
    // Ardoise, et non le blanc de « À jour » : la pastille claire se lit comme
    // un feu vert au milieu des autres zones. Ici il n'y a pas de feu — il
    // n'y a rien à quoi l'allumer.
    return (
      <span className="inline-flex items-center rounded-full bg-[color:var(--board-slate-pale)] px-2.5 py-1 text-[11px] font-medium text-[color:var(--board-slate-mid)]">
        {libelleCharge(etat)}
      </span>
    );
  }

  if (etat.nature === "aJour") {
    return (
      <span className="inline-flex items-center rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-[color:var(--board-slate-ink)]">
        {libelleCharge(etat)}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--board-signal-pale)] py-1 pl-1 pr-2.5 text-[11px] font-semibold text-[color:var(--board-signal-ink)]">
      {/* `--board-signal-on` et non `--board-signal-ink` : l'encre est faite
          pour le champ pâle, pas pour le rouge plein. À 9,5 px gras, elle
          tombait sous le seuil AA — et c'est le seul endroit de la pastille
          où le nombre se lit. */}
      <span className="flex size-4 items-center justify-center rounded-full bg-[color:var(--board-signal)] text-[9.5px] font-bold text-[color:var(--board-signal-on)]">
        {etat.nbEnRetard}
      </span>
      {libelleCharge(etat)}
    </span>
  );
}

/**
 * Une zone, en une ligne : son nom, son parc, sa charge.
 *
 * 2026-10-20 — un seul dessin pour tout l'établissement. La rangée d'un
 * volume par zone (ADR-019, puis ADR-029) dessinait trois immeubles pour un
 * restaurant découpé en trois zones : le texte disait « zones », l'image
 * disait « bâtiments ». Depuis la décision du 2026-10-17 (un établissement =
 * un bâtiment), le dessin est celui de l'établissement, et les zones en sont
 * la liste.
 */
function LigneZone({ batiment }: { batiment: BatimentCharge }) {
  return (
    <li className="flex items-center justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <p className="m-0 break-words text-[14px] font-semibold leading-[1.25] tracking-[-0.01em] text-[color:var(--board-ink)]">
          {nomDeZone(batiment.nom)}
        </p>
        <p className="m-0 mt-0.5 text-[11.5px] text-[color:var(--board-slate-mid)]">
          {batiment.nbEquipements} équipement
          {batiment.nbEquipements > 1 ? "s" : ""}
        </p>
      </div>
      <div className="flex-none">
        <PastilleCharge
          nbEquipements={batiment.nbEquipements}
          nbEnRetard={batiment.nbEnRetard}
        />
      </div>
    </li>
  );
}

export function HeroBatiments({
  nomEtablissement,
  logoUrl,
  batiments,
  srcIllustration,
  legende,
}: Props) {
  return (
    // Verre givré, en une seule plaque. Le dégradé du haut vers le bas donne
    // le galbe ; les deux reflets intérieurs font lire une épaisseur.
    <div className="mx-auto w-fit max-w-full rounded-[34px] border border-white/65 bg-gradient-to-b from-white/62 to-white/34 px-6 pb-7 pt-5 shadow-[inset_0_1px_0_rgba(255,255,255,.95),inset_0_-1px_0_rgba(255,255,255,.42),0_22px_48px_-26px_rgba(13,18,36,.30)] backdrop-blur-[26px] backdrop-saturate-[125%]">
      <Enseigne
        nom={nomEtablissement}
        logoUrl={logoUrl}
        nbZones={batiments.length}
      />

      <div className="mt-5 flex flex-wrap items-center gap-x-7 gap-y-4">
        {/* Décoratif : un seul dessin, celui de l'établissement. `sizes` : la
            planche est rendue à 168 px au plus, densité double comprise. */}
        <Image
          src={srcIllustration}
          alt=""
          aria-hidden
          width={760}
          height={668}
          sizes="168px"
          priority
          className="h-auto w-[132px] flex-none select-none sm:w-[168px]"
        />
        <ul className="m-0 min-w-[220px] flex-1 list-none divide-y divide-[color:rgba(10,10,10,.08)] p-0">
          {batiments.map((b) => (
            <LigneZone key={b.id} batiment={b} />
          ))}
        </ul>
      </div>

      {/* Ce que les pastilles comptent — et ce qu'elles ne comptent pas. */}
      <p className="m-0 mt-4 max-w-[46ch] text-[11.5px] leading-[1.5] text-[color:var(--board-slate-ink)]">
        {legende}
      </p>
    </div>
  );
}
