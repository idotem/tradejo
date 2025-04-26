import { format } from "date-fns";
import Trade from "../Trade";

export const findTradeImages = async (trade: Trade): Promise<string[]> => {
  const dateStr = format(trade.date, "dd-MM-yyyy");
  const symbol = trade.symbol;

  try {
    // Fetch the list of images from the API route
    const response = await fetch("/api/images");
    if (!response.ok) {
      throw new Error("Failed to fetch images");
    }

    const images = await response.json();

    // Filter images based on the trade's date and symbol
    return images.filter((image: string) =>
      image.startsWith(`${dateStr} - ${symbol} -`)
    );
  } catch (error) {
    console.error("Error finding trade images:", error);
    return [];
  }
};
