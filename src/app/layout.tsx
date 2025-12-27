import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import { cookies } from "next/headers";
import "./globals.css";
import { Sidebar, SidebarProvider, MainContent } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Desk - US Equity Trading",
  description: "US Equity Quant Trading Visualization",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const sidebarCollapsed = cookieStore.get("sidebar-collapsed")?.value === "true";

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <ThemeProvider>
          <SidebarProvider initialCollapsed={sidebarCollapsed}>
            <div className="flex min-h-screen bg-background text-foreground">
              <Suspense fallback={null}>
                <Sidebar />
              </Suspense>
              <MainContent>
                <Suspense fallback={null}>
                  <Header />
                </Suspense>
                <main className="p-6">{children}</main>
              </MainContent>
            </div>
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
