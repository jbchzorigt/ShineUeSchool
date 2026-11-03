/* =====================================================================
   Facebook JS SDK-ийн туслах (client тал, components/fbfeed/FacebookFeed.tsx).

   lib/visitor.tsx-ийн VisitorProvider backend-ийн Facebook тохиргоо идэвхтэй үед
   SDK-г аль хэдийн (#facebook-jssdk) ачаалдаг — тэр тохиолдолд тэр instance-ийг
   дахин ашиглана. Үгүй бол NEXT_PUBLIC_FB_APP_ID-аар өөрсдөө ачаална.
   window.FB-ийн төрөл visitor.tsx-д нарийсгаж зарлагдсан тул энд unknown-оор
   cast хийнэ (глобал зарлалтыг давхардуулахгүй).
   ===================================================================== */

export const SDK_VERSION = "v26.0";
const SCRIPT_ID = "facebook-jssdk";

export interface FbLoginStatus {
  status: "connected" | "not_authorized" | "unknown";
  authResponse?: { accessToken: string; userID: string } | null;
}

export interface FbSdk {
  init: (opts: { appId: string; version: string; xfbml: boolean }) => void;
  login: (cb: (res: FbLoginStatus) => void, opts?: { scope?: string }) => void;
  getLoginStatus: (cb: (res: FbLoginStatus) => void, roundtrip?: boolean) => void;
  ui: (params: { method: "share"; href: string }, cb?: (res?: { error_message?: string } | null) => void) => void;
  XFBML: { parse: (el?: Element) => void };
}

function getFB(): FbSdk | undefined {
  return (window as unknown as { FB?: FbSdk }).FB;
}

let sdkPromise: Promise<FbSdk> | null = null;

/** SDK бэлэн болтол хүлээнэ; байхгүй бол appId-аар нэг удаа ачаална. */
export function loadFacebookSdk(appId: string | undefined): Promise<FbSdk> {
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise<FbSdk>((resolve, reject) => {
    const existing = getFB();
    if (existing) {
      resolve(existing);
      return;
    }
    const waitForGlobal = () => {
      let tries = 0;
      const poll = setInterval(() => {
        const fb = getFB();
        tries += 1;
        if (fb) {
          clearInterval(poll);
          resolve(fb);
        } else if (tries > 60) {
          clearInterval(poll);
          reject(new Error("Facebook SDK ачаалагдсангүй. Ad blocker-оо унтраагаад дахин оролдоно уу."));
        }
      }, 100);
    };

    if (document.getElementById(SCRIPT_ID)) {
      // Өөр код (VisitorProvider) ачаалж байна — init-ийг тэр хийнэ, бид зөвхөн хүлээнэ.
      waitForGlobal();
      return;
    }
    if (!appId) {
      reject(new Error("Facebook App ID тохируулаагүй байна (NEXT_PUBLIC_FB_APP_ID)."));
      return;
    }
    // window.FB init-ээс өмнө үүсдэг тул init дууссаны дараа л resolve хийнэ (init-гүй дуудлагууд callback-гүй өлгөөтэй үлддэг).
    const prevInit = window.fbAsyncInit;
    window.fbAsyncInit = () => {
      prevInit?.();
      const fb = getFB();
      if (!fb) return reject(new Error("Facebook SDK ачаалж чадсангүй."));
      fb.init({ appId, version: SDK_VERSION, xfbml: false });
      resolve(fb);
    };
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://connect.facebook.net/mn_MN/sdk.js";
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Facebook SDK ачаалж чадсангүй. Ad blocker-оо унтраагаад дахин оролдоно уу."));
    document.body.appendChild(script);
  }).catch((e) => {
    sdkPromise = null; // дараагийн оролдлогод дахин ачаалж үзнэ
    throw e;
  });
  return sdkPromise;
}

export class FbLoginCancelled extends Error {
  constructor() {
    super("Facebook-ээр нэвтрэхийг цуцаллаа.");
  }
}

/* Facebook 2018 оноос http хуудсанд FB.login/getLoginStatus-ийг хаасан — callback нь огт дуудагдахгүй тул
   урьдчилан шалгана (локал тест: `npx next dev --experimental-https`). */
function assertSecureContext(): void {
  if (window.location.protocol !== "https:") {
    throw new Error("Facebook нэвтрэлт зөвхөн https:// хаяг дээр ажиллана.");
  }
}

const STATUS_TIMEOUT_MS = 10_000;

function getLoginStatus(FB: FbSdk): Promise<FbLoginStatus> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("Facebook хариу өгсөнгүй. Дахин оролдоно уу.")), STATUS_TIMEOUT_MS);
    FB.getLoginStatus((res) => {
      clearTimeout(t);
      resolve(res);
    }, true);
  });
}

/* Хөтөч popup-ийг зөвхөн click-ийн дотор шууд нээвэл зөвшөөрнө. Сүлжээ хүлээсний дараа дуудсан FB.login-ийн
   popup чимээгүй хаагдаж callback нь огт ирэхгүй. Тиймээс SDK болон нэвтрэлтийн төлөвийг урьдчилан
   (диалог нээгдэхэд) prepareFacebook-оор бэлдэж, click дээр loginFromClick-ийг ямар ч await-гүй дуудна. */
let cachedStatus: FbLoginStatus | null = null;

/** SDK ачаалж, нэвтрэлтийн төлөвийг авна. https биш эсвэл SDK ачаалагдаагүй бол алдаа. */
export async function prepareFacebook(appId: string | undefined): Promise<void> {
  assertSecureContext();
  cachedStatus = await getLoginStatus(await loadFacebookSdk(appId));
}

const LOGIN_TIMEOUT_MS = 5 * 60_000;

/** prepareFacebook дууссаны дараа click handler дотроос ШУУД (await-гүй) дуудна. Нэвтэрсэн бол шууд FB-г буцаана. */
export function loginFromClick(): Promise<FbSdk> {
  const FB = getFB();
  if (!FB) return Promise.reject(new Error("Facebook SDK ачаалагдаагүй байна."));
  if (cachedStatus?.status === "connected" && cachedStatus.authResponse) return Promise.resolve(FB);
  return new Promise((resolve, reject) => {
    // Popup хаагдахад Facebook callback-аа дууддаг; энэ нь зөвхөн хэзээ ч ирэхгүй тохиолдлын хамгаалалт.
    const t = setTimeout(() => reject(new FbLoginCancelled()), LOGIN_TIMEOUT_MS);
    FB.login(
      (res) => {
        clearTimeout(t);
        cachedStatus = res;
        if (res.status === "connected" && res.authResponse) resolve(FB);
        else reject(new FbLoginCancelled());
      },
      { scope: "public_profile" },
    );
  });
}

/** Facebook-ийн Share dialog (нэвтэрсэн зочны профайл/story руу). true = хуваалцсан, false = хаасан. */
export function openShareDialog(FB: FbSdk, href: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    FB.ui({ method: "share", href }, (res) => {
      if (res && res.error_message) reject(new Error(res.error_message));
      else resolve(Boolean(res && !("error_message" in res)));
    });
  });
}
