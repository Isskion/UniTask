import { Suspense } from "react";
import { AgendaView } from "@/components/agenda/AgendaView";

export const metadata = {
    title: "Agenda Semanal · UniTask",
    description: "Agenda de consultores por semana — seguimiento de actividades en tiempo real",
};

export default function AgendaPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center bg-[#0a0a0c] text-zinc-600 text-sm">
                Cargando agenda…
            </div>
        }>
            <AgendaView />
        </Suspense>
    );
}
