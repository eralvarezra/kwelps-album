import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kwelps Album",
  description: "Collect and trade digital cards",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-[#0F172A]">{children}</body>
    </html>
  );
}
