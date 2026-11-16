import type { Metadata } from "next";
import { ColaRevision } from "@/components/verificacion/cola-revision";

export const metadata: Metadata = { title: "Revisión de verificaciones" };

export default function RevisionPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-semibold">Revisión de verificaciones</h1>
      <ColaRevision />
    </main>
  );
}
