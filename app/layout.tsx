import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Archivo } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const archivo = Archivo({
  variable: "--font-archivo",
  weight: ["600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "911 Turbo — Ruby Star",
  description:
    "A scroll-driven walkaround of the Porsche 911 Turbo (996): the camera circles the car, stops for the details, and you pick the paint.",
  openGraph: {
    title: "911 Turbo — 996",
    description:
      "Scroll and the camera walks around it. Pick the paint, the wheels and the calipers.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "911 Turbo — 996",
    description: "A scroll-driven walkaround of the Porsche 911 Turbo (996).",
  },
};

/** themeColor belongs here, not in metadata, since Next 14 */
export const viewport: Viewport = {
  themeColor: "#05060a",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${archivo.variable} antialiased`}
    >
      <body>{children}</body>
    </html>
  );
}
