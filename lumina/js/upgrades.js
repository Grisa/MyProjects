/** Persistent spark tree. Buying a node unlocks the ones that require it. */

export const UPGRADES = [
  {
    id: "centelha",
    name: "Ember",
    text: "Sparks give back more light.",
    cost: 20,
    col: 1,
    row: 2,
    requires: [],
    icon: "spark",
  },
  {
    id: "passo",
    name: "Step 1",
    text: "The light follows a bit closer.",
    cost: 40,
    col: 0,
    row: 2,
    requires: ["centelha"],
    icon: "step",
  },
  {
    id: "reflexo",
    name: "Step 2",
    text: "The light tracks your finger.",
    cost: 80,
    col: 0,
    row: 1,
    requires: ["passo"],
    icon: "reflex",
  },
  {
    id: "passo3",
    name: "Step 3",
    text: "The light stays on your finger.",
    cost: 160,
    col: 0,
    row: 0,
    requires: ["reflexo"],
    icon: "reflex",
  },
  {
    id: "miolo",
    name: "Core",
    text: "A smaller core. You ride higher.",
    cost: 240,
    col: 0,
    row: -1,
    requires: ["passo3"],
    icon: "core",
  },
  {
    id: "halo",
    name: "Light 1",
    text: "Your light starts a little wider.",
    cost: 40,
    col: 1,
    row: 1,
    requires: ["centelha"],
    icon: "halo",
  },
  {
    id: "aurora",
    name: "Light 2",
    text: "Your light starts wider still.",
    cost: 80,
    col: 1,
    row: 0,
    requires: ["halo"],
    icon: "sun",
  },
  {
    id: "farol",
    name: "Light 3",
    text: "Your light reaches much farther.",
    cost: 160,
    col: 2,
    row: 0,
    requires: ["aurora"],
    icon: "beacon",
  },
  {
    id: "vela",
    name: "Candle",
    text: "Shadow edges appear sooner.",
    cost: 120,
    col: 3,
    row: 0,
    requires: ["farol"],
    icon: "eye",
  },
  {
    id: "vesper",
    name: "Vesper",
    text: "Each act returns a slice of light.",
    cost: 240,
    col: 2,
    row: -1,
    requires: ["farol"],
    icon: "vesper",
  },
  {
    id: "casco",
    name: "Shell 1",
    text: "Each hit takes a little less.",
    cost: 40,
    col: 2,
    row: 2,
    requires: ["centelha"],
    icon: "shield",
  },
  {
    id: "muralha",
    name: "Shell 2",
    text: "Hits take less light.",
    cost: 80,
    col: 3,
    row: 2,
    requires: ["casco"],
    icon: "wall",
  },
  {
    id: "respiro",
    name: "Thread",
    text: "A fatal hit leaves a thread of light.",
    cost: 180,
    col: 3,
    row: 1,
    requires: ["muralha"],
    icon: "heart",
  },
  {
    id: "folga",
    name: "Lull",
    text: "Shadows take longer to appear.",
    cost: 100,
    col: 4,
    row: 2,
    requires: ["muralha"],
    icon: "gap",
  },
  {
    id: "folego",
    name: "Renew",
    text: "Light returns if you stay clear.",
    cost: 100,
    col: 2,
    row: 1,
    requires: ["casco"],
    icon: "breath",
  },
  {
    id: "ima",
    name: "Magnet 1",
    text: "A faint pull on sparks.",
    cost: 40,
    col: 1,
    row: 3,
    requires: ["centelha"],
    icon: "magnet",
  },
  {
    id: "abundancia",
    name: "Plenty",
    text: "Sparks fall more often.",
    cost: 140,
    col: 0,
    row: 3,
    requires: ["ima"],
    icon: "coins",
  },
  {
    id: "vortice",
    name: "Magnet 2",
    text: "A stronger pull on sparks.",
    cost: 80,
    col: 1,
    row: 4,
    requires: ["ima"],
    icon: "vortex",
  },
  {
    id: "brasa",
    name: "Cinder",
    text: "Each spark is worth 2.",
    cost: 180,
    col: 2,
    row: 3,
    requires: ["ima"],
    icon: "double",
  },
  {
    id: "prisma",
    name: "Prism",
    text: "Sparks are also worth a point.",
    cost: 240,
    col: 2,
    row: 4,
    requires: ["brasa"],
    icon: "prism",
  },
  {
    id: "casco3",
    name: "Shell 3",
    text: "Hits take much less light.",
    cost: 160,
    col: 4,
    row: 1,
    requires: ["muralha"],
    icon: "wall",
  },
  {
    id: "ima3",
    name: "Magnet 3",
    text: "A strong pull on sparks.",
    cost: 160,
    col: 1,
    row: 5,
    requires: ["vortice"],
    icon: "magnet",
  },
  {
    id: "escudo",
    name: "Shield 1",
    text: "Every 5 sparks grants a shield.",
    cost: 80,
    col: 4,
    row: 3,
    requires: ["centelha"],
    icon: "shield",
  },
  {
    id: "escudo2",
    name: "Shield 2",
    text: "A shield every 4 sparks.",
    cost: 180,
    col: 4,
    row: 4,
    requires: ["escudo"],
    icon: "shield",
  },
  {
    id: "escudo3",
    name: "Shield 3",
    text: "A shield every 3 sparks.",
    cost: 320,
    col: 4,
    row: 5,
    requires: ["escudo2"],
    icon: "wall",
  },
  {
    id: "clarao",
    name: "Flare",
    text: "A rare blue spark may fall.",
    cost: 160,
    col: 3,
    row: 4,
    requires: ["ima"],
    icon: "nova",
  },
  {
    id: "marca",
    name: "Mark",
    text: "A close pass stains the lane.",
    cost: 420,
    col: 3,
    row: 5,
    requires: ["clarao"],
    icon: "mark",
  },
];

export function upgradeById(id) {
  return UPGRADES.find((upgrade) => upgrade.id === id) ?? null;
}

/** owned, available to buy, or still locked behind another node. */
export function nodeState(upgrade, owned) {
  if (owned.has(upgrade.id)) return "owned";
  if (upgrade.requires.every((id) => owned.has(id))) return "available";
  return "locked";
}

export function canBuy(upgrade, owned, sparks) {
  return nodeState(upgrade, owned) === "available" && sparks >= upgrade.cost;
}

/** bright when bought, soft when it can be bought now, dim otherwise. */
export function nodeGlow(upgrade, owned, sparks) {
  const status = nodeState(upgrade, owned);
  if (status === "owned") return "bright";
  if (status === "available" && sparks >= upgrade.cost) return "soft";
  return "dim";
}

export function bonuses(owned) {
  const has = (id) => owned.has(id);
  let light = 1;
  if (has("halo")) light += 0.12;
  if (has("aurora")) light += 0.14;
  if (has("farol")) light += 0.18;

  let damage = 0.38;
  if (has("casco")) damage = 0.33;
  if (has("muralha")) damage = 0.28;
  if (has("casco3")) damage = 0.22;

  let follow = 5;
  if (has("passo")) follow = 11;
  if (has("reflexo")) follow = 18;
  if (has("passo3")) follow = 32;

  let magnet = 0;
  if (has("ima")) magnet = 0.14;
  if (has("vortice")) magnet = 0.3;
  if (has("ima3")) magnet = 0.5;

  return {
    light,
    damage,
    follow,
    heal: has("centelha") ? 0.34 : 0.2,
    magnet,
    plenty: has("abundancia"),
    sparkValue: has("brasa") ? 2 : 1,
    sparkScore: has("prisma") ? 1 : 0,
    regen: has("folego") ? 0.045 : 0,
    calmDelay: 5,
    core: has("miolo") ? 0.78 : 1,
    playerY: has("miolo") ? 0.785 : 0.82,
    rim: has("vela") ? 0.92 : 0.58,
    guard: has("respiro"),
    interval: has("folga") ? 1.18 : 1,
    shieldEvery: has("escudo3") ? 3 : has("escudo2") ? 4 : has("escudo") ? 5 : 0,
    nova: has("clarao"),
    vesper: has("vesper"),
    mark: has("marca"),
  };
}
