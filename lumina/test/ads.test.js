import assert from "node:assert/strict";
import test from "node:test";
import { shouldShowAd } from "../js/ads.js";

test("an ad is due on every second death", () => {
  assert.equal(shouldShowAd(0), false);
  assert.equal(shouldShowAd(1), false);
  assert.equal(shouldShowAd(2), true);
  assert.equal(shouldShowAd(3), false);
  assert.equal(shouldShowAd(4), true);
});
