import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import WebVitalsLogger from "@/components/WebVitalsLogger";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Askademia",
  description: "AI research assistant frontend",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  try {
    var ls = localStorage.getItem('theme');
    var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var shouldDark = ls === 'dark' || (ls === null && systemDark);
    var el = document.documentElement;
    if (shouldDark) el.classList.add('dark'); else el.classList.remove('dark');
  } catch (_) {}
})();
            `.trim(),
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <WebVitalsLogger />
        {children}
        <ToastContainer
          position="top-right"
          autoClose={3500}
          newestOnTop
          closeOnClick
          pauseOnHover
          draggable
        />
      </body>
    </html>
  );
}
