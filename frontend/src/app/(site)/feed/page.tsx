/* /feed → /news. Facebook Page-ийн нийтлэлүүд backend-ийн sync-ээр (backend/app/news/fb_sync.py)
   мэдээний буланд автоматаар орж ирдэг тул тусдаа хуудас хэрэггүй — хуучин холбоосууд /news руу шилжинэ. */

import { permanentRedirect } from "next/navigation";

export default function FeedPage() {
  permanentRedirect("/news");
}
