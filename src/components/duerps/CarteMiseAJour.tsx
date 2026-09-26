import type { EffectifsDeclares } from "@/lib/matching/effectif-entreprise";
import {
  CHAPEAU_MISE_A_JOUR,
  declencheursMiseAJour,
  PIED_MISE_A_JOUR,
} from "@/lib/duerps/mise-a-jour";

/**
 * Les trois cas de mise à jour de l'art. R. 4121-2, dits au titulaire du
 * dossier sur son dossier.
 *
 * POURQUOI CETTE CARTE EXISTE. La page de synthèse ne servait que le 1° —
 * l'échéance annuelle — et seulement quand il était dépassé. Un dossier de
 * moins de onze salariés n'y lisait donc rien : ni que l'annuel ne le
 * concerne pas, ni surtout que les 2° et 3°, eux, le concernent. Le silence
 * se lisait « rien à faire », sur la part de la cible qui a le plus besoin
 * qu'on le lui dise.
 *
 * POURQUOI ELLE EST TOUJOURS AFFICHÉE. Une règle qui n'apparaît qu'une fois
 * enfreinte n'est pas une règle affichée, c'est un reproche. Charte, interdit
 * 15 : le silence ne doit jamais ressembler à une réponse.
 *
 * POURQUOI ELLE N'A NI COULEUR D'ÉTAT NI DATE. Les 2° et 3° ne sont pas
 * datables — aucune donnée du dossier ne dit quand un aménagement important
 * survient. Un champ rose ou ambre en ferait un retard ou une échéance proche
 * (interdits 3 et 4), et une ligne de calendrier en ferait un rendez-vous que
 * le texte n'écrit pas. Registre neutre, ardoise, aucun jeton d'état : c'est
 * un énoncé. Le bandeau rouge de la même page, lui, porte un retard réel — et
 * c'est pour ça qu'il a le droit à la couleur, et pas celle-ci.
 *
 * POURQUOI LE CAS INAPPLICABLE RESTE À L'ÉCRAN. Ne montrer que les cas
 * applicables ferait de la carte un résumé de situation ; on veut qu'elle soit
 * une lecture de l'article, où le dirigeant retrouve les trois et voit lequel
 * le concerne. Le cas qui ne s'applique pas passe en gris de travail — moins
 * appuyé, jamais absent.
 *
 * Toutes les phrases viennent de `lib/duerps/mise-a-jour.ts`, où elles se
 * vérifient. Ce composant les met en page, il ne décide de rien.
 */
export function CarteMiseAJour({
  effectifs,
}: {
  effectifs: EffectifsDeclares;
}) {
  return (
    <section className="carte-board px-7 py-6 sm:px-8">
      <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
        Code du travail · art. R. 4121-2
      </p>
      <h3 className="board-titre m-0 mt-1.5 text-[22px]">
        Quand ce document doit être mis à jour
      </h3>
      <p className="m-0 mt-3 max-w-[66ch] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
        {CHAPEAU_MISE_A_JOUR}
      </p>
      <ul className="m-0 mt-4 list-none p-0">
        {declencheursMiseAJour(effectifs).map((d) => (
          <li
            key={d.rang}
            className="flex items-start gap-4 border-t border-[color:var(--board-slate-line)] py-3.5"
          >
            <span
              aria-hidden
              className="mt-0.5 font-mono text-[12.5px] tabular-nums text-[color:var(--board-slate-soft)]"
            >
              {d.rang}
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={`m-0 max-w-[62ch] text-[14px] font-medium leading-[1.45] ${
                  d.applicable
                    ? "text-[color:var(--board-ink)]"
                    : "text-[color:var(--board-slate-mid)]"
                }`}
              >
                {/* Le rang se redit en lecture d'écran : le glyphe ci-contre
                    est décoratif, et « 2° » seul ne dit rien à qui n'a pas la
                    liste sous les yeux. */}
                <span className="sr-only">
                  Cas {d.rang}{" "}
                  de l&apos;art. R. 4121-2 :{" "}
                </span>
                {d.quand}
              </p>
              <p className="m-0 mt-1 max-w-[66ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                {d.portee}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <p className="m-0 mt-4 max-w-[66ch] border-t border-[color:var(--board-slate-line)] pt-4 text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
        {PIED_MISE_A_JOUR}
      </p>
    </section>
  );
}
