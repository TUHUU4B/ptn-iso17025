import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Quản lý phòng thí nghiệm – ISO/IEC 17025',
  description: 'Ứng dụng quản lý phòng thí nghiệm theo TCVN ISO/IEC 17025:2017',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-slate-50 text-slate-800 antialiased">{children}</body>
    </html>
  );
}
