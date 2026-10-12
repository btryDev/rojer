import Link from "next/link";
import { CarteFiche, PastilleFiche, PastilleRetard } from "@/components/ui-kit";
import { formaterDateLongueFr } from "@/lib/dates";
import { delaiEnPhrase } from "@/lib/referentiels/conformite/mention-rythme";
import { etatDuManque, type Manque } from "@/lib/salaries/du-a-la-personne";
import { ReferenceFondatrice } from "./ReferenceFondatrice";

/**
 * CE QUI MANQUE À CETTE PERSONNE (ADR-043).
 *
 * Un titre que le droit lui doit et qu'aucune déclaration ne porte : la VIP
 * et la formation à la sécurité dès l'entrée, et ce qu'un titre déjà déclaré
 * appelle. La liste vient de `ceQuiManqueALaPersonne`, la même fonction que
 * le badge d'Équipe et le tableau de bord : l'écran ne recalcule rien.
 *
 * Le ton ne monte jamais sans date. Une date d'entrée absente ne fait pas un
 * retard — elle fait une question, et la carte mène à l'endroit où l'on y
 * répond.
 *
 * Composant à part, sans état, pour être RENDU en test
 * (`CarteCeQuiManque.test.tsx`).
 */
export function phraseDuManque(m: Manque): string {
  const o = m.origine;
  if (o.type === "entree") {
    const delai = m.obligation.premierDelai
      ? delaiEnPhrase(m.obligation.premierDelai)
      : null;
    const quand = delai ? `${delai} après l'entrée au plus tard` : "dès l'entrée";
    if (o.entreLe === null || m.echeance === null) {
      return `Due ${quand}. La date d'entrée de cette personne n'est pas renseignée : Rojer ne peut pas dater l'échéance.`;
    }
    return `Due ${quand} : entrée le ${formaterDateLongueFr(o.entreLe)}, donc au plus tard le ${formaterDateLongueFr(m.echeance)}. Aucun titre n'est déclaré.`;
  }
  const source = `« ${o.par.libelle} », délivré le ${formaterDateLongueFr(o.delivreLe)}`;
  if (m.echeance === null) {
    return `Appelée par ${source}. Aucun titre n'est déclaré.`;
  }
  if (m.echeance.getTime() === o.delivreLe.getTime()) {
    return `Exigée dès ${source}. Aucun titre n'est déclaré.`;
  }
  return `Appelée par ${source} : au plus tard le ${formaterDateLongueFr(m.echeance)}. Aucun titre n'est déclaré.`;
}

function Etat({ m, now }: { m: Manque; now: Date }) {
  const etat = etatDuManque(m, now);
  if (etat === "enRetard" && m.echeance) {
    return <PastilleRetard echeance={m.echeance} maintenant={now} />;
  }
  if (etat === "proche") return <PastilleFiche ton="proche">Bientôt dû</PastilleFiche>;
  if (etat === "lointain") return <PastilleFiche ton="neutre">À venir</PastilleFiche>;
  return <PastilleFiche ton="neutre">Non daté</PastilleFiche>;
}

export function CarteCeQuiManque({
  manques,
  now,
  lienModifier,
}: {
  manques: readonly Manque[];
  now: Date;
  /** La page où se renseigne la date d'entrée. */
  lienModifier: string;
}) {
  if (manques.length === 0) return null;
  const sansDate = manques.some((m) => m.origine.type === "entree" && m.echeance === null);
  return (
    <CarteFiche titreFort="À déclarer pour cette personne">
      <p className="m-0 max-w-[66ch] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
        Ce que le Code du travail doit à cette personne et qu&apos;aucun titre
        déclaré ne porte encore. Une fois le titre déclaré ci-dessous, il suit
        son propre rythme.
        {sansDate && (
          <>
            {" "}
            <Link
              href={lienModifier}
              className="text-[color:var(--board-blue-ink)] underline-offset-4 hover:underline"
            >
              Renseigner la date d&apos;entrée →
            </Link>
          </>
        )}
      </p>
      <ul className="m-0 mt-4 flex list-none flex-col gap-2 p-0">
        {manques.map((m) => (
          <li
            key={m.obligation.id}
            className="rounded-[22px] bg-[color:var(--board-slate-pale)] px-4 py-3.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="m-0 text-[13.5px] font-semibold leading-tight text-[color:var(--board-slate-ink)]">
                {m.obligation.libelle}
              </p>
              <Etat m={m} now={now} />
            </div>
            <p className="m-0 mt-1.5 max-w-[66ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
              {phraseDuManque(m)}
            </p>
            <ReferenceFondatrice obligation={m.obligation} />
          </li>
        ))}
      </ul>
    </CarteFiche>
  );
}
