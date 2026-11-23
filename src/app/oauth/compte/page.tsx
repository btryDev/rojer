// Choisir le compte qu'un assistant pourra lire (ADR-062 § 4, `postLogin`) :
// la page n'est atteinte que par une personne membre de plusieurs comptes, ou
// d'aucun.

import Link from "next/link";
import { comptesDeLaPersonne } from "@/lib/auth/membres";
import { requireUser } from "@/lib/auth/require-user";
import { requeteSigneeDeLaPage, type ParametresDePage } from "@/lib/mcp/requete-oauth";
import { choisirCompteOAuth } from "../actions";
import { CadreOAuth, DemandeExpiree } from "../cadre";

export const metadata = { title: "Choisir un compte — Rojer" };

export default async function ChoisirComptePage({ searchParams }: { searchParams: Promise<ParametresDePage> }) {
  const user = await requireUser();
  const requete = await requeteSigneeDeLaPage(await searchParams);
  if (!requete) return <DemandeExpiree />;
  const comptes = await comptesDeLaPersonne(user.id);

  if (comptes.length === 0) {
    return (
      <CadreOAuth sourcil="Connexion d'un assistant" titre="Aucun compte Rojer à relier.">
        <p className="m-0 text-[14.5px] leading-[1.55] text-[color:var(--board-ink)]">
          Cette adresse n&apos;est membre d&apos;aucun compte Rojer : il n&apos;y a pas de dossier à ouvrir à un
          assistant. Créez d&apos;abord votre établissement, puis relancez la connexion depuis votre assistant.
        </p>
        <Link href="/onboarding" className="mt-5 inline-block font-semibold text-[color:var(--board-blue-ink)] underline underline-offset-4">
          Créer mon établissement →
        </Link>
      </CadreOAuth>
    );
  }

  return (
    <CadreOAuth sourcil="Connexion d'un assistant" titre="Quel compte relier ?">
      <p className="m-0 text-[14.5px] leading-[1.55] text-[color:var(--board-ink)]">
        Vous êtes membre de plusieurs comptes Rojer. L&apos;assistant ne pourra lire que celui que vous choisissez.
      </p>
      <form action={choisirCompteOAuth} className="mt-6 flex flex-col gap-3">
        <input type="hidden" name="oauth_query" value={requete.toString()} />
        {comptes.map((c) => (
          <button
            key={c.compteId}
            type="submit"
            name="compte"
            value={c.compteId}
            className="carte-board flex items-center justify-between px-6 py-4 text-left text-[15px] font-semibold text-[color:var(--board-ink)] transition-colors hover:bg-[color:var(--board-canvas)]"
          >
            {c.nom}
            <span aria-hidden className="text-[color:var(--board-slate-soft)]">
              →
            </span>
          </button>
        ))}
      </form>
    </CadreOAuth>
  );
}
