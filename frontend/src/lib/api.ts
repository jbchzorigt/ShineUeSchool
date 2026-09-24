/* =====================================================================
   API клиент — FastAPI backend-тэй харьцана.
   - JWT токенийг localStorage-д хадгална.
   - 401 гарвал refresh токеноор нэг удаа сэргээж, дахин оролдоно.
   - Алдааг ApiError болгон шиднэ (status + backend-ийн JSON).
   ===================================================================== */

import type {
  AboutDepartment, AboutLeader, AboutLeaderInput, AboutPage, AboutPageInput, AboutTeacher, AboutTeacherInput,
  AcademicYear, AcademicYearInput, AlbumPhoto, CalendarEvent, CalendarEventInput, CategoryItem, ClassGroup, ClassGroupInput,
  ClubAdmin, ClubInput, ClubRegistration, ClubRegistrationAdmin, ClubRegistrationInput, ClubRound, ClubsResponse,
  CommentAdmin, CurriculumCheck, CurriculumEntry, FbStatus, GridCell, ImportResponse, Lesson, NewsCategory, NewsImage, OlympiadPage,
  OlympiadPageInput, Paged, Period, PeriodInput, PeriodSet, PostAdmin, PostInput, ProgramAdmin, ProgramAdminDetail, ProgramInput,
  ProgramWork, PublishResult, Result, ResultInput, Role, Room, RoomInput, Scholarship, ScholarshipInput, Stage, StageInput, Stats,
  Subject, SubjectInput, Teacher, TeacherInput, TimetableImportResponse, TimetableStats, User, UserInput, VisitorAdmin, WorkInput,
  Years,
} from "./types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
const TOKEN_KEY = "shineue.tokens";

export interface Tokens { access: string; refresh: string }

export class ApiError extends Error {
  constructor(public status: number, public data: unknown) {
    super(typeof data === "object" && data && "detail" in data ? String((data as { detail: unknown }).detail) : `HTTP ${status}`);
  }
  /** DRF-ийн талбар бүрийн алдааг {талбар: "мессеж"} болгоно */
  get fieldErrors(): Record<string, string> {
    if (!this.data || typeof this.data !== "object") return {};
    return Object.fromEntries(
      Object.entries(this.data as Record<string, unknown>).map(([k, v]) => [k, Array.isArray(v) ? v.join(" ") : String(v)])
    );
  }
}

export const tokens = {
  get(): Tokens | null {
    if (typeof window === "undefined") return null;
    try { return JSON.parse(localStorage.getItem(TOKEN_KEY) ?? "null"); } catch { return null; }
  },
  set(t: Tokens) { localStorage.setItem(TOKEN_KEY, JSON.stringify(t)); },
  clear() { localStorage.removeItem(TOKEN_KEY); },
};

interface Options { method?: string; body?: unknown; auth?: boolean; retry?: boolean }

async function request<T>(path: string, { method = "GET", body, auth = true, retry = true }: Options = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const isForm = body instanceof FormData;
  if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";
  const t = auth ? tokens.get() : null;
  if (t) headers.Authorization = `Bearer ${t.access}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
  });

  // Access токен хугацаа дууссан бол refresh хийгээд дахин оролдоно.
  if (res.status === 401 && auth && retry && t?.refresh) {
    const ok = await refresh(t.refresh);
    if (ok) return request<T>(path, { method, body, auth, retry: false });
    tokens.clear();
  }

  if (res.status === 204) return undefined as T;
  const data = res.headers.get("content-type")?.includes("json") ? await res.json() : await res.text();
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

async function refresh(refreshToken: string): Promise<boolean> {
  try {
    const r = await fetch(`${API_URL}/api/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: refreshToken }),
    });
    if (!r.ok) return false;
    const d = (await r.json()) as Partial<Tokens>;
    tokens.set({ access: d.access!, refresh: d.refresh ?? refreshToken });
    return true;
  } catch {
    return false;
  }
}

const q = (params: Record<string, string | number | boolean | undefined>) => {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") s.set(k, String(v));
  const str = s.toString();
  return str ? `?${str}` : "";
};

export const api = {
  /* ---- нэвтрэлт ---- */
  async login(username: string, password: string) {
    const t = await request<Tokens>("/api/auth/token/", { method: "POST", body: { username, password }, auth: false });
    tokens.set(t);
    return t;
  },
  logout() { tokens.clear(); },
  me: () => request<User>("/api/auth/me/"),

  /* ---- ерөнхий ---- */
  years: () => request<Years>("/api/olympiad/years/", { auth: false }),
  stats: () => request<Stats>("/api/olympiad/stats/", { auth: false }),

  /* ---- хуваарь ---- */
  stages: {
    list: (year?: number) => request<Stage[]>(`/api/olympiad/schedule/${q({ year })}`, { auth: false }),
    create: (d: StageInput) => request<Stage>("/api/olympiad/schedule/", { method: "POST", body: d }),
    update: (id: number, d: Partial<StageInput>) => request<Stage>(`/api/olympiad/schedule/${id}/`, { method: "PATCH", body: d }),
    remove: (id: number) => request<void>(`/api/olympiad/schedule/${id}/`, { method: "DELETE" }),
  },

  /* ---- үр дүн ---- */
  categories: (year?: number) => request<CategoryItem[]>(`/api/olympiad/categories/${q({ year })}`, { auth: false }),
  results: {
    list: (year?: number, category?: string) => request<Result[]>(`/api/olympiad/results/${q({ year, category })}`, { auth: false }),
    create: (d: ResultInput) => request<Result>("/api/olympiad/results/", { method: "POST", body: d }),
    update: (id: number, d: Partial<ResultInput>) => request<Result>(`/api/olympiad/results/${id}/`, { method: "PATCH", body: d }),
    remove: (id: number) => request<void>(`/api/olympiad/results/${id}/`, { method: "DELETE" }),
    /** Excel импорт. dryRun=true бол зөвхөн шалгаад тайлан буцаана. */
    importExcel: (file: File, year: number | "", dryRun: boolean, replace = true) => {
      const fd = new FormData();
      fd.append("file", file);
      if (year !== "") fd.append("year", String(year));
      fd.append("dry_run", String(dryRun));
      fd.append("replace", String(replace));
      return request<ImportResponse>("/api/olympiad/results/import/", { method: "POST", body: fd });
    },
  },

  /* ---- хэрэглэгч (superuser) ---- */
  roles: () => request<Role[]>("/api/auth/roles/"),
  users: {
    list: () => request<User[]>("/api/auth/users/"),
    create: (d: UserInput) => request<User>("/api/auth/users/", { method: "POST", body: d }),
    update: (id: number, d: Partial<UserInput>) => request<User>(`/api/auth/users/${id}/`, { method: "PATCH", body: d }),
    remove: (id: number) => request<void>(`/api/auth/users/${id}/`, { method: "DELETE" }),
  },

  /* ---- албум ---- */
  album: {
    list: () => request<AlbumPhoto[]>("/api/olympiad/album/"),
    create: (file: File, title: string, caption: string, order: number, isPublished: boolean) => {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("title", title);
      fd.append("caption", caption);
      fd.append("order", String(order));
      fd.append("is_published", String(isPublished));
      return request<AlbumPhoto>("/api/olympiad/album/", { method: "POST", body: fd });
    },
    update: (id: number, d: { title?: string; caption?: string; order?: number; is_published?: boolean }) =>
      request<AlbumPhoto>(`/api/olympiad/album/${id}/`, { method: "PATCH", body: d }),
    remove: (id: number) => request<void>(`/api/olympiad/album/${id}/`, { method: "DELETE" }),
  },

  /* ---- олимпиадын хуудасны тохиргоо ---- */
  olympiadPage: {
    get: () => request<OlympiadPage>("/api/olympiad/page/", { auth: false }),
    update: (d: Partial<OlympiadPageInput>) => request<OlympiadPage>("/api/olympiad/page/", { method: "PATCH", body: d }),
    setPortrait: (file: File) => { const fd = new FormData(); fd.append("image", file); return request<OlympiadPage>("/api/olympiad/page/portrait/", { method: "POST", body: fd }); },
    removePortrait: () => request<OlympiadPage>("/api/olympiad/page/portrait/", { method: "DELETE" }),
  },

  /* ---- мэдээ (админ) ---- */
  news: {
    categories: {
      list: () => request<NewsCategory[]>("/api/news/admin/categories/"),
      create: (d: { name: string; slug?: string; order: number }) => request<NewsCategory>("/api/news/admin/categories/", { method: "POST", body: d }),
      update: (id: number, d: Partial<{ name: string; slug: string; order: number }>) => request<NewsCategory>(`/api/news/admin/categories/${id}/`, { method: "PATCH", body: d }),
      remove: (id: number) => request<void>(`/api/news/admin/categories/${id}/`, { method: "DELETE" }),
    },
    posts: {
      list: (p: { page?: number; page_size?: number; status?: "all" | "draft" | "published"; category?: string } = {}) =>
        request<Paged<PostAdmin>>(`/api/news/admin/posts/${q(p)}`),
      get: (id: number) => request<PostAdmin>(`/api/news/admin/posts/${id}/`),
      create: (d: Partial<PostInput> & { title: string }) => request<PostAdmin>("/api/news/admin/posts/", { method: "POST", body: d }),
      update: (id: number, d: Partial<PostInput>) => request<PostAdmin>(`/api/news/admin/posts/${id}/`, { method: "PATCH", body: d }),
      remove: (id: number) => request<void>(`/api/news/admin/posts/${id}/`, { method: "DELETE" }),
      setCover: (id: number, file: File) => { const fd = new FormData(); fd.append("image", file); return request<PostAdmin>(`/api/news/admin/posts/${id}/cover/`, { method: "POST", body: fd }); },
      removeCover: (id: number) => request<PostAdmin>(`/api/news/admin/posts/${id}/cover/`, { method: "DELETE" }),
      addImage: (id: number, file: File, caption: string, order: number) => { const fd = new FormData(); fd.append("image", file); fd.append("caption", caption); fd.append("order", String(order)); return request<NewsImage>(`/api/news/admin/posts/${id}/images/`, { method: "POST", body: fd }); },
      updateImage: (imageId: number, d: { caption?: string; order?: number }) => request<NewsImage>(`/api/news/admin/images/${imageId}/`, { method: "PATCH", body: d }),
      removeImage: (imageId: number) => request<void>(`/api/news/admin/images/${imageId}/`, { method: "DELETE" }),
      uploadImage: (file: File) => { const fd = new FormData(); fd.append("image", file); return request<{ url: string }>("/api/news/admin/upload-image/", { method: "POST", body: fd }); },
      publish: (id: number, toFacebook: boolean) => request<PublishResult>(`/api/news/admin/posts/${id}/publish/`, { method: "POST", body: { post_to_facebook: toFacebook } }),
      unpublish: (id: number) => request<PostAdmin>(`/api/news/admin/posts/${id}/unpublish/`, { method: "POST" }),
    },
    comments: {
      list: (p: { post?: number; hidden?: boolean; page?: number } = {}) => request<Paged<CommentAdmin>>(`/api/news/admin/comments/${q({ ...p, hidden: p.hidden === undefined ? undefined : String(p.hidden) })}`),
      hide: (id: number, is_hidden: boolean) => request<CommentAdmin>(`/api/news/admin/comments/${id}/`, { method: "PATCH", body: { is_hidden } }),
      remove: (id: number) => request<void>(`/api/news/admin/comments/${id}/`, { method: "DELETE" }),
    },
    visitors: {
      list: (page = 1) => request<Paged<VisitorAdmin>>(`/api/news/admin/visitors/${q({ page })}`),
      block: (id: number, is_blocked: boolean) => request<VisitorAdmin>(`/api/news/admin/visitors/${id}/`, { method: "PATCH", body: { is_blocked } }),
    },
  },
  social: {
    status: () => request<FbStatus>("/api/social/facebook/status/", { auth: false }),
  },

  /* ---- хичээлийн хуваарь (унших нээлттэй, бичих manager) ---- */
  timetable: {
    years: {
      list: () => request<AcademicYear[]>("/api/timetable/years/", { auth: false }),
      create: (d: AcademicYearInput) => request<AcademicYear>("/api/timetable/years/", { method: "POST", body: d }),
      update: (id: number, d: Partial<AcademicYearInput>) => request<AcademicYear>(`/api/timetable/years/${id}/`, { method: "PATCH", body: d }),
      remove: (id: number) => request<void>(`/api/timetable/years/${id}/`, { method: "DELETE" }),
      setCurrent: (id: number) => request<AcademicYear>(`/api/timetable/years/${id}/set-current/`, { method: "POST" }),
    },
    periodSets: {
      list: (year: number) => request<PeriodSet[]>(`/api/timetable/period-sets/${q({ year })}`, { auth: false }),
      create: (d: { year_id: number; name: string }) => request<PeriodSet>("/api/timetable/period-sets/", { method: "POST", body: d }),
      update: (id: number, d: { name: string }) => request<PeriodSet>(`/api/timetable/period-sets/${id}/`, { method: "PATCH", body: d }),
      remove: (id: number) => request<void>(`/api/timetable/period-sets/${id}/`, { method: "DELETE" }),
    },
    periods: {
      create: (d: PeriodInput) => request<Period>("/api/timetable/periods/", { method: "POST", body: d }),
      update: (id: number, d: Partial<Omit<PeriodInput, "period_set_id">>) => request<Period>(`/api/timetable/periods/${id}/`, { method: "PATCH", body: d }),
      remove: (id: number) => request<void>(`/api/timetable/periods/${id}/`, { method: "DELETE" }),
    },
    subjects: {
      list: () => request<Subject[]>("/api/timetable/subjects/", { auth: false }),
      create: (d: SubjectInput) => request<Subject>("/api/timetable/subjects/", { method: "POST", body: d }),
      update: (id: number, d: Partial<SubjectInput>) => request<Subject>(`/api/timetable/subjects/${id}/`, { method: "PATCH", body: d }),
      remove: (id: number) => request<void>(`/api/timetable/subjects/${id}/`, { method: "DELETE" }),
    },
    teachers: {
      list: (active?: boolean) => request<Teacher[]>(`/api/timetable/teachers/${q({ active })}`, { auth: false }),
      create: (d: TeacherInput) => request<Teacher>("/api/timetable/teachers/", { method: "POST", body: d }),
      update: (id: number, d: Partial<TeacherInput>) => request<Teacher>(`/api/timetable/teachers/${id}/`, { method: "PATCH", body: d }),
      remove: (id: number) => request<void>(`/api/timetable/teachers/${id}/`, { method: "DELETE" }),
    },
    rooms: {
      list: () => request<Room[]>("/api/timetable/rooms/", { auth: false }),
      create: (d: RoomInput) => request<Room>("/api/timetable/rooms/", { method: "POST", body: d }),
      update: (id: number, d: Partial<RoomInput>) => request<Room>(`/api/timetable/rooms/${id}/`, { method: "PATCH", body: d }),
      remove: (id: number) => request<void>(`/api/timetable/rooms/${id}/`, { method: "DELETE" }),
    },
    classes: {
      list: (year: number) => request<ClassGroup[]>(`/api/timetable/classes/${q({ year })}`, { auth: false }),
      create: (d: ClassGroupInput) => request<ClassGroup>("/api/timetable/classes/", { method: "POST", body: d }),
      update: (id: number, d: Partial<Omit<ClassGroupInput, "year_id">>) => request<ClassGroup>(`/api/timetable/classes/${id}/`, { method: "PATCH", body: d }),
      remove: (id: number) => request<void>(`/api/timetable/classes/${id}/`, { method: "DELETE" }),
      curriculumCheck: (id: number) => request<CurriculumCheck[]>(`/api/timetable/classes/${id}/curriculum-check/`, { auth: false }),
      pdfUrl: (id: number) => `${API_URL}/api/timetable/classes/${id}/timetable.pdf`,
    },
    curriculum: {
      list: (classId: number) => request<CurriculumEntry[]>(`/api/timetable/curriculum/${q({ class: classId })}`, { auth: false }),
      create: (d: { class_group_id: number; subject_id: number; hours_per_week: number }) => request<CurriculumEntry>("/api/timetable/curriculum/", { method: "POST", body: d }),
      update: (id: number, d: { hours_per_week: number }) => request<CurriculumEntry>(`/api/timetable/curriculum/${id}/`, { method: "PATCH", body: d }),
      remove: (id: number) => request<void>(`/api/timetable/curriculum/${id}/`, { method: "DELETE" }),
    },
    calendar: {
      list: (year: number) => request<CalendarEvent[]>(`/api/timetable/calendar/${q({ year })}`, { auth: false }),
      create: (d: CalendarEventInput) => request<CalendarEvent>("/api/timetable/calendar/", { method: "POST", body: d }),
      update: (id: number, d: Partial<Omit<CalendarEventInput, "year_id">>) => request<CalendarEvent>(`/api/timetable/calendar/${id}/`, { method: "PATCH", body: d }),
      remove: (id: number) => request<void>(`/api/timetable/calendar/${id}/`, { method: "DELETE" }),
    },
    lessons: {
      list: (p: { year?: number; class?: number; teacher?: number; room?: number }) => request<Lesson[]>(`/api/timetable/lessons/${q(p)}`, { auth: false }),
      /** Excel импорт. dryRun=true бол зөвхөн шалгаад тайлан буцаана. */
      importExcel: (file: File, year: number, dryRun: boolean, replace = true) => {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("year", String(year));
        fd.append("dry_run", String(dryRun));
        fd.append("replace", String(replace));
        return request<TimetableImportResponse>("/api/timetable/lessons/import/", { method: "POST", body: fd });
      },
    },
    grid: {
      /** Ангийн хуваарийг бүхэлд нь солино. Давхардалтай бол ApiError(400, {conflicts: [...]}) */
      save: (classId: number, cells: GridCell[]) => request<Lesson[]>(`/api/timetable/classes/${classId}/grid/`, { method: "PUT", body: cells }),
    },
    stats: (year?: number) => request<TimetableStats>(`/api/timetable/stats/${q({ year })}`, { auth: false }),
  },

  /* ---- дугуйлан (олон нийт) ---- */
  clubs: {
    list: (grade?: number) => request<ClubsResponse>(`/api/clubs/${q({ grade })}`, { auth: false }),
    sendCode: (email: string) => request<{ ok: boolean; expires_in: number }>("/api/clubs/email/send/", { method: "POST", body: { email }, auth: false }),
    verifyCode: (email: string, code: string) => request<{ token: string; expires_in: number }>("/api/clubs/email/verify/", { method: "POST", body: { email, code }, auth: false }),
    register: (d: ClubRegistrationInput) => request<ClubRegistration>("/api/clubs/registrations/", { method: "POST", body: d, auth: false }),
  },

  /* ---- дугуйлан (менежер) ---- */
  clubsAdmin: {
    rounds: {
      list: () => request<ClubRound[]>("/api/clubs/admin/rounds/"),
      create: (name: string) => request<ClubRound>("/api/clubs/admin/rounds/", { method: "POST", body: { name } }),
      update: (id: number, d: { name?: string; is_active?: boolean }) => request<ClubRound>(`/api/clubs/admin/rounds/${id}/`, { method: "PATCH", body: d }),
      remove: (id: number) => request<void>(`/api/clubs/admin/rounds/${id}/`, { method: "DELETE" }),
      /** Excel татах: staff токентой fetch → blob (api.clubsAdmin.rounds.downloadXlsx) */
      exportUrl: (id: number) => `${API_URL}/api/clubs/admin/rounds/${id}/registrations.xlsx`,
      async downloadXlsx(id: number): Promise<Blob> {
        const t = tokens.get();
        const res = await fetch(`${API_URL}/api/clubs/admin/rounds/${id}/registrations.xlsx`, { headers: t ? { Authorization: `Bearer ${t.access}` } : {} });
        if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => null));
        return res.blob();
      },
    },
    clubs: {
      list: (roundId: number) => request<ClubAdmin[]>(`/api/clubs/admin/rounds/${roundId}/clubs/`),
      create: (roundId: number, d: ClubInput) => request<ClubAdmin>(`/api/clubs/admin/rounds/${roundId}/clubs/`, { method: "POST", body: d }),
      update: (id: number, d: Partial<ClubInput>) => request<ClubAdmin>(`/api/clubs/admin/clubs/${id}/`, { method: "PATCH", body: d }),
      remove: (id: number) => request<void>(`/api/clubs/admin/clubs/${id}/`, { method: "DELETE" }),
      reorder: (roundId: number, ids: number[]) => request<ClubAdmin[]>(`/api/clubs/admin/rounds/${roundId}/clubs/order/`, { method: "PUT", body: { ids } }),
    },
    images: {
      add: (clubId: number, file: File) => { const fd = new FormData(); fd.append("image", file); return request<ClubAdmin>(`/api/clubs/admin/clubs/${clubId}/images/`, { method: "POST", body: fd }); },
      remove: (imageId: number) => request<ClubAdmin>(`/api/clubs/admin/images/${imageId}/`, { method: "DELETE" }),
      reorder: (clubId: number, ids: number[]) => request<ClubAdmin>(`/api/clubs/admin/clubs/${clubId}/images/order/`, { method: "PUT", body: { ids } }),
    },
    registrations: {
      list: (clubId: number) => request<ClubRegistrationAdmin[]>(`/api/clubs/admin/clubs/${clubId}/registrations/`),
      remove: (id: number) => request<ClubRegistrationAdmin>(`/api/clubs/admin/registrations/${id}/remove/`, { method: "POST" }),
      setPaid: (id: number, is_paid_marked: boolean) => request<ClubRegistrationAdmin>(`/api/clubs/admin/registrations/${id}/`, { method: "PATCH", body: { is_paid_marked } }),
    },
  },

  /* ---- Бидний тухай (менежер) ---- */
  about: {
    page: {
      get: () => request<AboutPage>("/api/about/admin/page/"),
      update: (d: Partial<AboutPageInput>) => request<AboutPage>("/api/about/admin/page/", { method: "PATCH", body: d }),
      uploadImage: (file: File) => { const fd = new FormData(); fd.append("image", file); return request<{ url: string }>("/api/about/admin/upload-image/", { method: "POST", body: fd }); },
    },
    leaders: {
      list: () => request<AboutLeader[]>("/api/about/admin/leaders/"),
      create: (d: AboutLeaderInput, photo: File | null) => {
        const fd = new FormData();
        fd.append("full_name", d.full_name); fd.append("position", d.position); fd.append("level", String(d.level));
        if (photo) fd.append("photo", photo);
        return request<AboutLeader>("/api/about/admin/leaders/", { method: "POST", body: fd });
      },
      update: (id: number, d: Partial<AboutLeaderInput>) => request<AboutLeader>(`/api/about/admin/leaders/${id}/`, { method: "PATCH", body: d }),
      remove: (id: number) => request<void>(`/api/about/admin/leaders/${id}/`, { method: "DELETE" }),
      setPhoto: (id: number, file: File) => { const fd = new FormData(); fd.append("photo", file); return request<AboutLeader>(`/api/about/admin/leaders/${id}/photo/`, { method: "POST", body: fd }); },
      removePhoto: (id: number) => request<AboutLeader>(`/api/about/admin/leaders/${id}/photo/`, { method: "DELETE" }),
      reorder: (items: { id: number; level: number; order: number }[]) => request<AboutLeader[]>("/api/about/admin/leaders/order/", { method: "PUT", body: { items } }),
    },
    departments: {
      list: () => request<AboutDepartment[]>("/api/about/admin/departments/"),
      create: (name: string) => request<AboutDepartment>("/api/about/admin/departments/", { method: "POST", body: { name } }),
      update: (id: number, name: string) => request<AboutDepartment>(`/api/about/admin/departments/${id}/`, { method: "PATCH", body: { name } }),
      remove: (id: number) => request<void>(`/api/about/admin/departments/${id}/`, { method: "DELETE" }),
      reorder: (ids: number[]) => request<AboutDepartment[]>("/api/about/admin/departments/order/", { method: "PUT", body: { ids } }),
    },
    teachers: {
      create: (deptId: number, d: AboutTeacherInput) => request<AboutTeacher>(`/api/about/admin/departments/${deptId}/teachers/`, { method: "POST", body: d }),
      update: (id: number, d: Partial<AboutTeacherInput>) => request<AboutTeacher>(`/api/about/admin/teachers/${id}/`, { method: "PATCH", body: d }),
      remove: (id: number) => request<void>(`/api/about/admin/teachers/${id}/`, { method: "DELETE" }),
      reorder: (deptId: number, ids: number[]) => request<AboutDepartment>(`/api/about/admin/departments/${deptId}/teachers/order/`, { method: "PUT", body: { ids } }),
    },
  },

  /* ---- Хөтөлбөрүүд (менежер) ---- */
  programs: {
    list: () => request<ProgramAdmin[]>("/api/programs/admin/programs/"),
    get: (id: number) => request<ProgramAdminDetail>(`/api/programs/admin/programs/${id}/`),
    create: (d: ProgramInput) => request<ProgramAdmin>("/api/programs/admin/programs/", { method: "POST", body: d }),
    update: (id: number, d: Partial<ProgramInput>) => request<ProgramAdmin>(`/api/programs/admin/programs/${id}/`, { method: "PATCH", body: d }),
    remove: (id: number) => request<void>(`/api/programs/admin/programs/${id}/`, { method: "DELETE" }),
    reorder: (ids: number[]) => request<ProgramAdmin[]>("/api/programs/admin/programs/order/", { method: "PUT", body: { ids } }),
    setCover: (id: number, file: File) => { const fd = new FormData(); fd.append("image", file); return request<ProgramAdmin>(`/api/programs/admin/programs/${id}/cover/`, { method: "POST", body: fd }); },
    removeCover: (id: number) => request<ProgramAdmin>(`/api/programs/admin/programs/${id}/cover/`, { method: "DELETE" }),
    uploadImage: (file: File) => { const fd = new FormData(); fd.append("image", file); return request<{ url: string }>("/api/programs/admin/upload-image/", { method: "POST", body: fd }); },
    works: {
      create: (programId: number, d: WorkInput, image: File) => {
        const fd = new FormData();
        fd.append("title", d.title); fd.append("student", d.student); fd.append("caption", d.caption); fd.append("image", image);
        return request<ProgramWork>(`/api/programs/admin/programs/${programId}/works/`, { method: "POST", body: fd });
      },
      update: (id: number, d: Partial<WorkInput>) => request<ProgramWork>(`/api/programs/admin/works/${id}/`, { method: "PATCH", body: d }),
      setImage: (id: number, file: File) => { const fd = new FormData(); fd.append("image", file); return request<ProgramWork>(`/api/programs/admin/works/${id}/image/`, { method: "POST", body: fd }); },
      remove: (id: number) => request<void>(`/api/programs/admin/works/${id}/`, { method: "DELETE" }),
      reorder: (programId: number, ids: number[]) => request<ProgramAdminDetail>(`/api/programs/admin/programs/${programId}/works/order/`, { method: "PUT", body: { ids } }),
    },
    scholarships: {
      create: (programId: number, d: ScholarshipInput) => request<Scholarship>(`/api/programs/admin/programs/${programId}/scholarships/`, { method: "POST", body: d }),
      update: (id: number, d: Partial<ScholarshipInput>) => request<Scholarship>(`/api/programs/admin/scholarships/${id}/`, { method: "PATCH", body: d }),
      remove: (id: number) => request<void>(`/api/programs/admin/scholarships/${id}/`, { method: "DELETE" }),
      setPhoto: (id: number, file: File) => { const fd = new FormData(); fd.append("photo", file); return request<Scholarship>(`/api/programs/admin/scholarships/${id}/photo/`, { method: "POST", body: fd }); },
      removePhoto: (id: number) => request<Scholarship>(`/api/programs/admin/scholarships/${id}/photo/`, { method: "DELETE" }),
      reorder: (programId: number, ids: number[]) => request<ProgramAdminDetail>(`/api/programs/admin/programs/${programId}/scholarships/order/`, { method: "PUT", body: { ids } }),
    },
  },
};
