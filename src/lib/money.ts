export const formatMoney = (value: number) =>
  `${new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0,
  }).format(value)} сом`;
