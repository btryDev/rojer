import Link from "next/link";
import { LienEffectifEntreprise } from "@/components/entreprises/LienEffectifEntreprise";
import type { MarqueAConfirmer } from "@/lib/matching/marques";

/**
 * Le bloc « à confirmer » d'une ligne, en toutes lettres, avec l'endroit où
 * l'on répond. Là où `MentionAConfirmer` n'est qu'un mot sur une liste, ce
 * bloc est ce que la fiche d'une ligne montre.
 *
 * DEUX RENVOIS, parce que deux fiches répondent : l'effectif de l'ENTREPRISE
 * (`effectif`, C37) se corrige sur la fiche de l'entreprise ; toute autre
 * question muette, sur celle de l'établissement. Un seul lien vers la mauvaise
 * fiche serait une porte qui ne mène pas à la réponse.
 */
export function BlocAConfirmer({
  marque,
  hrefFicheEtablissement,
  entrepriseId,
}: {
  marque: MarqueAConfirmer;
  hrefFicheEtablissement: string;
  entrepriseId: string | null;
}) {
  if (marque.phrases.length === 0) return null;
  // Une phrase d'effectif est la première quand elle existe
  // (`phrasesAConfirmer`) : les autres viennent d'une question de la fiche.
  const questionsDeLaFiche = marque.phrases.length - (marque.effectif ? 1 : 0);
  return (
    <div className="text-[13px] leading-[1.55] text-[color:var(--board-slate-mid)]">
      {marque.phrases.map((phrase) => (
        <p key={phrase} className="m-0 max-w-[66ch]">
          <strong className="font-semibold text-[color:var(--board-ink)]">
            À confirmer.
          </strong>{" "}
          {phrase}
        </p>
      ))}
      {marque.effectif && entrepriseId && (
        <LienEffectifEntreprise
          entrepriseId={entrepriseId}
          effectif={null}
          className="m-0 mt-1 text-[12.5px] leading-[1.5]"
        />
      )}
      {questionsDeLaFiche > 0 && (
        <Link
          href={hrefFicheEtablissement}
          className="mt-1 inline-block text-[12.5px] font-semibold text-[color:var(--board-blue-ink)] hover:text-[color:var(--board-ink)]"
        >
          Répondre sur la fiche de l&apos;établissement
        </Link>
      )}
    </div>
  );
}
