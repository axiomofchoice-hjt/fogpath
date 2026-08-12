/** 随机源（可注入便于测试） */
export type Rng = () => number;

/**
 * 确定性伪随机生成器（mulberry32）：同 seed → 同序列。
 * reducer 中使用的随机都经此包装：同一 (state, action) 必得同一结果，
 * StrictMode 双执行 reducer 也产生一致状态（reducer 纯函数性依赖）。
 */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 派发层生成随机种子（reducer 之外调用；同 seed 派发 → 同结果） */
export function randomSeed(): number {
  return Math.floor(Math.random() * 0x100000000);
}
