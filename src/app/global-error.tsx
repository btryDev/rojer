"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { EcranIncident } from "@/components/layout/EcranIncident";
import { variablesPolices } from "./polices";
import "./globals.css";

/**
 * L'erreur qui emporte la mise en page racine elle-même.
 *
 * Ce fichier REMPLACE `layout.tsx` quand il s'affiche : il porte donc son
 * propre `<html>` et son propre `<body>`, ses styles et ses polices (cf.
 * `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md`,
 * « Global Error »). Pas d'en-tête d'application : c'est lui qui est tombé.
 */
export default function ErreurGlobale({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="fr" className={`${variablesPolices} h-full antialiased`}>
      <body className="min-h-full">
        <title>Erreur — Rojer</title>
        <EcranIncident
          surTitre="Erreur"
          titre="Rojer n'a pas pu s'afficher."
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
      </body>
    </html>
  );
}
