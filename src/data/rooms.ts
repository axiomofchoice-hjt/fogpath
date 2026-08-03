import type { RoomDef } from "../types";

export const rooms: Record<string, RoomDef> = {
  village_square: {
    id: "village_square",
    name: { zh: "村庄广场", en: "Village Square" },
    description: {
      zh: "村庄中心的宁静石板广场。中央的老井仍然滴着清澈的井水，旅馆旁立着一块破旧的公告板，纸片在微风中轻轻飘动。",
      en: "A peaceful cobblestone plaza lies at the heart of the village. The old well in the center still drips with fresh water. A worn notice board stands near the inn, its parchments fluttering in a gentle breeze.",
    },
    area: { zh: "村庄周边", en: "Village Outskirts" },
    isSafeRoom: true,
    itemIds: ["rusty_sword"],
    npc: {
      name: { zh: "老汤姆", en: "Elder Tom" },
      icon: "\uD83D\uDC74",
      dialogue: [
        {
          zh: "欢迎，旅行者！在这里休息，恢复你的力量。",
          en: "Welcome, traveler! Rest here and regain your strength.",
        },
        {
          zh: "小心森林——边缘附近有哥布林出没。",
          en: "Be careful in the forest — goblins have been spotted near the edge.",
        },
      ],
    },
  },
};
