/* eslint-disable @typescript-eslint/no-explicit-any */
import Trade from "../Trade";

export async function fetchTradesFromSheet(
  sheetUrl: string,
  selectedSheet: number
): Promise<Trade[]> {
  // Extract the sheet ID from the URL
  const sheetId = extractSheetId(sheetUrl);
  if (!sheetId) {
    console.error("Invalid Google Sheets URL");
  }

  // Construct the export URL
  const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${selectedSheet}`;

  try {
    const response = await fetch(exportUrl);
    const text = await response.text();
    // Remove the Google Visualization API callback wrapper
    const jsonString = text.substring(47).slice(0, -2);
    const data = JSON.parse(jsonString);

    // Transform the data into Trade objects
    return transformToTrades(data.table);
  } catch (error) {
    console.error("Error fetching sheet data:", error);
    throw new Error("Failed to fetch trading data");
  }
}

function extractSheetId(url: string): string | null {
  // Handle both edit and view URLs
  const matches = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return matches ? matches[1] : null;
}

function transformToTrades(table: any): Trade[] {
  const trades: Trade[] = [];
  const headers = table.cols.map((col: any) => col.label);

  table.rows.forEach((row: any) => {
    const rowData = row.c.map((cell: any) => cell?.v ?? null);

    // Get the date value
    const dateValue = rowData[headers.indexOf("Date")];
    const timeOfEntryNotParsed = rowData[headers.indexOf("Time of entry")];
    const timeOfExitNotParsed = rowData[headers.indexOf("Time of exit")];

    // Skip rows where date is null
    if (!dateValue) {
      return;
    }

    // Convert the date format
    // The date comes as Date(2025,2,19) where months are 0-based
    const dateMatch = dateValue.match(/Date\((\d+),(\d+),(\d+)\)/);
    const timeOfEntryMatch = timeOfEntryNotParsed.match(
      /Date\((\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\)/
    );
    const timeOfExitMatch = timeOfExitNotParsed.match(
      /Date\((\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\)/
    );
    if (!dateMatch) {
      console.warn("Invalid date format:", dateValue);
      return;
    }
    if (!timeOfEntryMatch || !timeOfExitMatch) {
      console.warn(
        "Invalid time format: ",
        timeOfEntryNotParsed,
        ", ",
        timeOfExitNotParsed
      );
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, year, month, day] = dateMatch;
    const [, , , , entryHour, entryMinute, entrySecond] = timeOfEntryMatch;
    const [, , , , exitHour, exitMinute, exitSecond] = timeOfExitMatch;
    const date = new Date(Number(year), Number(month), Number(day));
    const timeOfEntry = new Date(
      Number(year),
      Number(month),
      Number(day),
      Number(entryHour),
      Number(entryMinute),
      Number(entrySecond)
    );
    const timeOfExit = new Date(
      Number(year),
      Number(month),
      Number(day),
      Number(exitHour),
      Number(exitMinute),
      Number(exitSecond)
    );

    const trade: Trade = {
      id: trades.length, // Generate sequential IDs
      symbol: rowData[headers.indexOf("Symbol")],
      date: date,
      timeOfEntry: timeOfEntry,
      timeOfExit: timeOfExit,
      buys: Number(rowData[headers.indexOf("Buys")]),
      sells: Number(rowData[headers.indexOf("Sells")]),
      net: Number(rowData[headers.indexOf("Net")]),
      averageBuyPrice: Number(rowData[headers.indexOf("Average Buy Price")]),
      averageSellPrice: Number(rowData[headers.indexOf("Average Sell Price")]),
      totalBuyPrice: Number(rowData[headers.indexOf("Total Buy Price")]),
      totalSoldPrice: Number(rowData[headers.indexOf("Total Sold Price")]),
      netTotal: Number(rowData[headers.indexOf("Net Total")]),
      realizedPnLPercent: Number(rowData[headers.indexOf("Realized P&L%")]),
      realizedPnL: Number(rowData[headers.indexOf("Realized P&L")]),
      commission: Number(rowData[headers.indexOf("Commission")]),
      netInclCommission: Number(
        rowData[headers.indexOf("Net Incl. Commission")]
      ),
      whatHappenedBeforeEnter:
        rowData[headers.indexOf("What happened before enter")] || "",
      whatHappenedAfterExit:
        rowData[headers.indexOf("What happened after exit")] || "",
      comment: rowData[headers.indexOf("Comment")] || "",
      onWork: rowData[headers.indexOf("On work")] === "TRUE" ? true : false,
    };
    console.log("TRADE: ", trade);
    trades.push(trade);
  });

  return trades;
}
