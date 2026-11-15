/**
 * Full-screen ad every second death. It only runs inside the Android app.
 * The browser build keeps playing with no network.
 *
 * Before publishing, create the app in AdMob and replace the empty ids.
 * Leave testing true until the real ids are in place. Test ads in a
 * published app can get the AdMob account suspended.
 */

const DEATHS_KEY = "lumina-deaths";
const TEST_INTERSTITIAL = "ca-app-pub-3940256099942544/1033173712";

export const AD_CONFIG = {
  testing: true,
  appId: "",
  interstitialId: "",
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

function adMob() {
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
  if (AD_CONFIG.testing || !AD_CONFIG.interstitialId) return TEST_INTERSTITIAL;
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
