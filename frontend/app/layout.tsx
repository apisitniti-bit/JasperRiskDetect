import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JasperRiskDetect",
  description: "ระบบวิเคราะห์ความเสี่ยง JasperReports สำหรับ iReport 3.7.1",
  icons: {
    icon: "/favicon.svg",
    apple: "/apple-touch-icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className="dark">
      <body className="bg-ide-bg text-ide-text font-thai antialiased">
        {children}
      </body>
    </html>
  );
}
