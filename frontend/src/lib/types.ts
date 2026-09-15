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

export interface Result {
  id: number;
  year: number;
  grade: number;
  rank: number | null;
  student: string;
  school: string;
  score: number;
  note: string;
}

export type ResultInput = Omit<Result, "id" | "rank"> & { rank?: number | null };

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

export const GRADES = [6, 7, 8, 9, 10, 11, 12] as const;
