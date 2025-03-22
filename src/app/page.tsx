"use client";

import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import format from "date-fns/format";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import "react-big-calendar/lib/css/react-big-calendar.css";
import enUS from "date-fns/locale/en-US";
import "./calendar.css";
import { useState, useEffect } from "react";
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`${
          theme === "dark"
            ? "dark bg-[#0a0a0a] text-white"
            : "bg-gray-50 text-black"
        } max-w-4xl max-h-[80vh] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg`}
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

              <div className="grid grid-cols-2 gap-4 text-lg">
                <div
                  className={`${
                    theme === "dark" ? "text-white" : "text-black"
                  }`}
                >
                  <p>
                    <span className="font-semibold">Entry Time:</span>{" "}
                    {trade.timeOfEntry}
                  </p>
                  <p>
                    <span className="font-semibold">Exit Time:</span>{" "}
                    {trade.timeOfExit}
                  </p>
                  <p>
                    <span className="font-semibold">Shares:</span> {trade.buys}
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
                    <span className="font-semibold">Before Entry:</span>
                    {"\n"}
                    {trade.whatHappenedBeforeEnter}
                  </p>
                  <p className="whitespace-pre-wrap">
                    <span className="font-semibold">After Exit:</span>
                    {"\n"}
                    {trade.whatHappenedAfterExit}
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
        }));
        setTrades(parsedTrades);
      } catch (err) {
        console.error("Error loading trades from localStorage:", err);
      }
    }
  }, []);

  const loadTradesFromSheet = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const sheetUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEET_URL;
      if (!sheetUrl) {
        throw new Error("Google Sheet URL not configured");
      }
      const fetchedTrades = await fetchTradesFromSheet(sheetUrl);

      // Save trades to localStorage
      localStorage.setItem("trades", JSON.stringify(fetchedTrades));

      setTrades(fetchedTrades);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load trades");
    } finally {
      setIsLoading(false);
    }
  };

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
          className={`font-bold text-xl ${profitClass} flex justify-between items-baseline`}
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

  return (
    <div
      className={`${
        theme === "dark" ? "bg-[#0a0a0a]" : "bg-slate-100"
      } h-screen flex flex-col`}
    >
      <div className="flex justify-between items-center p-6">
        <h1
          className={`${
            theme === "dark" ? "text-white" : "text-black"
          } text-2xl font-bold`}
        >
          Trading Journal
        </h1>
        <div className="">
          <button
            onClick={loadTradesFromSheet}
            disabled={isLoading}
            className={`${
              theme === "dark"
                ? "bg-green-800 hover:bg-green-900 text-white"
                : "bg-green-300 hover:bg-green-200 text-black"
            } px-4 py-2 rounded-lg mr-15 cursor-pointer`}
          >
            {isLoading ? "Loading..." : "Load Trades"}
          </button>
          <ThemeToggle />
        </div>
      </div>

      {error && <p className="text-red-500 px-6 mb-4">{error}</p>}

      <div className="flex-1 px-6 pb-6">
        <Calendar
          localizer={localizer}
          events={performanceToEvents(calculateDailyPerformance(trades))}
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
      <TradeDialog
        isOpen={!!selectedTrades}
        onClose={() => setSelectedTrades(null)}
        trades={selectedTrades || []}
      />
    </div>
  );
}
