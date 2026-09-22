import { redirect } from "next/navigation";

/* /admin/olympiad → эхний таб (хуваарь). */
export default function OlympiadIndex() {
  redirect("/admin/olympiad/schedule");
}
