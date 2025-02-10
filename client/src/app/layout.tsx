import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cerdential Issuer Service",
  description: "Cerdential Issuer Service",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
