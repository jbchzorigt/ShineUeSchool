/* Сайтын дээд цэсгүй хэсгүүдийн (админ, олимпиад) 404: лого + NotFoundView. Эдгээр хэсэг зөвхөн монголоор. */

import Image from "next/image";
import Link from "next/link";
import { NotFoundView } from "@/components/site/NotFoundView";
import { getDict } from "@/lib/i18n";

const t = getDict("mn");

export function StandaloneNotFound({ action }: { action: { href: string; label: string } }) {
  return (
    <>
      <header className="flex justify-center border-b border-line bg-white py-3">
        <Link href="/" aria-label={t.nav.logo}>
          <Image src="/logo-full.png" alt={t.nav.logoAlt} width={483} height={143} priority className="h-10 w-auto lg:h-12" />
        </Link>
      </header>
      <NotFoundView title={t.common.notFoundTitle} text={t.common.notFoundText} note={t.common.notFoundNote} action={action} />
    </>
  );
}
