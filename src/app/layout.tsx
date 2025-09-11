import type { Metadata } from "next";
import { Oxanium } from "next/font/google";
import "./globals.css";

const oxanium = Oxanium({
  variable: "--font-oxanium",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "pFinance Lab",
  description: "Advanced Personal Finance Analytics with AI Insights",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link 
          href="https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;500;600&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body
        className={`${oxanium.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
