/* /olympiad — server component: бүх өгөгдлийг зэрэг татаж client root-д дамжуулна. */

import { OlympiadPage } from "@/components/olympiad/OlympiadPage";
import { fetchOlympiadAlbum, fetchOlympiadPage, fetchOlympiadResults, fetchOlympiadStages, fetchOlympiadYears } from "@/lib/olympiad-api";

export default async function Page() {
  const [page, years, stages, results, album] = await Promise.all([
    fetchOlympiadPage(), fetchOlympiadYears(), fetchOlympiadStages(), fetchOlympiadResults(), fetchOlympiadAlbum(),
  ]);
  return <OlympiadPage page={page} years={years} stages={stages} results={results} album={album} />;
}
