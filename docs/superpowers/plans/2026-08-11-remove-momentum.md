# 移除动量机制 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 移除战斗的「动量(momentum)」独立属性,由「伤害」承担输出与对撞压制双重职责;攻 vs 攻按伤害比较赢家通吃。

**Architecture:** 类型/配置/校验同步删除 momentum 字段;`resolveTurn` 对撞比较值从 `momentum` 换为 `damage`(整体判定:玩家 > 所有攻击怪最高伤害;逐怪:怪伤害 > 玩家伤害才命中,相等双方格挡);UI 删动量槽;`battleReducer` 不动。

**Tech Stack:** React 19 + TypeScript + Vitest + Playwright。

## Global Constraints

- 依据 spec:`docs/superpowers/specs/2026-08-11-remove-momentum-design.md`
- 攻 vs 攻:伤害高者命中(自己全额伤害)、低者被格挡;**相等 → 双方均被格挡**
- 多怪:玩家攻击命中目标需 `玩家伤害 > 所有攻击怪的最高伤害`;每只攻击怪单独判定(怪伤害 > 玩家伤害 → 命中,≤ → 该怪被格挡);单怪退化合并
- 蓄力保留:蓄力回合无攻击属性(玩家攻击全额命中、无对撞);蓄力技伤害显著提升
- 攻 vs 防御:减伤 50% 不变;攻 vs 休息/道具:全额命中不变
- 属性槽 UI:删动量槽;伤害槽保留(未出手/防御/休息=0;被压制结算后显示 0);变灰条件 `!hasAttack`
- 不做数值重平衡:damage 数值一律不变
- 每步验证用 `npx vitest run <file>`;收尾 `npm run lint && npm test && npm run build && npm run test:e2e`

---

### Task 1: 核心机制重构(类型/数据/引擎/校验)

**Files:**
- Modify: `src/types.ts`、`src/config/enemies.json`、`src/config/items.json`、`src/state/battleEngine.ts`、`src/state/battleEngine.test.ts`、`src/data/validate.ts`、`src/data/validate.test.ts`、`src/data/dataConsistency.test.ts`

**Interfaces:**
- Consumes: 现状(无依赖改动)
- Produces: `CombatStats` 只剩 `damage/maxDamage/hasAttack`;`actionStats` 返回 `{ damage: number }`;`resolveTurn` 语义不变(签名不动),内部比较值换伤害

- [ ] **Step 1: 删除类型字段**

`src/types.ts`:
- L22 删 `ItemAction.momentum`(L18 注释改「自带伤害」)
- L180-183 删 `CombatStats.momentum`/`maxMomentum`(L179 注释「伤害资源:对撞后减少,归零时伤害变灰」删除,伤害槽保留)
- L232 `PatternStep` attack 变体删 `momentum`(仅剩 `kind/name/damage`)
- L256 删 `EnemyDef.momentum`
- L273-274 删 `BattleEnemy.momentum`/`maxMomentum`

- [ ] **Step 2: 删除配置字段**

`src/config/enemies.json`:删 4 个敌人顶层 `momentum`(L9/L51/L81/L124)+ 全部攻击步 `momentum`(L24/L38/L61/L64/L66/L67/L69/L91/L97/L111/L136/L142/L156,共 13 处)。

`src/config/items.json`:删 `rusty_sword`(L17)、`apprentice_staff`(L30-32)、`iron_sword`(L42)动作的 `momentum`。

- [ ] **Step 3: 删除校验规则与夹具**

`src/data/validate.ts`:
- L130 物品动作白名单 `["skillId","damage","momentum"]` → `["skillId","damage"]`
- L134 删 `momentum` 须 `> 0` 规则
- L149 敌人白名单删 `"momentum"`
- L171 攻击步白名单 `["kind","name","damage","momentum"]` → `["kind","name","damage"]`
- L183 删攻击步 `momentum` 须 `> 0` 规则
- L219 删敌人顶层 `momentum` `gte 0` 规则

`src/data/validate.test.ts`:删除全部 16 处夹具 `momentum: 1`(L8/L12/L33/L50/L57/L65/L89/L101/L109/L120/L131/L132/L134/L141/L142/L280)。

`src/data/dataConsistency.test.ts`:删 L51 `expect(step.momentum).toBeGreaterThan(0)`(只保留 L50 `step.damage` 断言)。

- [ ] **Step 4: 重写引擎测试(新规则断言)**

`src/state/battleEngine.test.ts` 修改清单:

删除的动量断言:`initBattle` 用例 L49 `momentum: 0`(toMatchObject 里删)、L80 `maxMomentum: 4`;蓄力回合 L116 `momentum: 5`、L118 `momentum: 0`;蓄力技 L145-147/L159/L174-175/L186-187/L200-201 的 momentum 字段;休息 L247;多怪 L302;L42 playerActions 期望改 `[{ skillId: "basic_attack", damage: 10 }]`。

重写/新增用例(完整代码,插到「resolveTurn:对撞」describe 内替换原 3 个用例):

```ts
describe("resolveTurn：对撞（伤害比较）", () => {
  it("伤害高者生效：玩家全额命中（蓄力怪无攻击，无对撞）", () => {
    const battle = setPattern(initBattle("test_atk_vs_atk", testPlayer()), 0, "combo");
    const next = resolveTurn(battle, {
      kind: "attack",
      skillId: "basic_attack",
      targetIndex: 0,
    }); // 10 vs 蓄力(无攻击) → 必中
    expect(next.enemies[0].hp).toBe(20);
    expect(next.playerStats.hp).toBe(100);
    expect(next.playerStats.damage).toBe(10);
    expect(next.enemies[0]).toMatchObject({ damage: 0, hasAttack: false });
  });

  it("伤害被压制：攻击被全数格挡，敌方反击命中（10 vs 蓄力技 14）", () => {
    const battle = setPattern(initBattle("test_atk_vs_atk", testPlayer()), 0, "combo", 1);
    const next = resolveTurn(battle, {
      kind: "attack",
      skillId: "basic_attack",
      targetIndex: 0,
    });
    expect(next.enemies[0].hp).toBe(30); // 玩家攻击被格挡
    expect(next.playerStats.hp).toBe(100 - 14); // 怪命中
    expect(next.playerStats).toMatchObject({ damage: 0 });
    expect(next.enemies[0]).toMatchObject({ damage: 14 });
  });

  it("重击（20）：压制玩家攻击，全额命中", () => {
    const battle = setPattern(initBattle("test_atk_vs_atk", testPlayer()), 0, "heavy", 2);
    const next = resolveTurn(battle, {
      kind: "attack",
      skillId: "basic_attack",
      targetIndex: 0,
    });
    expect(next.enemies[0].hp).toBe(30);
    expect(next.playerStats.hp).toBe(100 - 20);
    expect(next.enemies[0]).toMatchObject({ damage: 20 });
    expect(next.enemies[0].summary.zh).toContain("重击");
  });

  it("伤害压制（壮汉 12）：玩家 10 被格挡，反击 12", () => {
    const battle = setPattern(initBattle("test_clash_loss", testPlayer()), 0, "press");
    const next = resolveTurn(battle, {
      kind: "attack",
      skillId: "basic_attack",
      targetIndex: 0,
    });
    expect(next.enemies[0].hp).toBe(45);
    expect(next.playerStats.hp).toBe(88);
    expect(next.playerStats).toMatchObject({ damage: 0 });
    expect(next.enemies[0]).toMatchObject({ damage: 12 });
  });

  it("伤害相等：双方攻击均被格挡（铁剑 12 vs 壮汉 12）", () => {
    const player = testPlayer({
      equipment: ["iron_sword", "rusty_shield", null, null, null, null],
    });
    const battle = setPattern(initBattle("test_clash_loss", player), 0, "press");
    const next = resolveTurn(battle, {
      kind: "attack",
      skillId: "basic_attack",
      targetIndex: 0,
    });
    expect(next.enemies[0].hp).toBe(45);
    expect(next.playerStats.hp).toBe(100);
    expect(next.playerStats).toMatchObject({ damage: 0 });
    expect(next.enemies[0]).toMatchObject({ damage: 0 });
    expect(next.log.some((l) => l.zh.includes("格挡"))).toBe(true);
  });
});
```

「resolveTurn:多怪」describe 内替换:

```ts
describe("resolveTurn：多怪", () => {
  it("整体判定：玩家伤害须大于所有攻击怪的最高伤害，被压制则全数格挡", () => {
    const battle = initBattle("test_goblins_x3", testPlayer());
    const forced = battle.enemies.map((e) => ({
      ...e,
      pattern: { patternId: "combo", stepIndex: 1 },
      lastPatternId: null,
    })); // 三只攻击 14
    const next = resolveTurn({ ...battle, enemies: forced }, {
      kind: "attack",
      skillId: "basic_attack",
      targetIndex: 1,
    }); // 10 vs max 14 → 被压制
    expect(next.enemies[1].hp).toBe(30);
    expect(next.playerStats.hp).toBe(100 - 14 * 3);
    expect(next.playerStats).toMatchObject({ damage: 0 });
  });

  it("逐怪单独判定：伤害 ≤ 玩家伤害的怪被格挡（含平局），高于玩家才命中", () => {
    const player = testPlayer({
      equipment: ["iron_sword", "rusty_shield", null, null, null, null],
    });
    const battle = initBattle("test_goblins_x3", player);
    const forced = [
      { ...battle.enemies[0], defId: "goblin", pattern: { patternId: "combo", stepIndex: 1 }, lastPatternId: null },        // 攻击 14
      { ...battle.enemies[1], defId: "goblin_brute", pattern: { patternId: "press", stepIndex: 0 }, lastPatternId: null },  // 攻击 12
      { ...battle.enemies[2], defId: "goblin", pattern: { patternId: "combo", stepIndex: 0 }, lastPatternId: null },        // 蓄力
    ];
    const next = resolveTurn({ ...battle, enemies: forced }, {
      kind: "attack",
      skillId: "basic_attack",
      targetIndex: 0,
    }); // 12 vs max 14 → 玩家被格挡；14>12 命中、12==12 平局被格挡
    expect(next.playerStats.hp).toBe(100 - 14);
    expect(next.enemies[0].hp).toBe(30); // 玩家攻击被格挡，未命中
    expect(next.enemies[1].damage).toBe(0); // 平局怪伤害显示 0
  });

  it("只算攻击步的怪参与判定与反击，蓄力怪不攻击", () => {
    const battle = initBattle("test_goblins_x3", testPlayer());
    const forced = battle.enemies.map((e, i) => ({
      ...e,
      pattern:
        i === 0
          ? { patternId: "combo", stepIndex: 0 } // 蓄力
          : { patternId: "heavy", stepIndex: 2 }, // 重击 20
      lastPatternId: null,
    }));
    const next = resolveTurn({ ...battle, enemies: forced }, {
      kind: "attack",
      skillId: "basic_attack",
      targetIndex: 0,
    }); // 10 vs max 20 → 被压制
    expect(next.playerStats.hp).toBe(100 - 20 * 2);
  });

  it("全部蓄力：玩家必中目标，无怪反击", () => {
    const battle = initBattle("test_goblins_x3", testPlayer());
    const charging = battle.enemies.map((e) => ({
      ...e,
      pattern: { patternId: "combo", stepIndex: 0 },
      lastPatternId: null,
    }));
    const next = resolveTurn({ ...battle, enemies: charging }, {
      kind: "attack",
      skillId: "basic_attack",
      targetIndex: 1,
    });
    expect(next.enemies[1].hp).toBe(20);
    expect(next.playerStats.hp).toBe(100);
  });
});
```

其余 describe(蓄力回合/蓄力技/防御休息/道具/模式推进/胜负边界/固定循环)只删 momentum 断言、保留行为断言,数值不变。

- [ ] **Step 5: 运行确认失败**

Run: `npx vitest run src/state/battleEngine.test.ts`
Expected: FAIL(新断言与旧引擎不符;类型删除后其余编译问题由 vitest/esbuild 不类型检查豁免,但引擎逻辑断言必挂)

- [ ] **Step 6: 重写引擎**

`src/state/battleEngine.ts`:
- `actionStats`(L34-41)返回类型改 `{ damage: number }`,fallback `{ damage: 0 }`
- `applyEnemyStep`(L66-99):charge 分支删 `momentum/maxMomentum` 行(L81-82);攻击步删 L91-92;蓄力注释同步
- `initEnemies`(L145-170):删 L160-161
- `buildBattle`(L172-217):playerStats 删 L197-198
- `resolveTurn` 攻击分支(L298-352)重写:

```ts
  let clashWon = false;
  let maxEnemyDamage = 0;

  if (action.kind === "attack") {
    // 出手即破盾：减伤效果到下一次攻击前为止
    next.shieldActive = false;
    const skillDef = skillDefs[action.skillId];
    next.playerSummary = msg(
      `你使用了${skillDef?.name.zh ?? "普通攻击"}。`,
      `You use ${skillDef?.name.en ?? "Basic Attack"}.`
    );
    next.playerStats.mp = Math.max(0, next.playerStats.mp - (skillDefs[action.skillId]?.mpCost ?? 0));
    maxEnemyDamage = Math.max(
      ...aliveIndices.map((i) => next.enemies[i].damage)
    );
    // 整体判定（GDD 2.4.7）：玩家伤害须大于所有攻击怪的最高伤害；相等 → 双方均被格挡
    clashWon = stats.damage > 0 && stats.damage > maxEnemyDamage;
    if (clashWon) {
      const dmg = stats.damage;
      const target = next.enemies[action.targetIndex];
      if (target && target.hp > 0) {
        target.hp = Math.max(0, target.hp - dmg);
        next.log.push(
          msg(
            `你命中了${enemyName(target, "zh")}，造成 ${dmg} 点伤害。`,
            `You hit ${enemyName(target, "en")}, dealing ${dmg} damage.`
          )
        );
      } else {
        next.log.push(msg("你的攻击落空了。", "Your attack misses."));
      }
    } else {
      next.log.push(
        msg(
          "你的攻击被格挡，未造成伤害。",
          "Your attack is deflected, dealing no damage."
        )
      );
      // 每只攻击怪单独判定：伤害高于玩家攻击的怪命中（全额）；≤ 玩家（含平局）被格挡
      for (const i of aliveIndices) {
        const e = next.enemies[i];
        if (!e.hasAttack || e.damage <= stats.damage) continue;
        const dmg = e.damage;
        next.playerStats.hp = Math.max(0, next.playerStats.hp - dmg);
        next.log.push(
          msg(
            `${enemyName(e, "zh")}攻击了你，造成 ${dmg} 点伤害。`,
            `${enemyName(e, "en")} attacks you for ${dmg} damage.`
          )
        );
      }
    }
  } else if (action.kind === "guard") {
```

- 属性显示块(L409-434)替换为:

```ts
  // 对撞后的属性显示：动作属性每回合重置，不累计。
  // 全额生效：赢家伤害显示满值；被格挡方伤害显示 0（变灰）
  if (action.kind === "attack") {
    next.playerStats.damage = clashWon ? next.playerStats.maxDamage : 0;
    for (const i of aliveIndices) {
      const e = next.enemies[i];
      // 该怪命中玩家 → 满值；被格挡（含平局）→ 0
      e.damage = e.hasAttack && e.damage > stats.damage ? e.maxDamage : 0;
    }
  } else {
    next.playerStats.damage = 0;
  }
```

- L275 改为 `const stats = action.kind === "attack" ? actionStats(state.playerActions, action.skillId) : { damage: 0 };`;L280-286 删 momentum 两行;L298-300 删旧声明;L415-434 旧块整体删除(上面替换);L437 `hasAttack` 保留
- L244-249 函数注释更新(动量 → 伤害)

- [ ] **Step 7: 运行确认通过**

Run: `npx vitest run src/state/battleEngine.test.ts src/data/validate.test.ts src/data/dataConsistency.test.ts`
Expected: PASS

- [ ] **Step 8: 提交**

```bash
git add src/types.ts src/config/enemies.json src/config/items.json src/state/battleEngine.ts src/state/battleEngine.test.ts src/data/validate.ts src/data/validate.test.ts src/data/dataConsistency.test.ts
git commit -m "refactor: 移除动量机制——伤害承担对撞职责（攻vs攻按伤害比较，赢家通吃，平局双方格挡）"
```

---

### Task 2: UI 与文案

**Files:**
- Modify: `src/components/battle/BattleView.tsx`、`src/components/panels/EquipmentPanel.tsx`、`src/i18n/translations.ts`

- [ ] **Step 1: i18n 删除**

`src/i18n/translations.ts`:删 `stat.momentum`(zh L20 / en L140)、`battle.momentum`(zh L109 / en L229)。

- [ ] **Step 2: BattleView**

`src/components/battle/BattleView.tsx`:
- L78 解构删 `momentum, maxMomentum`(保留 `damage, maxDamage, hasAttack`)
- L83 改 `const attackGray = !hasAttack;`
- L115-131 第二列槽:删动量行(L124-131),仅留伤害行
- L256 动作按钮 meta:删 `{t("battle.momentum", { n: act.momentum })}`(保留 damage 显示,若有;无则整段 meta 检查)

- [ ] **Step 3: EquipmentPanel**

`src/components/panels/EquipmentPanel.tsx` L34-36:删每动作的 `t("battle.momentum", { n: act.momentum })` tooltip 片段(保留 damage 部分)。

- [ ] **Step 4: 验证与提交**

Run: `npx vitest run src/components/battle/BattleView.test.tsx src/components/panels/InventoryPanel.test.tsx 2>/dev/null || npx vitest run src/components/battle/BattleView.test.tsx`
Expected: PASS

```bash
git add src/components/battle/BattleView.tsx src/components/panels/EquipmentPanel.tsx src/i18n/translations.ts
git commit -m "refactor: UI 移除动量槽与动量文案"
```

---

### Task 3: 场景描述、文档与全量验证

**Files:**
- Modify: `src/data/testScenarios.ts`、`src/data/battleTestConfigs.ts`、`GDD.md`、`README.md`、`PROGRESS.md`

- [ ] **Step 1: 测试场景描述**

`src/data/testScenarios.ts`:
- L10/L12-13 `test_atk_vs_atk` 名称/描述:「(higher Momentum wins)」→「(higher Damage wins)」;描述「动量较大的一方生效,动量相等双方无效」→「伤害较高的一方生效,伤害相等双方无效。」
- L34-38 `test_clash_loss`:「动量压制」→「伤害压制」;描述「敌方动量高于玩家时…」→「敌方伤害高于玩家攻击时攻击被格挡,敌方反击命中。」
- L62-66 `test_goblins_x3` 描述:「玩家攻击的动量须大于所有怪的攻击动量」→「玩家攻击伤害须大于所有攻击怪的最高伤害;防御/休息时全体怪同时攻击。」
- L100-101 `test_blind` 描述:「但动量的格挡对撞作用仍生效」→「但仍参与对撞压制(伤害比较)。」

`src/data/battleTestConfigs.ts` 注释:
- L9「生锈的剑 10/5」→「生锈的剑 10」
- L13「动量压制:哥布林壮汉动量 7 > 剑 5,攻击被格挡」→「伤害压制:哥布林壮汉 12 > 剑 10,攻击被格挡」
- L20「整体对撞,玩家动量须大于所有怪」→「整体对撞:玩家伤害须大于所有攻击怪的最高伤害」

- [ ] **Step 2: GDD 更新**

`GDD.md`:
- L106「伤害/动量是动作的属性」→「伤害是动作的属性(同时承担输出与对撞压制)」
- L118 同
- L166 攻击行「自带『伤害』『动量』两值」→「自带『伤害』值,玩家本身无属性」
- L173-180 §2.4.3 重写:
  - L175「动量(格挡对撞的能力)」→ 删除该条
  - L176 →「攻击与攻击对撞:**伤害较高的一方生效,造成自己全额伤害**;被压制方(含伤害相等)攻击被**全数格挡**,不造成伤害」
- L182-187 §2.4.4 重写:伤害槽保留(每回合重置为动作满值,防御/休息显示 0);删除动量槽描述与「动量归零变灰」;「赢家伤害显示满值,被压制方显示 0(全数格挡)」
- L195 致盲:「动量的格挡对撞作用仍生效」→「但仍参与对撞压制(伤害比较)」
- L210 多怪:「玩家攻击的动量必须大于所有怪的攻击动量」→「玩家攻击的伤害必须大于所有攻击怪的最高伤害」
- L212:「所有攻击动量 > 0 的怪对玩家造成全额伤害」→「伤害高于玩家攻击的怪对玩家造成全额伤害(≤ 玩家伤害的怪被格挡)」
- L227-228 蓄力:删「动量数值实现时定」→「伤害显著提升(对撞压制亦强)」
- L237「伤害/动量由装备提供的动作指定」→「伤害由装备提供的动作指定」
- L393 战斗 UI 第二列槽:「伤害/动量(…被压制变灰)」→「伤害(被压制时显示 0)」
- L499-501 内容管线:删动量
- L526 Milestone 3:「伤害/动量对撞」→「伤害对撞」

- [ ] **Step 3: README / PROGRESS**

`README.md` L25:「攻击的『动量』将正面相撞。动量高的一方直接命中,动量低的一方被完全压制…动量相同时,双方攻击均被格挡」→「攻击的『伤害』将正面相撞。伤害高的一方直接命中,伤害低的一方被完全压制、攻击全数格挡(赢家通吃);伤害相同时,双方攻击均被格挡。」L27「低伤害、高动量的攻击…高伤害、低动量的攻击…」→「攻击的伤害同时决定压制力:面对更高伤害的敌方攻击时,你的攻击会被格挡,不妨改用防御或蓄力时机;高伤害攻击则能压制敌人的攻势。」L35「以动量拼刀周旋」→「以伤害拼刀周旋」。

`PROGRESS.md` 功能表「战斗核心(攻击/防御/休息/使用道具 + 伤害/动量对撞 + 属性槽)」→「…+ 伤害对撞(赢家通吃) + 属性槽」。

- [ ] **Step 4: 全量验证**

Run: `npm run lint && npm test && npm run build && npm run test:e2e`
Expected: 全部通过(注意 e2e 战斗用例断言 `【蓄力→重击】` 动作集与「回合 N」,与动量无关;若战斗数值断言失败,检查场景配置)

- [ ] **Step 5: 提交**

```bash
git add src/data/testScenarios.ts src/data/battleTestConfigs.ts GDD.md README.md PROGRESS.md
git commit -m "docs: 移除动量——测试场景描述、GDD 2.4.3/2.4.4/2.4.7、README 同步"
```
