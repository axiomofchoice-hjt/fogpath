# 移除动量机制 设计文档

> 日期: 2026-08-11
> 状态: 已批准

## 目标

移除战斗中的「动量(momentum)」独立属性,由「伤害」承担输出与对撞压制的双重职责,简化战斗系统。攻 vs 攻保留「赢家通吃」机制,但比较值从动量改为伤害。

## 新战斗规则(GDD 2.4.3/2.4.4/2.4.7 重写)

1. **攻击只有一个属性:伤害**——同时承担输出与对撞压制;删除 momentum 字段(类型、配置、校验、UI、i18n 全链路)
2. **攻 vs 攻**:比较双方本次攻击的伤害,伤害高者命中(造成自己全额伤害),低者被格挡(0 伤害);**相等 → 双方均被格挡**(与动量时代语义一致)
3. **攻 vs 休息/道具**:攻击全额命中(不变)
4. **攻 vs 防御(举盾)**:攻击伤害减半(不变,减伤 50% 持续到下一次攻击前,出手攻击即破盾)
5. **多怪战斗**:
   - 玩家攻击命中目标的前提:玩家伤害 **> 所有攻击怪的最高伤害**
   - 每只攻击怪**单独判定**:怪伤害 > 玩家伤害 → 命中玩家;怪伤害 < 玩家伤害 → 该怪被格挡;相等 → 双方均被格挡
   - 单怪时两条合并:玩家伤害 > 怪伤害 → 玩家命中且怪被格挡;玩家伤害 < 怪伤害 → 玩家被格挡、怪命中;相等 → 双方均被格挡
6. **蓄力保留**:蓄力回合无攻击(不参与对撞,玩家攻击全额命中);蓄力技伤害显著提升——伤害即压制力,对撞更强;蓄力不可被打断
7. **属性槽 UI**:删动量槽,保留伤害槽(未出手/防御/休息显示 0;被压制方结算后显示 0;变灰条件改为 `!hasAttack`)

## 影响面(15 个文件)

| 文件 | 改动 |
| --- | --- |
| `src/types.ts` | 删 `ItemAction.momentum`(L22)、`CombatStats.momentum/maxMomentum`(L180-183)、`PatternStep` attack 的 `momentum`(L232)、`EnemyDef.momentum`(L256)、`BattleEnemy.momentum/maxMomentum`(L273-274);保留 `hasAttack`、`damage/maxDamage` |
| `src/config/enemies.json` | 删 4 个敌人顶层 momentum + 全部攻击步 momentum(约 17 处) |
| `src/config/items.json` | 删 3 件武器动作的 momentum(L17、L30-32、L42) |
| `src/state/battleEngine.ts` | `actionStats`(L33-41)删 momentum 返回;`applyEnemyStep`(L66-99)蓄力/攻击步删 momentum;`initEnemies`(L160-161)、`buildBattle`(L197-198)删 momentum 初始化;`resolveTurn`(L250-455)对撞结算:比较值换成伤害(攻vs攻、多怪整体+逐怪、蓄力、属性显示块 L409-434) |
| `src/components/battle/BattleView.tsx` | 删动量槽(L124-131);`attackGray`(L83)改为 `!hasAttack`;动作按钮动量 meta(L256)删除 |
| `src/components/panels/EquipmentPanel.tsx` | 删 tooltip 动量文案(L34-36) |
| `src/i18n/translations.ts` | 删 `stat.momentum`(L20/L140)、`battle.momentum`(L109/L229) |
| `src/data/validate.ts` | 删 momentum 校验:物品动作白名单(L130)与 `>0`(L134)、敌人白名单(L149)、攻击步白名单(L171)与 `>0`(L183)、敌人顶层 `gte 0`(L219) |
| `src/data/validate.test.ts` | 删 16 处夹具 momentum 字段 |
| `src/data/dataConsistency.test.ts` | 删 L51 `step.momentum` 断言 |
| `src/state/battleEngine.test.ts` | 重写约 10 个对撞/蓄力/多怪用例(约 20 处动量断言):比较值换伤害、平局双方格挡、蓄力保留、多怪整体+逐怪 |
| `src/data/testScenarios.ts` | 场景名称/描述更新(「动量压制」→「伤害压制」等,L5-41、L56-69、L100-101) |
| `src/data/battleTestConfigs.ts` | 注释更新(L9、L13、L20) |
| `GDD.md` | 2.4.3/2.4.4/2.4.7/2.4.9/2.5.1/4.3/7.1/8 章节 |
| `README.md` | L25、L27、L35 |
| `PROGRESS.md` | 功能表「伤害/动量对撞」行措辞 |

## 无需改动

- `src/state/battleReducer.ts`(无动量逻辑)
- `src/state/save.ts`(存档不含 battle/地牢状态;玩家状态无 momentum)
- `battleEngine.test` 之外的既有测试(`gameReducer.test.ts`、`gameContext.test.tsx`、`BattleView.test.tsx` 无动量断言,但 BattleView 改 UI 后需回归)

## 范围外(YAGNI)

- 不引入速度/先手等新属性
- 不做数值重平衡(伤害数值本身不变,仅对撞比较值改变)
- 特殊效果(致盲/吸血/中毒/易损)维持规划状态;致盲描述「动量格挡对撞仍生效」改为「不造成伤害,但仍参与对撞压制」
