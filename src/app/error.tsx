"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { EcranIncident } from "@/components/layout/EcranIncident";

/**
 * Une erreur pendant l'affichage d'une page, sous la mise en page racine.
 *
 * Next ne transmet au navigateur, en production, qu'un message générique et
 * un `digest` pour une erreur levée côté serveur ; on n'affiche même pas ce
 * message — seulement le digest, qui retrouve la ligne du journal serveur.
 * `retry()` relance le rendu du segment (convention de Next 16, cf.
 * `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md`).
 */
export default function ErreurPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // Une erreur levée côté navigateur n'a pas de trace serveur : la console
    // est le seul endroit où elle se lit.
    console.error(error);
  }, [error]);

  return (
    <>
      <title>Erreur — Rojer</title>
      <EcranIncident
        surTitre="Erreur"
        titre="La page n'a pas pu s'afficher."
        reference={error.digest}
        actions={
          <>
            <Button variant="board" size="board" onClick={() => retry()}>
              Réessayer
            </Button>
            <Link href="/" className={buttonVariants({ variant: "boardClair", size: "board" })}>
              Revenir à l&apos;accueil
            </Link>
          </>
        }
      >
        <p className="m-0">
          Réessayez dans un instant.
          {error.digest
            ? " Si l'erreur revient, transmettez-nous la référence ci-dessous."
            : null}
        </p>
      </EcranIncident>
    </>
  );
}
