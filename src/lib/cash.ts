export const cashDenominations = [5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5, 3, 1] as const;

export type CashCount = Record<string, number>;

export function normalizeCashCount(value: CashCount) {
  return cashDenominations.reduce<CashCount>((acc, denomination) => {
    acc[String(denomination)] = Math.max(0, Math.trunc(Number(value[String(denomination)] || 0)));
    return acc;
  }, {});
}

export function cashTotal(value: CashCount) {
  return cashDenominations.reduce((sum, denomination) => sum + denomination * Math.max(0, Math.trunc(Number(value[String(denomination)] || 0))), 0);
}
