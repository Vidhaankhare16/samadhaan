import type { Metadata } from "next";
import {
  Newsreader,
  IBM_Plex_Sans,
  IBM_Plex_Mono,
  IBM_Plex_Sans_Devanagari,
} from "next/font/google";
import "./globals.css";

// Editorial "official bulletin" display face for headings + report titles.
const newsreader = Newsreader({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
});

// Institutional, technical-humanist body face (govtech, not generic SaaS).
const plexSans = IBM_Plex_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Utility face for eyebrows, stamps and tracking IDs.
const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

// Devanagari cut that harmonizes with Plex — for the समाधान wordmark.
const plexDevanagari = IBM_Plex_Sans_Devanagari({
  variable: "--font-deva",
  subsets: ["devanagari", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Samadhaan — the civic issue that resolves itself",
  description:
    "An autonomous multi-agent civic platform. Citizens report a pothole by photo, chat, or phone call — AI agents diagnose, file, track, and verify the fix. No human presses a button.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${newsreader.variable} ${plexSans.variable} ${plexMono.variable} ${plexDevanagari.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink">
        {children}
      </body>
    </html>
  );
}
