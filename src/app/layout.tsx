import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "API Balance Tracker",
  description: "统一查询与管理 AI 模型 API 余额及用量",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full bg-background text-foreground font-sans">
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: { fontSize: 13 },
          }}
        />
      </body>
    </html>
  );
}
