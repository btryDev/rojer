import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { EtablissementForm } from "@/components/etablissements/EtablissementForm";
import { LienEffectifEntreprise } from "@/components/entreprises/LienEffectifEntreprise";
import { creerEtablissement } from "@/lib/etablissements/actions";
import { getEntrepriseDuUser } from "@/lib/entreprises/queries";
import { getOptionalUserEtablissement } from "@/lib/auth/scope";

/**
 * Ouvrir un établissement de plus (ADR-028).
 *
 * Cette route était un aiguilleur de quinze lignes : elle renvoyait au dossier
 * existant, parce qu'il ne pouvait y en avoir qu'un. Elle redevient ce que son
 * nom dit — un formulaire de création —, et c'est le même que celui de la
 * modification (`EtablissementForm`) branché sur `creerEtablissement`. Deux
 * formulaires pour un même objet finissent toujours par diverger sur un champ,
 * et c'est le moteur d'obligations qui paie l'écart.
 *
 * L'onboarding reste le chemin du PREMIER dossier : il crée l'entreprise et
 * l'établissement en une transaction, et pose les gardes de périmètre de
 * l'ADR-031. Sans entreprise, il n'y a pas de parent à qui rattacher — on y
 * renvoie plutôt que d'afficher un formulaire qui n'aurait rien où écrire.
 *
 * **Pourquoi cet écran n'a ni rail ni barre haute.** Le chrome d'application
 * vit dans `etablissements/[id]/layout.tsx` et se résout par l'identifiant de
 * l'URL ; ici il n'y en a pas encore — c'est le dossier qu'on est en train
 * d'ouvrir. Monter le rail de l'établissement actif ferait pire : on
 * remplirait le formulaire d'un site sous la navigation d'un autre. C'est un
 * écran d'entrée, comme l'onboarding, et le fil de retour en tête est sa seule
 * sortie — il doit donc toujours mener quelque part.
 */
export default async function EtablissementNouveauPage() {
  const entreprise = await getEntrepriseDuUser();
  if (!entreprise) redirect("/onboarding");

  // Le fil de retour ne peut pas pointer « la » fiche du compte : il n'y en a
  // plus. Il pointe celle d'où l'on vient, c'est-à-dire l'établissement actif.
  const actif = await getOptionalUserEtablissement();
  const retourHref = actif ? `/etablissements/${actif.id}` : "/";

  const action = creerEtablissement.bind(null, entreprise.id);

  return (
    <main className="flex flex-1 flex-col bg-[color:var(--board-canvas)] pb-16">
      {/* Même gabarit que `/etablissements/[id]/modifier` : le fil de retour
          porte le contexte, le titre porte le geste. */}
      <header className="border-b border-[color:var(--board-slate-line)] bg-[color:var(--board-card)] px-[var(--board-gutter)] py-[22px]">
        <Link
          href={retourHref}
          className="board-eyebrow inline-flex items-center gap-2 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)] transition-colors hover:text-[color:var(--board-ink)]"
        >
          <ArrowLeft className="size-3" aria-hidden />
          {entreprise.raisonSociale}
        </Link>
        <h1 className="board-titre m-0 mt-2.5 text-[clamp(22px,2.2vw,27px)]">
          Ajouter un établissement
        </h1>
        {/* Dire ce que la création déclenche, avant de la déclencher : un
            dossier neuf, pas une ligne d'annuaire. */}
        <p className="m-0 mt-2 max-w-[66ch] text-[13.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
          Un dossier de conformité complet sera ouvert pour ce site — calendrier
          d&apos;obligations, registres et DUERP lui sont propres. Les régimes et
          l&apos;effectif déclarés ici déterminent les obligations qui
          s&apos;y appliquent.
        </p>
        {/* Ajouter un site, c'est le moment où l'effectif de l'entreprise
            cesse le plus souvent d'être juste : il est rappelé ici, avec le
            chemin pour le corriger (C37). Les seuils du comité social et
            économique et du règlement intérieur se comptent sur lui. */}
        <p className="m-0 mt-2 max-w-[66ch] text-[13.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
          Les seuils de onze et de cinquante salariés se comptent sur
          l&apos;effectif de l&apos;entreprise, tous établissements confondus :
          s&apos;il change avec ce site, mettez-le à jour.
        </p>
        <LienEffectifEntreprise
          entrepriseId={entreprise.id}
          effectif={entreprise.effectif}
        />
      </header>

      <div className="px-[var(--board-gutter)] pt-6">
        <div className="carte-board max-w-[880px] px-7 py-7 sm:px-8">
          <EtablissementForm
            action={action}
            entreprise={{ id: entreprise.id, effectif: entreprise.effectif }}
            libelleSubmit="Créer l'établissement"
            labelAnnuler={{ libelle: "Annuler", href: retourHref }}
          />
        </div>
      </div>
    </main>
  );
}
