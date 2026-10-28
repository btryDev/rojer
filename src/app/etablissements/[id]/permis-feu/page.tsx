import Link from "next/link";
import { EnTetePage } from "@/components/entete-page/EnTetePage";
import { BarreDeListe } from "@/components/ui-kit/BarreDeListe";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  CarteFiche,
  LegalBadge,
  Textes,
  LignesFiche,
  WhyCard,
} from "@/components/ui-kit";
import { PermisFeuCard } from "@/components/permis-feu/PermisFeuCard";
import { requireEtablissement } from "@/lib/auth/scope";
import { listPermisFeu } from "@/lib/permis-feu/queries";

export const metadata = {
  title: "Permis de feu",
};

/**
 * Le registre des permis de feu, en charte board (`docs/charte-board.md`).
 *
 * L'écran était en charte papier : `AppTopbar`, colonne centrée
 * `max-w-4xl`, `cartouche`, et un `EmptyState` qui porte la même dette. Il
 * suit désormais le patron de liste du board — ~~bandeau bord à bord~~
 * [2026-10-25 : l'en-tête commun `EnTetePage`, puis `BarreDeListe`],
 * gouttière `--board-gutter`, lignes du kit `fiche/`.
 *
 * Le « pourquoi cette page » est passé en pied, comme sur l'annuaire des
 * prestataires : on le lit une fois, on ne le relit pas à chaque visite,
 * et ce qu'on vient chercher ici est la liste.
 */
export default async function PermisFeuListePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireEtablissement(id);
  const permis = await listPermisFeu(id);

  return (
    <main className="flex flex-1 flex-col bg-[color:var(--board-canvas)] pb-16">
      <EnTetePage
        item="permis-feu"
        description="Les travaux par point chaud — soudage, découpe, meulage — et leur permis, d'après la brochure INRS ED 6030. Aucun texte ne l'impose sous ce nom (voir plus bas)."
      />

      <div className="flex flex-col gap-7 px-[var(--board-gutter)] pt-6">
        <BarreDeListe
          action={
            <Link
              href={`/etablissements/${id}/permis-feu/nouveau`}
              className={buttonVariants({ variant: "board", size: "board" })}
            >
              <Plus className="size-3.5" aria-hidden />
              Nouveau permis
            </Link>
          }
        />
        {permis.length === 0 ? (
          /* État vide, pas état d'erreur : il dit ce que l'écran fera, d'où
             viendront les données, et ouvre une porte (charte § 6). */
          <section className="carte-board px-7 py-8 sm:px-8">
            <div className="flex max-w-[var(--board-mesure)] flex-col gap-3">
              <h2 className="board-titre m-0 text-[22px]">
                Vos permis de feu
              </h2>
              <p className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                Rojer propose un permis de feu pour chaque travail par points
                chauds réalisé chez vous, signé par vous et par
                l&apos;intervenant&nbsp;; aucun texte ne l&apos;impose sous ce
                nom (voir plus bas). Cette liste vous permet de retrouver
                l&apos;historique complet.
              </p>
              <p className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                Créez votre premier permis dès qu&apos;un soudeur, un plombier
                au chalumeau, un couvreur au fer chaud intervient sur place.
              </p>
              <div className="mt-2">
                <Link
                  href={`/etablissements/${id}/permis-feu/nouveau`}
                  className={buttonVariants({
                    variant: "board",
                    size: "board",
                  })}
                >
                  <Plus className="size-3.5" aria-hidden />
                  Créer un permis de feu
                </Link>
              </div>
            </div>
          </section>
        ) : (
          /* Pas de sur-titre sur la carte : le `h1` nomme déjà la vue
             (interdit 12). Le corps laisse les lignes poser leurs propres
             gouttières. */
          <CarteFiche corpsClassName="py-1.5">
            <LignesFiche>
              {permis.map((p) => (
                <PermisFeuCard key={p.id} etablissementId={id} permis={p} />
              ))}
            </LignesFiche>
          </CarteFiche>
        )}

        <WhyCard
          charte="board"
          kicker="Pourquoi cette page"
          titre="Ce que le permis de feu enregistre."
          enjeu="« Les travaux par points chauds représentent 30 % des origines d'un incendie dans l'entreprise » (INRS, ED 6030, août 2019). Le permis nomme qui intervient, où, et les mesures cochées avant les travaux."
          tonalite="info"
        >
          <p className="m-0">
            Aucun texte n&apos;impose le permis de feu sous ce nom.
            L&apos;arrêté du 19 mars 1993 (art. 1er, point 21), qui liste les
            travaux dangereux pour lesquels un plan de prévention est établi
            par écrit (art. R. 4512-7),
            mentionne les «&nbsp;Travaux de soudage oxyacétylénique exigeant
            le recours à un permis de feu&nbsp;». En ERP, l&apos;article
            GN&nbsp;13 du règlement de sécurité, intitulé «&nbsp;Travaux
            dangereux&nbsp;», est cité ci-dessous.
          </p>
          <Textes className="mt-4">
            <LegalBadge
              charte="board"
              reference="INRS ED 6030"
              href="https://www.inrs.fr/media.html?refINRS=ED%206030"
            >
              Brochure de l&apos;INRS (2e édition, août 2019)&nbsp;: la
              démarche avant, pendant et après les travaux, et un exemple de
              permis de feu. Ni article de code, ni arrêté.
            </LegalBadge>
            {/* L'URL pointait sur LEGIARTI000018530333, qui n'est pas
                R. 4224-17 mais R. 4434-9 (bruit). Relu à la source le
                2026-08-28 ; l'identifiant juste est celui que citent déjà les
                autres écrans. */}
            {/* ~~Badge « Art. R. 4224-17 CT »~~ — retiré le 2026-09-20. Son URL
                avait déjà été corrigée le 2026-08-28 ; l'article lui-même n'a
                pas sa place ici. Il impose l'entretien et la vérification des
                INSTALLATIONS ET DISPOSITIFS techniques et de sécurité des lieux
                de travail — c'est ce qu'il fonde ailleurs dans le produit, sur
                les portes et portails —, et rien sur un permis de travail par
                point chaud. Le cadre réel de cette page est nommé juste
                au-dessus, et il est non opposable : c'est la vérité de ce
                module, écrite au README du ZIP et désormais ici aussi. */}
            {/* Ici se tenait « MS 52 ERP · APSAD R43 », sans lien. Les deux
                références étaient fausses, chacune à sa manière, et le
                2026-08-28 les a relues à la source :

                — MS 52 de l'arrêté du 25 juin 1980 s'intitule « Présence de
                  l'exploitant » et traite de qui doit se trouver dans
                  l'établissement pendant l'ouverture au public. Il ne dit rien
                  des travaux. L'article ERP qui les vise est GN 13, et il ne
                  prescrit pas de permis de feu : il interdit le chantier
                  dangereux en présence du public.

                — APSAD R43 est une règle de la profession de l'assurance. Ce
                  dépôt ne cite que des sources primaires ou institutionnelles
                  (`conformite/types.ts`, ADR-003) : une règle d'assureur ne
                  prend pas la pastille d'un article de code. Elle reste
                  nommée en clair sous les pastilles, pour ce qu'elle est. */}
            <LegalBadge
              charte="board"
              reference="Art. GN 13 · Règlement ERP"
              href="https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000020303866"
              extrait="L'exploitant ne peut effectuer ou faire effectuer, en présence du public, des travaux qui feraient courir un danger quelconque à ce dernier ou qui apporteraient une gêne pour son évacuation."
            />
          </Textes>
          <p className="m-0 mt-3 text-[13px] leading-[1.6] text-[color:var(--board-slate-mid)]">
            La règle APSAD R43 (travaux par points chauds) est un référentiel
            publié par la profession de l&apos;assurance, que Rojer n&apos;a
            pas lu&nbsp;: ni un article de code, ni un arrêté. Un contrat
            d&apos;assurance peut y renvoyer&nbsp;; Rojer ne lit pas le vôtre.
          </p>
        </WhyCard>
      </div>
    </main>
  );
}
