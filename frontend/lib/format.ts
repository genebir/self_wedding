/** DESIGN.md 3장: 금액은 완전 표기 + 만원 병기. 축약만 쓰지 않는다. */
export function won(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}원`;
}

export function wonShort(amount: number): string {
  if (amount >= 100_000_000) {
    const eok = amount / 100_000_000;
    return `${Number.isInteger(eok) ? eok : eok.toFixed(1)}억원`;
  }
  if (amount >= 10_000) return `${Math.round(amount / 10_000).toLocaleString("ko-KR")}만원`;
  return won(amount);
}

export function dday(n: number): string {
  if (n === 0) return "D-day";
  return n > 0 ? `D-${n}` : `D+${-n}`;
}
