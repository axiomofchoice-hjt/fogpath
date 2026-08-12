import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderGame } from "../../test/harness";
import { initBattle, initBattleFromEnemies } from "../../state/battleEngine";
import { initialGameState, initialPlayer } from "../../state/init";
import type { GameState } from "../../types";

function withBattle(battle: ReturnType<typeof initBattle>): GameState {
  return { ...initialGameState(), screen: "game", battle };
}

describe("战斗视图", () => {
  it("装备提供动作：剑→普通攻击、盾→防御、休息无条件", () => {
    renderGame(withBattle(initBattle("test_atk_vs_atk", initialPlayer())));
    expect(screen.getByRole("button", { name: /普通攻击/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /防御/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /休息/ })).toBeInTheDocument();
  });

  it("装备覆盖：学徒木杖提供三个魔法动作并标注来源", () => {
    renderGame(withBattle(initBattle("test_magic_trio", initialPlayer())));
    expect(screen.getByRole("button", { name: /火球术/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /闪电术/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /岩石飞弹/ })).toBeInTheDocument();
    expect(screen.getAllByText("【学徒木杖】").length).toBeGreaterThan(0);
  });

  it("MP 不足：攻击/防御禁用、休息可用", () => {
    const player = { ...initialPlayer(), mp: 5 };
    renderGame(withBattle(initBattle("test_atk_vs_atk", player)));
    expect(screen.getByRole("button", { name: /普通攻击/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /防御/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /休息/ })).toBeEnabled();
  });

  it("出招后回合推进，属性槽随动作变化", async () => {
    const user = userEvent.setup();
    renderGame(withBattle(initBattle("test_atk_vs_atk", initialPlayer())));
    await user.click(screen.getByRole("button", { name: /普通攻击/ }));
    expect(screen.getByText("回合 1")).toBeInTheDocument();
    // 普通攻击消耗 10 MP：限定玩家卡片内断言（侧栏 CharacterPanel 也显示 90/100）
    const playerCard = screen
      .getAllByTestId("combatant-card")
      .find((el) => within(el).getByText("冒险者"))!;
    expect(within(playerCard).getAllByText("90/100")).toHaveLength(1);
  });

  it("Boss 卡片带 Boss 徽标", () => {
    renderGame(withBattle(initBattleFromEnemies(["goblin_king"], initialPlayer())));
    expect(screen.getByTitle("Boss")).toBeInTheDocument();
  });

  it("敌人卡显示动作集：哥布林【普通攻击】【蓄力→重击】", () => {
    renderGame(withBattle(initBattleFromEnemies(["goblin_camp_watch"], initialPlayer())));
    expect(screen.getByText(/【普通攻击】/)).toBeInTheDocument();
    expect(screen.getByText(/【蓄力→重击】/)).toBeInTheDocument();
  });

  it("营地战斗中：向导战斗提示显示在敌人卡上方", () => {
    const battle = initBattleFromEnemies(["goblin_camp_watch"], initialPlayer());
    const state: GameState = {
      ...withBattle(battle),
      dungeon: {
        dungeonId: "goblin_camp",
        size: { w: 5, h: 3 },
        rooms: [
          [null, null, { type: "normal", explored: false, depth: 3, enemyIds: [], itemIds: [], roomKey: "r5" }, { type: "normal", explored: false, depth: 4, enemyIds: [], itemIds: [], roomKey: "r6" }, { type: "normal", explored: false, depth: 5, enemyIds: [], itemIds: [], roomKey: "r7" }],
          [null, null, { type: "normal", explored: true, depth: 2, enemyIds: [], itemIds: [], roomKey: "r4" }, null, { type: "boss", explored: true, depth: 7, enemyIds: ["goblin_king"], itemIds: [], roomKey: "r8" }],
          [{ type: "entrance", explored: true, depth: 0, enemyIds: [], itemIds: [], roomKey: "r1" }, { type: "normal", explored: true, depth: 1, enemyIds: ["goblin_camp_watch"], itemIds: [], roomKey: "r2" }, { type: "normal", explored: false, depth: 1, enemyIds: [], itemIds: [], roomKey: "r3" }, null, null],
        ],
        playerPos: { x: 1, y: 2 },
      },
    };
    renderGame(state);
    expect(screen.getByText(/攻击消耗 MP，休息回蓝/)).toBeInTheDocument();
  });

  it("测试战斗结算按钮：返回开始面板", () => {
    const battle = initBattle("test_atk_vs_atk", initialPlayer());
    renderGame(withBattle({ ...battle, result: "victory" }));
    expect(screen.getByRole("button", { name: "返回开始面板" })).toBeInTheDocument();
  });

  it("地牢战斗结算按钮：返回地牢", () => {
    const battle = initBattleFromEnemies(["goblin"], initialPlayer());
    renderGame(withBattle({ ...battle, result: "victory" }));
    expect(screen.getByRole("button", { name: "返回地牢" })).toBeInTheDocument();
  });
});
