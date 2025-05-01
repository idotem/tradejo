import { format } from "date-fns";
import Trade from "../Trade";
import MyImage from "../MyImage";

export const findTradeImages = async (trade: Trade): Promise<string[]> => {
  try {
    // Fetch the list of images from the API route
    const response = await fetch("/api/images");
    if (!response.ok) {
      throw new Error("Failed to fetch images");
    }

    const imagesResponse = await response.json();
    const images: MyImage[] = [];
    for (let i = 0; i < imagesResponse.length; i++) {
      const imageName: string = imagesResponse[i];
      const imgNameSplit = imageName.split(/\s+-\s+/);
      const image: MyImage = {
        date: new Date(format(imgNameSplit[0], "yyyy-MM-dd")),
        symbol: imgNameSplit[1],
        name: imageName,
      };
      images.push(image);
    }
    console.log("IMAGES: ", images);
    console.log("TRADE: ", trade);

    // Filter images based on the trade's date and symbol
    return images
      .filter((image: MyImage) => {
        if (image.symbol === trade.symbol) {
          console.log("symbol true");
        }
        if (image.date.toDateString() === trade.date.toDateString()) {
          console.log("date true");
        }
        return (
          image.date.toDateString() === trade.date.toDateString() &&
          image.symbol === trade.symbol
        );
      })
      .map((image: MyImage) => image.name);
  } catch (error) {
    console.error("Error finding trade images:", error);
    return [];
  }
};
