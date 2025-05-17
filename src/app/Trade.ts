type Trade = {
  id: number;
  symbol: string;
  date: Date;
  timeOfEntry: Date;
  timeOfExit: Date;
  buys: number;
  sells: number;
  net: number;
  averageBuyPrice: number;
  averageSellPrice: number;
  totalBuyPrice: number;
  totalSoldPrice: number;
  netTotal: number;
  realizedPnLPercent: number;
  realizedPnL: number;
  commission: number;
  netInclCommission: number;
  whatHappenedBeforeEnter: string;
  whatHappenedAfterExit: string;
  comment: string;
  onWork: boolean;
};

export default Trade;
