import assert from "node:assert/strict";
import test from "node:test";
import { UPGRADES, bonuses, canBuy, nodeState, upgradeById } from "../js/upgrades.js";

test("only the root can be bought at the start", () => {
  const owned = new Set();
  assert.equal(nodeState(upgradeById("centelha"), owned), "available");
  assert.equal(nodeState(upgradeById("halo"), owned), "locked");
  assert.equal(canBuy(upgradeById("centelha"), owned, 1), true);
  assert.equal(canBuy(upgradeById("centelha"), owned, 0), false);
});

test("buying a node unlocks the ones that require it", () => {
  const owned = new Set(["centelha"]);
  assert.equal(nodeState(upgradeById("centelha"), owned), "owned");
  assert.equal(nodeState(upgradeById("halo"), owned), "available");
  assert.equal(nodeState(upgradeById("casco"), owned), "available");
  assert.equal(nodeState(upgradeById("ima"), owned), "available");
  assert.equal(nodeState(upgradeById("aurora"), owned), "locked");
  assert.equal(nodeState(upgradeById("muralha"), owned), "locked");
  assert.equal(nodeState(upgradeById("brasa"), owned), "locked");
});

test("every upgrade can be reached by buying in order", () => {
  const owned = new Set();
  let guard = 0;
  while (owned.size < UPGRADES.length) {
    const next = UPGRADES.find(
      (upgrade) => !owned.has(upgrade.id) && upgrade.requires.every((id) => owned.has(id)),
    );
    assert.ok(next, "a node stayed locked after its parents were bought");
    owned.add(next.id);
    guard += 1;
    assert.ok(guard <= UPGRADES.length);
  }
});

test("bonuses stack along a branch", () => {
  const base = bonuses(new Set());
  assert.equal(base.light, 1);
  assert.equal(base.damage, 0.38);
  assert.equal(base.sparkValue, 1);
  assert.equal(base.heal, 0.2);

  const grown = bonuses(new Set(["centelha", "halo", "aurora", "casco", "muralha", "ima", "brasa"]));
  assert.ok(Math.abs(grown.light - 1.36) < 1e-9);
  assert.equal(grown.damage, 0.26);
  assert.equal(grown.heal, 0.34);
  assert.equal(grown.sparkValue, 2);
  assert.equal(grown.magnet, 0.24);
});
