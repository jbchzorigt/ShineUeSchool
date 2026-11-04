import { redirect } from "next/navigation";

/* Хуучин хаяг: хичээлийн хуваарь одоо календарийн таб. */
export default function TimetableRedirect() {
  redirect("/calendar/timetable");
}
