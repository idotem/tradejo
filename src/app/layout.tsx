import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "./ThemeContext";

export const metadata: Metadata = {
  title: "TradeJO",
  description: "The simplest trading journal there is",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
