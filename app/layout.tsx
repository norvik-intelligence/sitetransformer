import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "SiteTransformer · Open Crawler Studio", description: "Open-source crawler studio for editable website captures and Framer-style Motion blueprints" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="de"><body>{children}</body></html>;
}
