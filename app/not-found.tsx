import Link from 'next/link'

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
            <h2 className="text-2xl font-bold text-red-500 mb-4">Página No Encontrada</h2>
            <p className="text-zinc-400 mb-8">No pudimos encontrar el recurso que buscas.</p>
            <Link href="/" className="px-4 py-2 bg-zinc-800 rounded hover:bg-zinc-700 transition-colors">
                Volver al Inicio
            </Link>
        </div>
    )
}
