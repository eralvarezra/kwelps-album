import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kwelps Album",
  description: "Colecciona fotografías de edición limitada.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
