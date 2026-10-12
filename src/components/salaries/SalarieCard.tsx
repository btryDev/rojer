import Link from "next/link";
import { IdCard } from "lucide-react";
import { CHAMP_ETAT, ENCRE_ETAT } from "@/lib/calendrier/etats";
import type { SalarieDeLaListe } from "@/lib/salaries/queries";

/**
 * Une personne dans l'annuaire de l'équipe, en charte board.
 *
 * La carte suit l'idiome de `VitrineEquipement` et de `PrestataireCard` — champ
 * coloré en tête, corps sur fond carte — avec une différence assumée : ce qui
 * colore la tête n'est pas le nombre de titres, c'est leur état. ~~Une personne
 * sans titre déclaré n'est pas « en défaut » : l'outil ne sait pas ce qu'elle
 * fait, il ne peut donc rien réclamer~~ [2026-10-12, ADR-043 : il réclame ce
 * que le texte doit à TOUT travailleur — la VIP et la formation à la sécurité,
 * datées depuis l'entrée — et ce qu'un titre déclaré appelle. Ces manques
 * colorent la tête comme un titre échu, et seulement quand ils sont datés.]
 * Pour le reste, l'outil ne sait pas ce qu'elle fait (le cinquième
 * déclencheur — l'activité réellement exercée — n'est pas implémenté) et ne
 * réclame rien.
 */
export function SalarieCard({
  etablissementId,
  salarie,
}: {
  etablissementId: string;
  salarie: SalarieDeLaListe;
}) {
  const etats = [
    ...salarie.titres.map((t) => t.etat),
    ...salarie.manques.map((m) => m.etat),
  ];
  const enRetard = etats.filter((e) => e === "enRetard").length;
  const proches = etats.filter((e) => e === "proche").length;

  const etatDeLaTete =
    enRetard > 0 ? "enRetard" : proches > 0 ? "proche" : null;

  return (
    <Link
      href={`/etablissements/${etablissementId}/equipe/${salarie.id}`}
      className="carte-board group flex flex-col overflow-hidden rounded-[22px]"
    >
      <div
        className="flex items-center gap-3 px-5 py-4"
        style={
          etatDeLaTete
            ? {
                background: CHAMP_ETAT[etatDeLaTete],
                color: ENCRE_ETAT[etatDeLaTete],
              }
            : { background: "var(--board-slate-pale)" }
        }
      >
        <span className="min-w-0 flex-1">
          <span className="board-titre block truncate text-[16px] leading-tight">
            {salarie.prenom} {salarie.nom}
          </span>
          {/* LE POSTE PREND L'ENCRE DU NOM SUR UNE TÊTE COLORÉE — correction du
              2026-09-03.

              Il héritait de `ENCRE_ETAT`, posée par `style` sur le conteneur,
              tandis que le nom porte `board-titre`, qui fixe
              `color: var(--board-ink)`. Sur la tête rouge d'une personne en
              retard, le nom sortait donc en quasi-noir et le poste en rouge
              foncé — deux encres pour deux lignes voisines, et c'est la
              SECONDE que le lecteur peinait à lire.

              MESURÉ AVANT DE CHOISIR, parce que « l'encre du champ » avait
              l'air d'être la bonne réponse et ne l'était pas. Rapports de
              contraste sur chacun des trois champs de cette tête :

                champ rouge   #ff9d9e  ·  signal-ink #8a2a23 →  4,34   SOUS AA
                                         ·  board-ink  #0a0a0a →  9,96
                champ ambre   #fff3ba  ·  amber-ink  #754d0a →  6,65
                                         ·  board-ink  #0a0a0a → 17,71
                champ ardoise #edf2f5  ·  slate-mid  #4d5d6b →  6,02
                                         ·  board-ink  #0a0a0a → 17,55

              À 11,5 px, le seuil AA est de 4,5 : **le couple rouge est le seul
              des trois à ne pas le tenir**, et l'aligner sur l'encre du champ
              aurait donc fait échouer les DEUX lignes au lieu d'une. C'est le
              nom qui avait raison. Le poste le rejoint quand la tête est
              colorée, et garde son gris ardoise quand elle ne l'est pas — la
              hiérarchie reste portée par le corps et la graisse, jamais par un
              contraste insuffisant.

              Réserve à traiter ailleurs : `--board-signal-ink` reste sous AA
              sur `--board-signal` partout où le couple sert du texte de labeur.
              Corriger le jeton passe par la charte, pas par cette carte. */}
          <span
            className="mt-1 block truncate text-[11.5px] leading-[1.4]"
            style={{
              color: etatDeLaTete
                ? "var(--board-ink)"
                : "var(--board-slate-mid)",
            }}
          >
            {salarie.poste ?? "Poste non renseigné"}
          </span>
        </span>
        {!salarie.actif && (
          <span className="pastille-board flex-none bg-[color:var(--board-card)] text-[color:var(--board-slate-mid)]">
            Sortie
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2.5 px-5 py-4">
        {/* Ce qui manque, AVANT ce qui est détenu : c'est le geste à faire. Un
            manque sans date garde la puce ardoise — rien n'est en retard sur
            une date que Rojer n'a pas. */}
        {salarie.manques.length > 0 && (
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {salarie.manques.map((m) => (
              <li key={m.obligationId} className="flex items-start gap-2">
                <span
                  aria-hidden
                  className="mt-[5px] size-[7px] flex-none rounded-full"
                  style={{ background: CHAMP_ETAT[m.etat ?? "aPlanifier"] }}
                />
                <span className="min-w-0 flex-1 text-[12.5px] leading-[1.35] text-[color:var(--board-slate-ink)] line-clamp-2">
                  À déclarer : {m.libelle}
                </span>
              </li>
            ))}
          </ul>
        )}
        {salarie.titres.length === 0 && salarie.manques.length > 0 ? null : salarie.titres.length === 0 ? (
          <p className="m-0 text-[12.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
            Aucun titre déclaré. Rojer ne devine pas ce que fait une personne :
            c&apos;est vous qui déclarez ce qu&apos;elle détient.
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {salarie.titres.slice(0, 3).map((t) => (
              <li key={t.id} className="flex items-start gap-2">
                {/* `items-start` depuis que le libellé peut tenir sur deux
                    lignes : centré, la puce se posait entre les deux. Le
                    décalage la remet sur la première. */}
                <span
                  aria-hidden
                  className="mt-[5px] size-[7px] flex-none rounded-full"
                  style={{ background: CHAMP_ETAT[t.etat] }}
                />
                {/* `line-clamp-2` et non `truncate` — correction du
                    2026-09-03. Sur une colonne de grille, une seule ligne
                    coupait « Formation en santé, sécurité et conditions de
                    tra… » : le titre du membre du CSE ne se distinguait plus
                    d'aucune autre formation. Les libellés du catalogue sont
                    des intitulés réglementaires, ils ne s'abrègent pas — et la
                    carte a la place, son corps portant au plus trois titres et
                    la mention « et n autres ». Même remède que
                    `PrestataireCard` sur sa raison sociale. */}
                <span className="min-w-0 flex-1 text-[12.5px] leading-[1.35] text-[color:var(--board-slate-ink)] line-clamp-2">
                  {t.libelle}
                </span>
              </li>
            ))}
            {salarie.titres.length > 3 && (
              <li className="text-[11.5px] text-[color:var(--board-slate-soft)]">
                et {salarie.titres.length - 3} autre
                {salarie.titres.length - 3 > 1 ? "s" : ""}
              </li>
            )}
          </ul>
        )}

        <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-[11.5px] text-[color:var(--board-slate-soft)]">
          <IdCard className="size-3.5" aria-hidden />
          {salarie.titres.length === 0
            ? "Déclarer un titre"
            : `${salarie.titres.length} titre${salarie.titres.length > 1 ? "s" : ""}`}
        </span>
      </div>
    </Link>
  );
}
