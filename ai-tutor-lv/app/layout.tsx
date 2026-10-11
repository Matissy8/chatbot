import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/components/providers/app-provider";
import { cookies } from "next/headers";
import { GUEST_COOKIE_NAME, isGuestModeEnabled } from "@/lib/guest-mode";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Maestro – Tavs AI mācību asistents",
  description: "Inteliģenta un personalizēta mācību platforma.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const cookieStore = await cookies();
  const initialGuestMode = isGuestModeEnabled() && cookieStore.get(GUEST_COOKIE_NAME)?.value === "1";

  return (
    <html
      lang="lv"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <AppProvider key={initialGuestMode ? "guest" : "authenticated"} initialGuestMode={initialGuestMode}>{children}</AppProvider>
      </body>
    </html>
  );
}
