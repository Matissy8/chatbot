import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/components/providers/app-provider";
import { cookies } from "next/headers";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GUEST_COOKIE_NAME, isGuestModeEnabled } from "@/lib/guest-mode";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Maestro – Virtuālais skolotājs",
  description: "Interaktīva mācību platforma ar virtuālu skolotāju.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const cookieStore = await cookies();
  const initialGuestMode = isGuestModeEnabled() && cookieStore.get(GUEST_COOKIE_NAME)?.value === "1";

  return (
    <html
      lang="lv"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full bg-background text-foreground">
        <AppProvider key={initialGuestMode ? "guest" : "authenticated"} initialGuestMode={initialGuestMode}>{children}</AppProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
