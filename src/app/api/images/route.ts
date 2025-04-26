import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const imagesDir = path.join(process.cwd(), "public", "images-data");
    const files = fs.readdirSync(imagesDir);

    // Filter for image files (png, jpg, jpeg)
    const imageFiles = files.filter((file) => /\.(png|jpg|jpeg)$/i.test(file));

    return NextResponse.json(imageFiles);
  } catch (error) {
    console.error("Error reading images directory:", error);
    return NextResponse.json(
      { error: "Failed to read images directory" },
      { status: 500 }
    );
  }
}
