import { Navigation } from 'lucide-react';

export function WazeLink({ address }: { address?: string }) {
  const destination = address?.trim();
  if (!destination) {
    return <p className="text-xs text-amber-300">Cadastre o endereço completo do destino para navegar no Waze.</p>;
  }

  // Send only the destination: Waze uses the phone's current GPS location as origin.
  const href = `https://waze.com/ul?q=${encodeURIComponent(destination)}&navigate=yes&utm_source=rotapro`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="w-full py-3 px-4 bg-sky-500/15 hover:bg-sky-500/25 text-sky-200 border border-sky-400/40 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
    >
      <Navigation className="w-4 h-4" />
      Abrir no Waze
    </a>
  );
}
