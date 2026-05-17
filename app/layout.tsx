import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CampaignWise — Know Why. Fix Fast.",
  description: "Campaign intelligence for SFMC, Braze, HubSpot, and Klaviyo. Connect your CRM and data warehouse for full revenue attribution. Know why every campaign performed the way it did — and exactly what to fix next.",
  icons: { icon: "/logo-icon.svg" },
  openGraph: {
    title: "CampaignWise — Know Why. Fix Fast.",
    description: "Campaign intelligence for marketing ops teams. Know why every campaign performed the way it did.",
    images: [{ url: "/og-image.png" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
    >
      <html lang="en" suppressHydrationWarning>
        <body className={`${dmSans.variable} ${jetbrainsMono.variable} antialiased`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
