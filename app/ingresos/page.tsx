import type { Metadata } from "next";
import { PanelIngresos } from "@/components/ingresos/panel-ingresos";
import { RutaProtegida } from "@/components/ruta-protegida";
import { mesEnCurso } from "@/lib/ingresos/fechas";

export const metadata: Metadata = {
  title: "Reporte de ingresos",
};

export default function IngresosPage() {
  return (
    <RutaProtegida roles={["ARRENDADOR"]}>
      <div className="flex flex-1 justify-center px-4 py-8">
        <main className="w-full max-w-2xl">
          <h1 className="mb-1 text-2xl font-semibold">Reporte de ingresos</h1>
          <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
            Lo que te generó cada bien con los pagos aprobados del período (sin depósitos).
          </p>
          {/* Calculado aquí para que los campos coincidan al hidratar. */}
          <PanelIngresos rangoInicial={mesEnCurso()} />
        </main>
      </div>
    </RutaProtegida>
  );
}
