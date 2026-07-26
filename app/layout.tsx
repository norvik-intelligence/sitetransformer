import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SiteTransformer · Crawl, Inspect, Export",
  description: "Websites sicher als portable HTML-, CSS-, JavaScript- und Asset-Dateien erfassen, prüfen und als ZIP exportieren.",
  applicationName: "SiteTransformer",
  robots: { index: true, follow: true }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="de"><body>{children}</body></html>;
}
