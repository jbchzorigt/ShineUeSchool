import { LogoDraw } from "@/components/site/LogoDraw";

/* Хуудас хооронд шилжихэд (server-ээс өгөгдөл татах үед) харагдах Suspense fallback: navy карт дээр зурагдах сүлд. */
export default function Loading() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center py-32" aria-busy="true" aria-label="Ачаалж байна">
      <div className="grid place-items-center rounded-2xl bg-navy p-5"><LogoDraw size={96} /></div>
    </main>
  );
}
