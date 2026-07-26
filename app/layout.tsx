import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SiteTransformer — Websites als portable Projekte",
  description: "Websites als echte HTML-, CSS-, JavaScript- und Asset-Dateien erfassen, visuell prüfen und als portables Projekt exportieren.",
  applicationName: "SiteTransformer",
  robots: { index: true, follow: true }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="de"><body>{children}</body></html>;
}
