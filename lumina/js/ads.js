/**
 * Full-screen ad every second death, inside the Android app only.
 * The browser build keeps playing with no network.
 *
 * The ids below are the real AdMob app and interstitial unit. testing
 * stays false so a Play build never requests Google's sample ads.
 * Keep the app id in the Android manifest under
 * com.google.android.gms.ads.APPLICATION_ID.
 */

const DEATHS_KEY = "lumina-deaths";

export const AD_CONFIG = {
  testing: false,
  appId: "ca-app-pub-7213428821254710~5090033276",
  interstitialId: "ca-app-pub-7213428821254710/5416115148",
};

export function shouldShowAd(deaths) {
  return deaths > 0 && deaths % 2 === 0;
}

function readDeaths() {
  try {
    const value = Number(localStorage.getItem(DEATHS_KEY));
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  } catch {
    return 0;
  }
}

function writeDeaths(deaths) {
  try {
    localStorage.setItem(DEATHS_KEY, String(deaths));
  } catch {
    /* The next death still counts in this session if storage is blocked. */
  }
}

function adsReady() {
  return Boolean(AD_CONFIG.appId && AD_CONFIG.interstitialId);
}

function adMob() {
  if (!adsReady()) return null;
  const cap = globalThis.Capacitor;
  if (!cap?.isNativePlatform?.() || !cap.registerPlugin) return null;
  try {
    return cap.registerPlugin("AdMob");
  } catch {
    return null;
  }
}

let prepared = false;

function interstitialId() {
  return AD_CONFIG.interstitialId;
}

async function prepare() {
  const admob = adMob();
  if (!admob || (AD_CONFIG.testing === false && !AD_CONFIG.interstitialId)) return;
  try {
    await admob.prepareInterstitial({
      adId: interstitialId(),
      isTesting: AD_CONFIG.testing,
    });
    prepared = true;
  } catch {
    prepared = false;
  }
}

export async function initAds() {
  const admob = adMob();
  if (!admob) return;
  try {
    await admob.initialize({ initializeForTesting: AD_CONFIG.testing });
    await admob.addListener?.("interstitialAdDismissed", () => {
      prepared = false;
      prepare();
    });
    await prepare();
  } catch {
    prepared = false;
  }
}

export async function showInterstitial() {
  const admob = adMob();
  if (!admob || !prepared) return false;
  prepared = false;
  try {
    await admob.showInterstitial();
    return true;
  } catch {
    prepare();
    return false;
  }
}

export function noteDeath() {
  const deaths = readDeaths() + 1;
  writeDeaths(deaths);
  if (shouldShowAd(deaths)) showInterstitial();
  return deaths;
}
