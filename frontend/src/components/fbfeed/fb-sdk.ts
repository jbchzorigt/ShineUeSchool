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
    const prevInit = window.fbAsyncInit;
    window.fbAsyncInit = () => {
      prevInit?.();
      getFB()?.init({ appId, version: SDK_VERSION, xfbml: false });
    };
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://connect.facebook.net/mn_MN/sdk.js";
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Facebook SDK ачаалж чадсангүй."));
    document.body.appendChild(script);
    waitForGlobal();
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

/** Зочин Facebook-т нэвтэрсэн эсэхийг шалгаж, үгүй бол нэвтрэх цонх нээнэ. */
export async function ensureFacebookLogin(appId: string | undefined): Promise<FbSdk> {
  const FB = await loadFacebookSdk(appId);
  const status = await new Promise<FbLoginStatus>((resolve) => FB.getLoginStatus(resolve, true));
  if (status.status === "connected" && status.authResponse) return FB;
  const res = await new Promise<FbLoginStatus>((resolve) => FB.login(resolve, { scope: "public_profile" }));
  if (res.status !== "connected" || !res.authResponse) throw new FbLoginCancelled();
  return FB;
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
