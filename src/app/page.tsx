"use client";

import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./calendar.css";
import { useState, useEffect, useCallback } from "react";
import Trade from "./Trade";
import ThemeToggle from "./ThemeToggle";
import { useTheme } from "./ThemeContext";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
} from "lucide-react";
import { fetchTradesFromSheet } from "./utils/sheetParser";
import { DateRange } from "react-day-picker";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { findTradeImages } from "./utils/imageUtils";
import Image from "next/image";

const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// Add this type for our calendar events
type CalendarEvent = {
  title: string;
  start: Date;
  end: Date;
  trade: Trade;
};

type DailyPerformance = {
  date: Date;
  trades: Trade[];
  totalInvested: number;
  netProfit: number;
  netProfitPercent: number;
};

// Group trades by date and calculate daily performance
const calculateDailyPerformance = (trades: Trade[]): DailyPerformance[] => {
  // Group trades by date string to handle multiple trades on same day
  const tradesByDate = trades.reduce((acc, trade) => {
    const dateStr = trade.date.toDateString();
    if (!acc[dateStr]) {
      acc[dateStr] = [];
    }
    acc[dateStr].push(trade);
    return acc;
  }, {} as { [key: string]: Trade[] });

  // Calculate performance for each day
  return Object.entries(tradesByDate).map(([dateStr, dailyTrades]) => {
    const totalInvested = dailyTrades.reduce(
      (sum, trade) => sum + trade.totalBuyPrice,
      0
    );
    const netProfit = dailyTrades.reduce(
      (sum, trade) => sum + trade.netTotal,
      0
    );
    const netProfitPercent = (netProfit / totalInvested) * 100;

    return {
      date: new Date(dateStr),
      trades: dailyTrades,
      totalInvested,
      netProfit,
      netProfitPercent,
    };
  });
};

// Convert daily performance to calendar events
const performanceToEvents = (
  performances: DailyPerformance[]
): CalendarEvent[] => {
  return performances.map((perf) => ({
    title: `Daily P&L: ${perf.netProfitPercent.toFixed(2)}% ($${
      perf.netProfit
    })`,
    start: perf.date,
    end: perf.date,
    trade: perf.trades[0], // Keep trade property for type compatibility
    performance: perf, // Add performance data
  }));
};

// Add this type definition after the other type definitions
type TradeDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  trades: Trade[];
};

// Add this new component before the Home component
const TradeDialog = ({ isOpen, onClose, trades }: TradeDialogProps) => {
  const { theme } = useTheme();
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [showImages, setShowImages] = useState(false);
  const [tradeImages, setTradeImages] = useState<string[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);

  const handleViewImages = async (trade: Trade) => {
    setSelectedTrade(trade);
    setIsLoadingImages(true);
    try {
      const images = await findTradeImages(trade);
      console.log("Images for trade:", images);
      setTradeImages(images);
      setShowImages(true);
    } catch (error) {
      console.error("Error loading images:", error);
    } finally {
      setIsLoadingImages(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent
          className={`${
            theme === "dark"
              ? "dark bg-[#0a0a0a] text-white"
              : "bg-gray-50 text-black"
          } max-w-[70vw] max-h-[70vh] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg`}
        >
          <DialogTitle className="text-xl font-bold mb-4">
            Trades for {trades[0]?.date.toLocaleDateString()}
          </DialogTitle>
          <div className="space-y-6">
            {trades.map((trade) => (
              <div
                key={trade.id}
                className={`p-4 rounded-lg ${
                  trade.netTotal >= 0
                    ? "bg-green-50 dark:bg-green-300/30"
                    : "bg-red-50 dark:bg-red-300/30"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold">{trade.symbol}</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleViewImages(trade)}
                      disabled={isLoadingImages}
                      className={`px-3 py-1 rounded ${
                        theme === "dark"
                          ? "bg-gray-900 hover:bg-gray-800 text-white cursor-pointer"
                          : "bg-gray-300 hover:bg-gray-200 text-black cursor-pointer"
                      } ${
                        isLoadingImages ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      {isLoadingImages ? "Loading..." : "View Charts"}
                    </button>
                    <span
                      className={`font-bold ${
                        trade.netTotal >= 0
                          ? "text-green-700 dark:text-green-500"
                          : "text-red-700 dark:text-red-500"
                      }`}
                    >
                      ${trade.netTotal.toFixed(2)} (
                      {(trade.realizedPnLPercent * 100).toFixed(2)}%)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-lg">
                  <div
                    className={`${
                      theme === "dark" ? "text-white" : "text-black"
                    }`}
                  >
                    <p>
                      <span className="font-semibold">Entry Time:</span>{" "}
                      {trade.timeOfEntry.getHours() +
                        ":" +
                        trade.timeOfEntry.getMinutes() +
                        ":" +
                        trade.timeOfEntry.getSeconds()}
                    </p>
                    <p>
                      <span className="font-semibold">Exit Time:</span>{" "}
                      {trade.timeOfExit.getHours() +
                        ":" +
                        trade.timeOfExit.getMinutes() +
                        ":" +
                        trade.timeOfExit.getSeconds()}
                    </p>
                    <p>
                      <span className="font-semibold">Shares:</span>{" "}
                      {trade.buys}
                    </p>
                    <p>
                      <span className="font-semibold">Avg Buy:</span> $
                      {trade.averageBuyPrice.toFixed(2)}
                    </p>
                    <p>
                      <span className="font-semibold">Avg Sell:</span> $
                      {trade.averageSellPrice.toFixed(2)}
                    </p>
                    <p>
                      <span className="font-semibold">Total Buy:</span> $
                      {trade.totalBuyPrice.toFixed(2)}
                    </p>
                    <p>
                      <span className="font-semibold">Total Sell:</span> $
                      {trade.totalSoldPrice.toFixed(2)}
                    </p>
                    <p>
                      <span className="font-semibold">Commission:</span> $
                      {trade.commission.toFixed(2)}
                    </p>
                    <p>
                      <span className="font-semibold">Realized PnL:</span> $
                      {trade.realizedPnL.toFixed(2)}
                    </p>
                    <p>
                      <span className="font-semibold">Net (incl. comm):</span> $
                      {trade.netInclCommission.toFixed(2)}
                    </p>
                  </div>

                  <div
                    className={`${
                      theme === "dark" ? "text-white" : "text-black"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">
                      {trade.whatHappenedBeforeEnter ? (
                        <span className="font-semibold">
                          Before Entry: {trade.whatHappenedBeforeEnter}
                        </span>
                      ) : (
                        ""
                      )}
                    </p>
                    <p className="whitespace-pre-wrap">
                      {trade.whatHappenedAfterExit ? (
                        <span className="font-semibold">
                          After Exit: {trade.whatHappenedAfterExit}
                        </span>
                      ) : (
                        ""
                      )}
                    </p>
                    <p className="whitespace-pre-wrap">
                      <span className="font-semibold">Comments:</span>
                      {"\n"}
                      {trade.comment}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Image View Dialog */}
      <Dialog open={showImages} onOpenChange={setShowImages}>
        <DialogContent
          className={`${
            theme === "dark"
              ? "dark bg-[#0a0a0a] text-white"
              : "bg-gray-50 text-black"
          } max-w-[90vw] max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg`}
        >
          <DialogTitle className="text-xl font-bold mb-4">
            Charts for {selectedTrade?.symbol} -{" "}
            {selectedTrade?.date.toLocaleDateString()}
          </DialogTitle>
          <div className="grid grid-cols-1 gap-4">
            {tradeImages.length > 0 ? (
              tradeImages.map((imagePath, index) => (
                <div key={index} className="relative">
                  <p className="text-xl font-bold">
                    {" "}
                    {imagePath.split("-")[4]}{" "}
                  </p>
                  <Image
                    src={`/images-data/${imagePath}`}
                    alt={`Chart ${index + 1}`}
                    width={800}
                    height={600}
                    className="w-full h-auto rounded-lg"
                  />
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500">
                No charts available for this trade
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default function Home() {
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<View>("month");
  const { theme } = useTheme();
  const [selectedTrades, setSelectedTrades] = useState<Trade[] | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedSheet, setSelectedSheet] = useState(2);

  // Add this useEffect to load trades from localStorage on component mount
  useEffect(() => {
    const storedTrades = localStorage.getItem("trades");
    if (storedTrades) {
      try {
        // Parse stored trades and convert date strings back to Date objects
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parsedTrades = JSON.parse(storedTrades).map((trade: any) => ({
          ...trade,
          date: new Date(trade.date),
          timeOfEntry: new Date(trade.timeOfEntry),
          timeOfExit: new Date(trade.timeOfExit),
        }));
        setTrades(parsedTrades);
      } catch (err) {
        console.error("Error loading trades from localStorage:", err);
      }
    }
  }, []);

  const loadTradesFromSheet = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const sheetUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEET_URL;

      if (!sheetUrl) {
        throw new Error("Google Sheet URL not configured");
      }
      const fetchedTrades = await fetchTradesFromSheet(sheetUrl, selectedSheet);

      // Save trades to localStorage
      localStorage.setItem("trades", JSON.stringify(fetchedTrades));

      setTrades(fetchedTrades);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load trades");
    } finally {
      setIsLoading(false);
    }
  }, [selectedSheet]);

  useEffect(() => {
    loadTradesFromSheet();
  }, [selectedSheet, loadTradesFromSheet]);

  const calendarStyles = {
    height: "100%",
    backgroundColor: theme === "dark" ? "#1a1a1a" : "#ffffff",
    color: theme === "dark" ? "#fff" : "#000",
    border: theme !== "dark" ? "1px solid black" : "",
    borderRadius: theme !== "dark" ? "5px" : "",
  };

  // Custom event component to show daily performance
  const EventComponent = ({
    event,
  }: {
    event: CalendarEvent & { performance?: DailyPerformance };
  }) => {
    const perf = event.performance!;
    const isProfit = perf.netProfit >= 0;
    const profitClass = isProfit
      ? theme === "dark"
        ? "text-green-400"
        : "text-green-600"
      : theme === "dark"
      ? "text-red-400"
      : "text-red-600";

    return (
      <div
        className={`p-2 text-sm rounded cursor-pointer hover:opacity-80 ${
          isProfit
            ? theme === "dark"
              ? "bg-green-950/30"
              : "bg-green-100/50"
            : theme === "dark"
            ? "bg-red-950/30"
            : "bg-red-100/50"
        }`}
        onClick={() => setSelectedTrades(perf.trades)}
      >
        <div className="text-xs text-gray-400 flex justify-between items-baseline">
          <span>${perf.totalInvested.toFixed(2)}</span>{" "}
          <span>{perf.trades.length}</span>{" "}
        </div>
        <div
          className={`font-bold text-base ${profitClass} flex justify-between items-baseline`}
        >
          <span>${perf.netProfit.toFixed(2)}</span>
          <span>({perf.netProfitPercent.toFixed(2)}%)</span>
        </div>
      </div>
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomToolbar = (toolbar: any) => {
    const goToBack = () => {
      toolbar.onNavigate("PREV");
    };

    const goToNext = () => {
      toolbar.onNavigate("NEXT");
    };

    const goToCurrent = () => {
      toolbar.onNavigate("TODAY");
    };

    return (
      <div className="rbc-toolbar">
        <span className="rbc-btn-group">
          <button
            type="button"
            onClick={goToCurrent}
            className="flex items-center justify-center px-3"
          >
            <CalendarIcon className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={goToBack}
            className="flex items-center justify-center px-3"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={goToNext}
            className="flex items-center justify-center px-3"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </span>
        <span className="rbc-toolbar-label">{toolbar.label}</span>
        <span className="rbc-btn-group">
          {toolbar.views.map((view: string) => (
            <button
              key={view}
              type="button"
              className={view === toolbar.view ? "rbc-active" : ""}
              onClick={() => toolbar.onView(view)}
            >
              {view.charAt(0).toUpperCase() + view.slice(1)}
            </button>
          ))}
        </span>
      </div>
    );
  };

  // Filter trades based on date range
  const filteredTrades = trades.filter((trade) => {
    if (!dateRange?.from && !dateRange?.to) return true;
    const tradeDate = new Date(trade.date);

    if (dateRange.from && dateRange.to) {
      return tradeDate >= dateRange.from && tradeDate <= dateRange.to;
    }

    if (dateRange.from) {
      return tradeDate >= dateRange.from;
    }

    if (dateRange.to) {
      return tradeDate <= dateRange.to;
    }

    return true;
  });

  // Update the stats calculation to track both dollar and percentage values
  const stats = filteredTrades.reduce(
    (acc, trade) => {
      const dateStr = trade.date.toDateString();

      // Track daily totals for average calculation
      acc.dailyTotals.set(
        dateStr,
        (acc.dailyTotals.get(dateStr) || 0) + trade.totalBuyPrice
      );

      if (!acc.tradingDays.has(dateStr)) {
        acc.tradingDays.add(dateStr);
      }

      const tradePercent = (trade.netTotal / trade.totalBuyPrice) * 100;
      const perSharePnL = trade.averageSellPrice - trade.averageBuyPrice;

      // Calculate holding time in minutes
      const holdingTimeSeconds =
        (trade.timeOfExit.getTime() - trade.timeOfEntry.getTime()) / 1000;

      return {
        ...acc,
        totalBuyPrice: acc.totalBuyPrice + trade.totalBuyPrice,
        netTotal: acc.netTotal + trade.netTotal,
        netInclCommission:
          acc.netInclCommission + (trade.netInclCommission || 0),
        tradeCount: acc.tradeCount + 1,
        winCount: acc.winCount + (trade.netTotal > 0 ? 1 : 0),
        lossCount: acc.lossCount + (trade.netTotal < 0 ? 1 : 0),
        totalProfit:
          acc.totalProfit + (trade.netTotal > 0 ? trade.netTotal : 0),
        totalLoss: acc.totalLoss + (trade.netTotal < 0 ? trade.netTotal : 0),
        largestWinPercent: Math.max(
          acc.largestWinPercent,
          tradePercent > 0 ? tradePercent : -Infinity
        ),
        largestLossPercent: Math.min(
          acc.largestLossPercent,
          tradePercent < 0 ? tradePercent : Infinity
        ),
        largestWinAmount: Math.max(
          acc.largestWinAmount,
          trade.netTotal > 0 ? trade.netTotal : -Infinity
        ),
        largestLossAmount: Math.min(
          acc.largestLossAmount,
          trade.netTotal < 0 ? trade.netTotal : Infinity
        ),
        // Track trades for calculating averages
        winningTrades:
          trade.netTotal > 0
            ? [...acc.winningTrades, tradePercent]
            : acc.winningTrades,
        losingTrades:
          trade.netTotal < 0
            ? [...acc.losingTrades, tradePercent]
            : acc.losingTrades,
        winningPerSharePnL:
          trade.netTotal > 0
            ? [...acc.winningPerSharePnL, perSharePnL]
            : acc.winningPerSharePnL,
        losingPerSharePnL:
          trade.netTotal < 0
            ? [...acc.losingPerSharePnL, perSharePnL]
            : acc.losingPerSharePnL,
        winningShares:
          trade.netTotal > 0
            ? acc.winningShares + trade.buys
            : acc.winningShares,
        losingShares:
          trade.netTotal < 0 ? acc.losingShares + trade.buys : acc.losingShares,
        holdingTime: acc.holdingTime + holdingTimeSeconds,
        winningHoldingTimes:
          trade.netTotal > 0 && holdingTimeSeconds > 0
            ? [...acc.winningHoldingTimes, holdingTimeSeconds]
            : acc.winningHoldingTimes,
        losingHoldingTimes:
          trade.netTotal < 0 && holdingTimeSeconds > 0
            ? [...acc.losingHoldingTimes, holdingTimeSeconds]
            : acc.losingHoldingTimes,
        dailyTotals: acc.dailyTotals,
      };
    },
    {
      totalBuyPrice: 0,
      netTotal: 0,
      netInclCommission: 0,
      tradeCount: 0,
      tradingDays: new Set<string>(),
      winCount: 0,
      lossCount: 0,
      totalProfit: 0,
      totalLoss: 0,
      largestWinPercent: -Infinity,
      largestLossPercent: Infinity,
      largestWinAmount: -Infinity,
      largestLossAmount: Infinity,
      winningTrades: [] as number[],
      losingTrades: [] as number[],
      winningPerSharePnL: [] as number[],
      losingPerSharePnL: [] as number[],
      winningShares: 0,
      losingShares: 0,
      holdingTime: 0,
      winningHoldingTimes: [] as number[],
      losingHoldingTimes: [] as number[],
      dailyTotals: new Map<string, number>(),
    }
  );

  // Calculate average daily traded amount
  const avgDailyAmount =
    stats.tradingDays.size > 0
      ? stats.totalBuyPrice / stats.tradingDays.size
      : 0;

  // Calculate percentages using average daily
  const totalPercentage = avgDailyAmount
    ? (stats.netTotal / avgDailyAmount) * 100
    : 0;
  const totalPercentageInclCommission = avgDailyAmount
    ? (stats.netInclCommission / avgDailyAmount) * 100
    : 0;

  // Calculate average percentages
  const avgWinPercent = stats.winningTrades.length
    ? stats.winningTrades.reduce((a, b) => a + b, 0) /
      stats.winningTrades.length
    : 0;

  const avgLossPercent = stats.losingTrades.length
    ? stats.losingTrades.reduce((a, b) => a + b, 0) / stats.losingTrades.length
    : 0;

  const formatHoldingTime = (seconds: number) => {
    // this has hours but I don't plan using it for longer trades.
    // return `${Math.round(seconds / 3600)}h ${Math.round(
    //   seconds / 60
    // )}m ${Math.round(seconds % 60)}s`;
    return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  };

  const avgHoldingTime = stats.holdingTime
    ? stats.holdingTime / stats.tradeCount
    : 0;

  const avgWinHoldingTime = stats.winningHoldingTimes.length
    ? stats.winningHoldingTimes.reduce((a, b) => a + b, 0) /
      stats.winningHoldingTimes.length
    : 0;

  const avgLossHoldingTime = stats.losingHoldingTimes.length
    ? stats.losingHoldingTimes.reduce((a, b) => a + b, 0) /
      stats.losingHoldingTimes.length
    : 0;

  // Calculate average per share PnL
  const avgWinPerShare = stats.winningPerSharePnL.length
    ? stats.winningPerSharePnL.reduce((a, b) => a + b, 0) /
      stats.winningPerSharePnL.length
    : 0;

  const avgLossPerShare = stats.losingPerSharePnL.length
    ? stats.losingPerSharePnL.reduce((a, b) => a + b, 0) /
      stats.losingPerSharePnL.length
    : 0;

  // Calculate average shares per trade
  const avgSharesPerWin =
    stats.winCount > 0 ? stats.winningShares / stats.winCount : 0;
  const avgSharesPerLoss =
    stats.lossCount > 0 ? stats.losingShares / stats.lossCount : 0;

  return (
    <div
      className={`${
        theme === "dark" ? "bg-[#0a0a0a]" : "bg-slate-100"
      } h-screen flex flex-col`}
    >
      <div className="flex justify-between items-center p-6">
        <div className="flex items-center gap-8">
          <h1
            className={`${
              theme === "dark" ? "text-white" : "text-black"
            } text-2xl font-bold`}
          >
            Trading Journal
          </h1>
          <div className={`${theme === "dark" ? "text-white" : "text-black"}`}>
            <div className="text-sm opacity-80">
              {stats.tradeCount} Trades ({stats.tradingDays.size} Days) | Total
              Traded: ${stats.totalBuyPrice.toFixed(2)} | Avg Daily: $
              {avgDailyAmount.toFixed(2)}
            </div>
            <div
              className={`text-lg font-semibold ${
                totalPercentage >= 0
                  ? theme === "dark"
                    ? "text-green-400"
                    : "text-green-600"
                  : theme === "dark"
                  ? "text-red-400"
                  : "text-red-600"
              }`}
            >
              Net: ${stats.netTotal.toFixed(2)} ({totalPercentage.toFixed(2)}%)
              <span className="ml-4">
                Net Incl. Commission: ${stats.netInclCommission.toFixed(2)} (
                {totalPercentageInclCommission.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <DatePickerWithRange
            date={dateRange}
            setDate={setDateRange}
            theme={theme}
          />
          <button
            onClick={loadTradesFromSheet}
            disabled={isLoading}
            className={`${
              theme === "dark"
                ? "bg-cyan-600 hover:bg-cyan-800 text-white"
                : "bg-cyan-300 hover:bg-cyan-200 text-black"
            } px-4 py-2 rounded-lg cursor-pointer `}
          >
            {isLoading ? "Loading..." : "Load Trades"}
          </button>
          <div className="flex items-center gap-2 mr-12">
            <button
              onClick={() => setSelectedSheet(1)}
              className={`cursor-pointer w-8 h-8 rounded-sm flex items-center justify-center ${
                selectedSheet === 1
                  ? theme === "dark"
                    ? "bg-cyan-600 text-white hover:bg-cyan-800"
                    : "bg-cyan-300 text-black hover:bg-cyan-400"
                  : theme === "dark"
                  ? "bg-gray-700 text-white hover:bg-gray-800"
                  : "bg-gray-300 text-black hover:bg-gray-400"
              }`}
            >
              1
            </button>
            <button
              onClick={() => setSelectedSheet(2)}
              className={`cursor-pointer w-8 h-8 rounded-sm flex items-center justify-center ${
                selectedSheet === 2
                  ? theme === "dark"
                    ? "bg-cyan-600 text-white hover:bg-cyan-800"
                    : "bg-cyan-300 text-black hover:bg-cyan-400"
                  : theme === "dark"
                  ? "bg-gray-700 text-white hover:bg-gray-800"
                  : "bg-gray-300 text-black hover:bg-gray-400"
              }`}
            >
              2
            </button>
          </div>
          <ThemeToggle />
        </div>
      </div>

      {error && <p className="text-red-500 px-6 mb-4">{error}</p>}

      <div className="flex flex-1 px-6 pb-6 gap-6">
        {/* Stats Panel */}
        <div
          className={`w-80 ${
            theme === "dark" ? "bg-[#1a1a1a]" : "bg-white"
          } rounded-lg p-4 space-y-4`}
        >
          <h2
            className={`text-xl font-bold ${
              theme === "dark" ? "text-white" : "text-black"
            }`}
          >
            Trading Statistics
          </h2>

          {filteredTrades.length > 0 ? (
            <>
              <div className="space-y-3">
                <StatsRow
                  label="Win Rate"
                  value={`${((stats.winCount / stats.tradeCount) * 100).toFixed(
                    1
                  )}%`}
                  theme={theme}
                />
                <StatsRow
                  label="Profit Factor"
                  value={`${Math.abs(
                    stats.totalProfit / (stats.totalLoss || 1)
                  ).toFixed(2)}`}
                  theme={theme}
                />
                <StatsRow
                  label="Winning Trades"
                  value={stats.winCount.toString()}
                  theme={theme}
                  isPositive={true}
                />
                <StatsRow
                  label="Losing Trades"
                  value={stats.lossCount.toString()}
                  theme={theme}
                  isPositive={false}
                />
                <StatsRow
                  label="Average Trade"
                  value={`$${(stats.netTotal / stats.tradeCount).toFixed(2)}`}
                  theme={theme}
                  isPositive={stats.netTotal > 0}
                />
                <StatsRow
                  label="Average Win"
                  value={`$${(stats.totalProfit / stats.winCount || 0).toFixed(
                    2
                  )} (${avgWinPercent.toFixed(2)}%)`}
                  theme={theme}
                  isPositive={true}
                />
                <StatsRow
                  label="Average Loss"
                  value={`$${(stats.totalLoss / stats.lossCount || 0).toFixed(
                    2
                  )} (${avgLossPercent.toFixed(2)}%)`}
                  theme={theme}
                  isPositive={false}
                />
                <StatsRow
                  label="Largest Win Percent"
                  value={`${
                    stats.largestWinPercent > -Infinity
                      ? stats.largestWinPercent.toFixed(2)
                      : "0.00"
                  }%`}
                  theme={theme}
                  isPositive={true}
                />
                <StatsRow
                  label="Largest Win Amount"
                  value={`$${
                    stats.largestWinAmount > -Infinity
                      ? stats.largestWinAmount.toFixed(2)
                      : "0.00"
                  }`}
                  theme={theme}
                  isPositive={true}
                />
                <StatsRow
                  label="Largest Loss Percent"
                  value={`${
                    stats.largestLossPercent < Infinity
                      ? stats.largestLossPercent.toFixed(2)
                      : "0.00"
                  }%`}
                  theme={theme}
                  isPositive={false}
                />
                <StatsRow
                  label="Largest Loss Amount"
                  value={`$${
                    stats.largestLossAmount < Infinity
                      ? stats.largestLossAmount.toFixed(2)
                      : "0.00"
                  }`}
                  theme={theme}
                  isPositive={false}
                />
                <StatsRow
                  label="Avg Hold Time"
                  value={formatHoldingTime(avgHoldingTime)}
                  theme={theme}
                />
                <StatsRow
                  label="Avg Win Hold Time"
                  value={formatHoldingTime(avgWinHoldingTime)}
                  theme={theme}
                />
                <StatsRow
                  label="Avg Loss Hold Time"
                  value={formatHoldingTime(avgLossHoldingTime)}
                  theme={theme}
                />
                <StatsRow
                  label="Avg Win Per Share"
                  value={`$${avgWinPerShare.toFixed(2)}`}
                  theme={theme}
                  isPositive={true}
                />
                <StatsRow
                  label="Avg Loss Per Share"
                  value={`$${avgLossPerShare.toFixed(2)}`}
                  theme={theme}
                  isPositive={false}
                />
                <StatsRow
                  label="Avg Shares Per Win"
                  value={avgSharesPerWin.toFixed(0)}
                  theme={theme}
                  isPositive={true}
                />
                <StatsRow
                  label="Avg Shares Per Loss"
                  value={avgSharesPerLoss.toFixed(0)}
                  theme={theme}
                  isPositive={false}
                />
              </div>
            </>
          ) : (
            <p
              className={`text-sm ${
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              }`}
            >
              No trades in selected date range
            </p>
          )}
        </div>

        {/* Calendar */}
        <div className="flex-1">
          <Calendar
            localizer={localizer}
            events={performanceToEvents(
              calculateDailyPerformance(filteredTrades)
            )}
            startAccessor="start"
            endAccessor="end"
            style={calendarStyles}
            className="dark-calendar"
            date={date}
            onNavigate={(date) => setDate(date)}
            view={view}
            onView={(view) => setView(view)}
            components={{
              event: EventComponent,
              toolbar: CustomToolbar,
            }}
          />
        </div>
      </div>
      <TradeDialog
        isOpen={!!selectedTrades}
        onClose={() => setSelectedTrades(null)}
        trades={selectedTrades || []}
      />
    </div>
  );
}

// Add this component at the file level
const StatsRow = ({
  label,
  value,
  theme,
  isPositive,
}: {
  label: string;
  value: string;
  theme: string;
  isPositive?: boolean;
}) => (
  <div className="flex justify-between items-center">
    <span className={`${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
      {label}
    </span>
    <span
      className={`font-semibold ${
        isPositive !== undefined
          ? isPositive
            ? theme === "dark"
              ? "text-green-400"
              : "text-green-600"
            : theme === "dark"
            ? "text-red-400"
            : "text-red-600"
          : theme === "dark"
          ? "text-white"
          : "text-black"
      }`}
    >
      {value}
    </span>
  </div>
);
