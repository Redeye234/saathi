import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Saathi — A little support. A better workday.",
  description: "Your everyday work companion. Multilingual guidance, earnings, welfare schemes and document help for India's gig and informal workers.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
