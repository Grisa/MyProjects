/** Persistent spark tree. Buying a node unlocks the ones that require it. */

export const UPGRADES = [
  {
    id: "centelha",
    name: "Centelha",
    text: "Faíscas devolvem mais luz.",
    cost: 6,
    col: 1,
    row: 2,
    requires: [],
    icon: "spark",
  },
  {
    id: "passo",
    name: "Passo 1",
    text: "A bolinha responde um pouco melhor.",
    cost: 12,
    col: 0,
    row: 2,
    requires: ["centelha"],
    icon: "step",
  },
  {
    id: "reflexo",
    name: "Passo 2",
    text: "O movimento fica mais firme.",
    cost: 24,
    col: 0,
    row: 1,
    requires: ["passo"],
    icon: "reflex",
  },
  {
    id: "passo3",
    name: "Passo 3",
    text: "A bolinha cola no dedo.",
    cost: 42,
    col: 0,
    row: 0,
    requires: ["reflexo"],
    icon: "reflex",
  },
  {
    id: "miolo",
    name: "Miolo",
    text: "O núcleo encolhe e a bolinha sobe.",
    cost: 58,
    col: 0,
    row: -1,
    requires: ["passo3"],
    icon: "core",
  },
  {
    id: "halo",
    name: "Luz 1",
    text: "A luz inicial cresce um pouco.",
    cost: 12,
    col: 1,
    row: 1,
    requires: ["centelha"],
    icon: "halo",
  },
  {
    id: "aurora",
    name: "Luz 2",
    text: "A luz inicial cresce mais.",
    cost: 24,
    col: 1,
    row: 0,
    requires: ["halo"],
    icon: "sun",
  },
  {
    id: "farol",
    name: "Luz 3",
    text: "A luz alcança bem mais longe.",
    cost: 42,
    col: 2,
    row: 0,
    requires: ["aurora"],
    icon: "beacon",
  },
  {
    id: "vela",
    name: "Vela",
    text: "A borda das sombras aparece antes.",
    cost: 30,
    col: 3,
    row: 0,
    requires: ["farol"],
    icon: "eye",
  },
  {
    id: "casco",
    name: "Casco 1",
    text: "Cada batida apaga um pouco menos.",
    cost: 12,
    col: 2,
    row: 2,
    requires: ["centelha"],
    icon: "shield",
  },
  {
    id: "muralha",
    name: "Casco 2",
    text: "O dano fica menor.",
    cost: 24,
    col: 3,
    row: 2,
    requires: ["casco"],
    icon: "wall",
  },
  {
    id: "respiro",
    name: "Respiro",
    text: "Um golpe fatal deixa um fio de luz.",
    cost: 50,
    col: 3,
    row: 1,
    requires: ["muralha"],
    icon: "heart",
  },
  {
    id: "pausa",
    name: "Pausa",
    text: "A queda e o nascimento ficam mais lentos.",
    cost: 20,
    col: 3,
    row: 3,
    requires: ["muralha"],
    icon: "slow",
  },
  {
    id: "folga",
    name: "Folga",
    text: "Os inimigos demoram mais a nascer.",
    cost: 26,
    col: 4,
    row: 2,
    requires: ["muralha"],
    icon: "gap",
  },
  {
    id: "folego",
    name: "Fôlego",
    text: "Sem levar dano, a luz volta aos poucos.",
    cost: 24,
    col: 2,
    row: 1,
    requires: ["casco"],
    icon: "breath",
  },
  {
    id: "ima",
    name: "Ímã 1",
    text: "Ímã de faísca fraco.",
    cost: 12,
    col: 1,
    row: 3,
    requires: ["centelha"],
    icon: "magnet",
  },
  {
    id: "abundancia",
    name: "Abundância",
    text: "Caem mais faíscas.",
    cost: 22,
    col: 0,
    row: 3,
    requires: ["ima"],
    icon: "coins",
  },
  {
    id: "vortice",
    name: "Ímã 2",
    text: "Ímã de faísca médio.",
    cost: 24,
    col: 1,
    row: 4,
    requires: ["ima"],
    icon: "vortex",
  },
  {
    id: "brasa",
    name: "Brasa",
    text: "Cada faísca vale 2.",
    cost: 32,
    col: 2,
    row: 3,
    requires: ["ima"],
    icon: "double",
  },
  {
    id: "prisma",
    name: "Prisma",
    text: "Cada faísca também vale 1 ponto.",
    cost: 40,
    col: 2,
    row: 4,
    requires: ["brasa"],
    icon: "prism",
  },
  {
    id: "casco3",
    name: "Casco 3",
    text: "As batidas apagam bem menos luz.",
    cost: 42,
    col: 4,
    row: 1,
    requires: ["muralha"],
    icon: "wall",
  },
  {
    id: "ima3",
    name: "Ímã 3",
    text: "Ímã de faísca forte.",
    cost: 42,
    col: 1,
    row: 5,
    requires: ["vortice"],
    icon: "magnet",
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
    sparkInterval: has("abundancia") ? 3.2 : 5,
    sparkValue: has("brasa") ? 2 : 1,
    sparkScore: has("prisma") ? 1 : 0,
    regen: has("folego") ? 0.045 : 0,
    calmDelay: 5,
    core: has("miolo") ? 0.78 : 1,
    playerY: has("miolo") ? 0.785 : 0.82,
    rim: has("vela") ? 0.92 : 0.58,
    guard: has("respiro"),
    speed: has("pausa") ? 0.88 : 1,
    interval: has("folga") ? 1.18 : 1,
  };
}
