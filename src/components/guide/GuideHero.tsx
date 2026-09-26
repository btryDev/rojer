import { IllustrationDocuments } from "./IllustrationDocuments";

/**
 * Hero de la page /guide — split 1.15fr / 1fr.
 * Gauche : kicker + titre éditorial + lede + 3 pastilles méta.
 * Droite : illustration SVG (3 documents empilés · badge · post-it).
 */
export function GuideHero() {
  return (
    <section className="grid grid-cols-1 gap-10 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-16">
      <div>
        <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">§ Guide de l&apos;employeur</p>
        <h1 className="board-titre text-[clamp(22px,2.2vw,27px)] mt-4 text-[clamp(2.2rem,4.2vw,3.2rem)]">
          Vos obligations de santé-sécurité,
          <br />
          <em className="text-[color:var(--board-blue-ink)]">au clair</em>.
        </h1>
        <p className="mt-5 max-w-[52ch] text-[1rem] leading-[1.65] text-[color:var(--board-ink)]/75">
          Ce que la loi attend d&apos;un employeur, comment votre
          établissement est concerné, et quels outils la plateforme tient
          à jour pour vous.
        </p>

        <ul className="mt-8 flex flex-wrap gap-2.5">
          <MetaPastille titre="~ 7 min" sous="de lecture" />
          {/* ~~« 4 outils »~~ : cinq cartes actives depuis que le carnet
              sanitaire l'est ; ~~« Légifrance · INRS »~~ : EUR-Lex aussi
              (relecture du 2026-09-26). */}
          <MetaPastille titre="5 outils" sous="suivis ici" />
          <MetaPastille titre="Sources" sous="Légifrance · EUR-Lex · INRS" highlight />
        </ul>
      </div>

      <IllustrationDocuments />
    </section>
  );
}

function MetaPastille({
  titre,
  sous,
  highlight,
}: {
  titre: string;
  sous: string;
  highlight?: boolean;
}) {
  return (
    <li
      className={
        "inline-flex flex-col rounded-xl border px-3.5 py-2 " +
        (highlight
          ? "border-[color:var(--board-green-ink)]/40 bg-[color:var(--board-green)]"
          : "border-[color:var(--board-slate)] bg-[color:var(--board-slate-pale)]/60")
      }
    >
      <strong
        className={
          "text-[0.92rem] font-semibold " +
          (highlight ? "text-[color:var(--board-green-ink)]" : "text-[color:var(--board-ink)]")
        }
      >
        {titre}
      </strong>
      <em className="font-mono text-[0.6rem] not-italic uppercase tracking-[0.18em] text-[color:var(--board-slate-mid)]">
        {sous}
      </em>
    </li>
  );
}
