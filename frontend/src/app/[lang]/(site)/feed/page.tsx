/* /feed → /news. Facebook Page-ийн нийтлэлүүд backend-ийн sync-ээр (backend/app/news/fb_sync.py)
   мэдээний буланд автоматаар орж ирдэг тул тусдаа хуудас хэрэггүй — хуучин холбоосууд /news руу шилжинэ. */

import { permanentRedirect } from "next/navigation";
import { isLang, localePath } from "@/lib/i18n";

export default async function FeedPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  permanentRedirect(localePath(isLang(lang) ? lang : "mn", "/news"));
}
