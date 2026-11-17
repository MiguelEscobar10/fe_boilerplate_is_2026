import type { Metadata } from "next";
import { RutaProtegida } from "@/components/ruta-protegida";
import { PanelOcupacion } from "@/components/reportes/panel-ocupacion";

export const metadata: Metadata = { title: "Tasa de ocupación" };

export default function OcupacionPage() {
  return (
    <RutaProtegida roles={["ARRENDADOR"]}>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-8">
        <h1 className="text-2xl font-semibold">Tasa de ocupación</h1>
        <PanelOcupacion />
      </main>
    </RutaProtegida>
  );
}
