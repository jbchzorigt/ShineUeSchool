/* Backend API-ийн өгөгдлийн төрлүүд (backend/olympiad/serializers.py-тэй тохирно) */

export interface Stage {
  id: number;
  year: number;
  order: number;
  title: string;
  date_text: string;
  date: string | null;
  text: string;
  tags: string[];
  location: string;
}

export type StageInput = Omit<Stage, "id">;

/** Ангилал: "6".."12" анги, эсвэл багш нарын хоёр ангилал */
export type CategoryValue =
  | "6" | "7" | "8" | "9" | "10" | "11" | "12"
  | "teacher_primary" | "teacher_secondary";

export interface CategoryItem { value: CategoryValue; label: string }

export const CATEGORIES: CategoryItem[] = [
  { value: "6", label: "VI анги" },
  { value: "7", label: "VII анги" },
  { value: "8", label: "VIII анги" },
  { value: "9", label: "IX анги" },
  { value: "10", label: "X анги" },
  { value: "11", label: "XI анги" },
  { value: "12", label: "XII анги" },
  { value: "teacher_primary", label: "Бага ангийн багш" },
  { value: "teacher_secondary", label: "Дунд ангийн багш" },
];

export type RankLabel = "" | "I" | "II" | "III";
export type Medal = "" | "АЛТ" | "МӨНГӨ" | "ХҮРЭЛ";

export interface Result {
  id: number;
  year: number;
  category: CategoryValue;
  category_label: string;
  rank: number | null;
  rank_label: RankLabel;
  medal: Medal;
  last_name: string;
  first_name: string;
  student: string;     // Б.Мухулай
  full_name: string;   // Бат Мухулай
  school: string;
  code: string;
  scores: (number | null)[];
  score: number | null;
  note: string;
}

export type ResultInput = Pick<Result,
  "year" | "category" | "last_name" | "first_name" | "school" | "code" | "scores" | "score" | "rank_label" | "medal" | "note"
>;

export interface ImportSheet {
  sheet: string;
  category: CategoryValue | null;
  category_label: string;
  problems: number;
  count: number;
  skipped: number;
  warnings: string[];
}

export interface ImportResponse {
  year: number;
  detected_date: string | null;
  total: number;
  sheets: ImportSheet[];
  dry_run: boolean;
  deleted?: number;
  created?: number;
}

export interface AlbumPhoto {
  id: number;
  order: number;
  image: string;
  caption: string;
}

export interface Years {
  schedule: number[];
  results: number[];
}

export interface Stats {
  stages: number;
  results: number;
  photos: number;
  results_by_year: { year: number; count: number }[];
  latest_year: number | null;
}

export interface User {
  id: number;
  username: string;
  full_name: string;
  email: string;
  is_staff: boolean;
  is_superuser: boolean;
}
