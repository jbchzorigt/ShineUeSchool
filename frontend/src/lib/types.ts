/* Backend API-ийн өгөгдлийн төрлүүд (backend/app/olympiad/schemas.py, backend/app/auth/schemas.py-тэй тохирно) */

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
  title: string;
  caption: string;
  is_published: boolean;
}

export interface OlympiadStat { value: string; label: string }
export interface OlympiadPage {
  eyebrow: string; title: string; bio: string; portrait_image: string | null; portrait_caption: string;
  about_title: string; about_lead: string; stats: OlympiadStat[];
  contact_address: string; contact_phone: string; contact_email: string;
}
export type OlympiadPageInput = Omit<OlympiadPage, "portrait_image">;

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

export type RoleCode = "manager" | "olympiad" | "news";

export interface Role { code: RoleCode; name: string }

export interface User {
  id: number;
  username: string;
  full_name: string;
  email: string;
  is_staff: boolean;
  is_superuser: boolean;
  roles: RoleCode[];
  is_active?: boolean;   // зөвхөн /api/auth/users/ хариунд
}

export interface UserInput {
  username: string;
  password?: string;     // үүсгэхэд заавал, засахад сонголттой
  full_name: string;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  roles: RoleCode[];
}

/* ---- Мэдээ ---- */
export interface Paged<T> { items: T[]; total: number; page: number; page_size: number }
export interface NewsCategory { id: number; name: string; slug: string; order: number; post_count: number }
export interface CategoryRef { id: number; name: string; slug: string }
export interface NewsImage { id: number; image: string; caption: string; order: number }
export interface PostCard {
  id: number; title: string; slug: string; excerpt: string; cover_image: string | null;
  category: CategoryRef | null; published_at: string | null; likes_count: number; comments_count: number;
}
export interface PostDetail extends PostCard { body_html: string; images: NewsImage[]; liked_by_me: boolean; fb_post_id: string | null }
export interface PostAdmin extends PostDetail {
  is_published: boolean; author: { id: number; full_name: string } | null; fb_error: string | null; created_at: string; updated_at: string;
}
export interface PostInput { title: string; slug?: string; excerpt: string; body_html: string; category_id: number | null; published_at: string | null }
export interface VisitorRef { id: number; name: string; avatar_url: string }
export interface CommentItem { id: number; body: string; created_at: string; visitor: VisitorRef; is_mine: boolean }
export interface CommentAdmin extends CommentItem { is_hidden: boolean; post: { id: number; title: string; slug: string } }
export interface VisitorAdmin extends VisitorRef { fb_id: string; created_at: string; is_blocked: boolean; comments_count: number }
export interface FbStatus { enabled: boolean; app_id: string; page_url: string }
export interface PublishResult { post: PostAdmin; fb: { ok: boolean; post_id: string | null; error: string | null } }

/* ---- Хичээлийн хуваарь (backend/app/timetable/schemas.py) ---- */
export interface AcademicYear { id: number; name: string; start_date: string; end_date: string; working_days: number; is_current: boolean }
export type AcademicYearInput = Omit<AcademicYear, "id" | "is_current">;
export interface Period { id: number; period_set_id: number; order: number; start_time: string; end_time: string; is_break: boolean }
export type PeriodInput = Omit<Period, "id">;
export interface PeriodSet { id: number; year_id: number; name: string; periods: Period[] }
export interface Subject { id: number; name: string; short_name: string; color: string }
export type SubjectInput = Omit<Subject, "id">;
export interface Teacher { id: number; last_name: string; first_name: string; short_name: string; full_name: string; is_active: boolean; subject_ids: number[] }
export type TeacherInput = Omit<Teacher, "id" | "full_name">;
export type RoomKind = "classroom" | "lab" | "gym" | "other";
export interface Room { id: number; name: string; capacity: number | null; kind: RoomKind }
export type RoomInput = Omit<Room, "id">;
export interface ClassGroup { id: number; year_id: number; grade: number; letter: string; name: string; period_set_id: number; homeroom_teacher_id: number | null }
export type ClassGroupInput = Omit<ClassGroup, "id" | "name">;
export interface CurriculumEntry { id: number; class_group_id: number; subject_id: number; hours_per_week: number; subject: Subject }
export type EventCategory = "term" | "holiday" | "exam" | "event" | "other";
export type AppliesTo = "all" | "primary" | "secondary" | "high";
export interface CalendarEvent { id: number; year_id: number; title: string; category: EventCategory; start_date: string; end_date: string; description: string; applies_to: AppliesTo; color: string }
export type CalendarEventInput = Omit<CalendarEvent, "id">;
export interface Lesson {
  id: number; weekday: number;
  period: { id: number; order: number; start_time: string; end_time: string; is_break: boolean };
  subject: Subject; teacher: { id: number; short_name: string }; room: { id: number; name: string } | null;
  class_group: { id: number; name: string };
}
export interface GridCell { weekday: number; period_id: number; subject_id: number; teacher_id: number; room_id: number | null }
export interface Conflict { weekday: number; period_id: number; period_order: number; kind: "teacher" | "room"; with_class: string; who: string }
export interface CurriculumCheck { subject: Subject; planned: number; scheduled: number }
export interface TimetableStats { classes: number; teachers: number; rooms: number; lessons: number; mismatched_classes: number }
export interface TimetableImportSheet { sheet: string; class_name: string | null; count: number; warnings: string[]; conflicts: Conflict[] }
export interface TimetableImportResponse { year: number; dry_run: boolean; imported: boolean; total: number; created: number; deleted: number; sheets: TimetableImportSheet[] }

/* ---- Дугуйлан ---- */
export type ClubState = "upcoming" | "open" | "full" | "closed";
export interface ClubImage { id: number; url: string; order: number }
export interface ClubRoundRef { id: number; name: string }
export interface ClubQuota { grade: number; capacity: number; taken: number; slots_left: number; full: boolean }
export interface Club {
  id: number;
  name: string;
  description: string;
  grades: number[];
  capacity: number;      // нийт (квотуудын нийлбэр)
  taken: number;
  slots_left: number;
  state: ClubState;
  quotas: ClubQuota[];   // анги тутам
  is_paid: boolean;
  fee: number;
  fee_note: string;
  registration_start: string;   // ISO datetime
  registration_end: string;
  images: ClubImage[];
}
export interface ClubsResponse { round: ClubRoundRef | null; clubs: Club[] }
export interface ClubAdmin extends Club { is_published: boolean; order: number; round_id: number }
export interface ClubInput {
  name: string;
  description: string;
  quotas: { grade: number; capacity: number }[];
  is_paid: boolean;
  fee: number;
  fee_note: string;
  registration_start: string;
  registration_end: string;
  is_published: boolean;
}
export interface ClubRound { id: number; name: string; is_active: boolean; clubs_count: number; registrations_count: number; created_at: string }
export interface ClubRegistrationInput {
  token: string;
  club_id: number;
  grade: number;
  student_last_name: string;
  student_first_name: string;
  guardian_last_name: string;
  guardian_first_name: string;
  phone: string;
}
export interface ClubRegistration {
  id: number;
  club: { id: number; name: string; is_paid: boolean; fee: number; fee_note: string };
  email: string;
  student_last_name: string;
  student_first_name: string;
  guardian_last_name: string;
  guardian_first_name: string;
  phone: string;
  grade: number;
  created_at: string;
}
export interface ClubRegistrationAdmin {
  id: number;
  email: string;
  student_last_name: string;
  student_first_name: string;
  guardian_last_name: string;
  guardian_first_name: string;
  phone: string;
  grade: number;
  status: "confirmed" | "removed";
  is_paid_marked: boolean;
  created_at: string;
  removed_at: string | null;
}

/* ---- Бидний тухай (backend/app/about/schemas.py) ---- */
export interface AboutStat { value: string; label: string }
export interface AboutPage { intro_title: string; intro_html: string; stats: AboutStat[] }
export type AboutPageInput = AboutPage;
export interface AboutLeader { id: number; full_name: string; position: string; level: number; photo: string | null }
export interface AboutLeaderInput { full_name: string; position: string; level: number }
export interface AboutTeacher { id: number; full_name: string; role: string; is_head: boolean }
export interface AboutTeacherInput { full_name: string; role: string; is_head: boolean }
export interface AboutDepartment { id: number; name: string; teachers: AboutTeacher[] }
export interface AboutData { page: AboutPage; leaders: AboutLeader[]; departments: AboutDepartment[] }

/* ---- Хөтөлбөрүүд (backend/app/programs/schemas.py) ---- */
export interface ProgramCard { id: number; slug: string; name: string; badge: string; summary: string; cover_image: string | null; grade_from: number; grade_to: number }
export interface ProgramWork { id: number; image: string; title: string; student: string; caption: string }
export interface Scholarship { id: number; student_name: string; photo: string | null; university: string; year: number; amount_usd: number }
export interface ProgramDetail extends ProgramCard { body_html: string; works: ProgramWork[]; scholarships: Scholarship[]; scholarship_total_usd: number; scholarship_count: number }
export interface ProgramAdmin extends ProgramCard { body_html: string; is_published: boolean; order: number; works_count: number; scholarships_count: number }
export interface ProgramAdminDetail extends ProgramAdmin { works: ProgramWork[]; scholarships: Scholarship[] }
export interface ProgramInput { name: string; badge: string; summary: string; grade_from: number; grade_to: number; body_html: string; is_published: boolean }
export interface WorkInput { title: string; student: string; caption: string }
export interface ScholarshipInput { student_name: string; university: string; year: number; amount_usd: number }

/* ---- Төгсөгчид: улс + сургуулиуд (backend/app/graduates/schemas.py) ---- */
export type Continent = "asia" | "europe" | "north_america" | "oceania" | "other";
export interface CountryCatalogueItem { code: string; name: string; numeric: string; continent: Continent; coords: [number, number] }
export interface GraduateDestination extends CountryCatalogueItem { id: number; universities: string[]; order: number }
export interface GraduateDestinationInput { code: string; universities: string[] }
export interface GraduateStats { total_graduates: number; university_percent: number; university_count: number; abroad_count: number }
