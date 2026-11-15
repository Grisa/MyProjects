/** Persistent spark tree. Buying a node unlocks the ones that require it. */

export const UPGRADES = [
  {
    id: "centelha",
    name: "Centelha",
    text: "Faíscas devolvem mais luz.",
    cost: 1,
    col: 1,
    row: 2,
    requires: [],
    icon: "spark",
  },
  {
    id: "passo",
    name: "Passo",
    text: "A bolinha segue o dedo mais rápido.",
    cost: 2,
    col: 0,
    row: 2,
    requires: ["centelha"],
    icon: "step",
  },
  {
    id: "reflexo",
    name: "Reflexo",
    text: "O movimento fica imediato.",
    cost: 3,
    col: 0,
    row: 1,
    requires: ["passo"],
    icon: "reflex",
  },
  {
    id: "miolo",
    name: "Miolo",
    text: "O núcleo encolhe e a bolinha sobe.",
    cost: 4,
    col: 0,
    row: 0,
    requires: ["reflexo"],
    icon: "core",
  },
  {
    id: "halo",
    name: "Halo",
    text: "Você começa com mais luz.",
    cost: 2,
    col: 1,
    row: 1,
    requires: ["centelha"],
    icon: "halo",
  },
  {
    id: "aurora",
    name: "Aurora",
    text: "A luz inicial cresce de novo.",
    cost: 4,
    col: 1,
    row: 0,
    requires: ["halo"],
    icon: "sun",
  },
  {
    id: "farol",
    name: "Farol",
    text: "A luz alcança mais longe.",
    cost: 5,
    col: 2,
    row: 0,
    requires: ["aurora"],
    icon: "beacon",
  },
  {
    id: "vela",
    name: "Vela",
    text: "A borda das sombras aparece antes.",
    cost: 3,
    col: 3,
    row: 0,
    requires: ["farol"],
    icon: "eye",
  },
  {
    id: "casco",
    name: "Casco",
    text: "Cada batida apaga menos luz.",
    cost: 2,
    col: 2,
    row: 2,
    requires: ["centelha"],
    icon: "shield",
  },
  {
    id: "muralha",
    name: "Muralha",
    text: "O dano fica ainda menor.",
    cost: 4,
    col: 3,
    row: 2,
    requires: ["casco"],
    icon: "wall",
  },
  {
    id: "respiro",
    name: "Respiro",
    text: "Um golpe fatal deixa um fio de luz.",
    cost: 6,
    col: 3,
    row: 1,
    requires: ["muralha"],
    icon: "heart",
  },
  {
    id: "pausa",
    name: "Pausa",
    text: "Os inimigos caem mais devagar.",
    cost: 3,
    col: 3,
    row: 3,
    requires: ["muralha"],
    icon: "slow",
  },
  {
    id: "folga",
    name: "Folga",
    text: "Os inimigos demoram mais a nascer.",
    cost: 4,
    col: 4,
    row: 2,
    requires: ["muralha"],
    icon: "gap",
  },
  {
    id: "folego",
    name: "Fôlego",
    text: "Sem levar dano, a luz volta aos poucos.",
    cost: 4,
    col: 2,
    row: 1,
    requires: ["casco"],
    icon: "breath",
  },
  {
    id: "ima",
    name: "Ímã",
    text: "Faíscas próximas vêm até você.",
    cost: 2,
    col: 1,
    row: 3,
    requires: ["centelha"],
    icon: "magnet",
  },
  {
    id: "abundancia",
    name: "Abundância",
    text: "Caem mais faíscas.",
    cost: 3,
    col: 0,
    row: 3,
    requires: ["ima"],
    icon: "coins",
  },
  {
    id: "vortice",
    name: "Vórtice",
    text: "O ímã puxa de mais longe.",
    cost: 4,
    col: 1,
    row: 4,
    requires: ["ima"],
    icon: "vortex",
  },
  {
    id: "brasa",
    name: "Brasa",
    text: "Cada faísca vale 2.",
    cost: 5,
    col: 2,
    row: 3,
    requires: ["ima"],
    icon: "double",
  },
  {
    id: "prisma",
    name: "Prisma",
    text: "Cada faísca também vale 1 ponto.",
    cost: 4,
    col: 2,
    row: 4,
    requires: ["brasa"],
    icon: "prism",
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

export function bonuses(owned) {
  const has = (id) => owned.has(id);
  let light = 1;
  if (has("halo")) light += 0.18;
  if (has("aurora")) light += 0.18;
  if (has("farol")) light += 0.16;

  let damage = 0.38;
  if (has("casco")) damage = 0.3;
  if (has("muralha")) damage = 0.26;

  let follow = 14;
  if (has("passo")) follow = 22;
  if (has("reflexo")) follow = 32;

  return {
    light,
    damage,
    follow,
    heal: has("centelha") ? 0.34 : 0.2,
    magnet: has("vortice") ? 0.46 : has("ima") ? 0.24 : 0,
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
