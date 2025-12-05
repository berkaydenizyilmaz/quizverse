"use client";

import localFont from "next/font/local";
import "./globals.css";
import Header from "@/components/Header";
import { AuthProvider } from "@/contexts/AuthContext";
import { usePathname } from "next/navigation";
import Footer from "@/components/Footer";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/toaster";
import AdminSidebar from "@/components/AdminSidebar";

// Font tanımlamaları
const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});

// Layout props tipi
interface RootLayoutProps {
  children: React.ReactNode;
}

// Layout bileşeni
export default function RootLayout({ children }: RootLayoutProps) {
  const pathname = usePathname();

  // Sayfa tipini belirle
  const isAuthPage = pathname.startsWith("/auth");
  const isAdminPage = pathname.startsWith("/admin");

  // Admin sayfası için özel stil sınıfları
  const adminPageClasses = isAdminPage
    ? "bg-gradient-to-br from-orange-50 via-white to-orange-50"
    : "";
  const mainClasses = `
    flex-1 
    ${isAdminPage ? "p-8 min-h-[calc(100vh-4rem)]" : ""}
  `;

  return (
    <html lang="tr">
      <head>
        <title>QuizVerse</title>
        <meta
          name="description"
          content="Bilgi yarışması ile kendinizi test edin ve eğlenin!"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans`}>
        <AuthProvider>
          <Providers>
            <div className="flex flex-col min-h-screen">
              {/* Header - Auth sayfalarında gösterme */}
              {!isAuthPage && (
                <header className="flex-shrink-0">
                  <Header />
                </header>
              )}

              {/* Ana içerik alanı */}
              <div className={adminPageClasses}>
                <div className="flex">
                  {/* Admin sidebar - sadece admin sayfalarında göster */}
                  {isAdminPage && <AdminSidebar />}

                  {/* Ana içerik */}
                  <main className={mainClasses}>{children}</main>
                </div>
              </div>

              {/* Footer - Auth sayfalarında gösterme */}
              {!isAuthPage && (
                <footer className="flex-shrink-0">
                  <Footer />
                </footer>
              )}
            </div>

            {/* Toast bildirimleri */}
            <Toaster />
          </Providers>
        </AuthProvider>
      </body>
    </html>
  );
}
