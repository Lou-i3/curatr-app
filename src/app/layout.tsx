import type { Metadata } from "next";
import { Nunito, Lora, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppBar } from "@/components/app-bar";
import { Toaster } from "@/components/ui/sonner";
import { TaskProvider } from "@/lib/contexts/task-context";
import { IssueProvider } from "@/lib/contexts/issue-context";
import { AuthProvider } from "@/lib/contexts/auth-context";
import { getSession, isAuthEnabled } from "@/lib/auth";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Curatr App",
  description:
    "Track media file quality, playback compatibility, and maintenance status",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Curatr",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Determine if sidebar should be shown
  // Hidden when auth is enabled but user has no session (login page)
  const authEnabled = isAuthEnabled();
  const session = await getSession();
  const showSidebar = !authEnabled || session !== null;

  return (
    <html lang="en">
      <body
        className={`${nunito.variable} ${lora.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <TaskProvider>
            <IssueProvider>
              {showSidebar ? (
                <SidebarProvider className="flex-col">
                  <AppBar />
                  <div className="flex flex-1 pt-12">
                    <AppSidebar />
                    <SidebarInset className="p-4 md:p-6">
                      {children}
                    </SidebarInset>
                  </div>
                </SidebarProvider>
              ) : (
                children
              )}
            </IssueProvider>
          </TaskProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
