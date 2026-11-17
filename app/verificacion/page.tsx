import type { Metadata } from "next";
import { RutaProtegida } from "@/components/ruta-protegida";
import { PanelVerificacion } from "@/components/verificacion/panel-verificacion";

export const metadata: Metadata = { title: "Verificación de identidad" };

export default function VerificacionPage() {
  return (
    <RutaProtegida roles={["ARRENDATARIO"]}>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-8">
        <h1 className="text-2xl font-semibold">Verificación de identidad</h1>
        <PanelVerificacion />
      </main>
    </RutaProtegida>
  );
}
