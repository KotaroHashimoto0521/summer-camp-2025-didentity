import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Credential Issuer Service",
  description: "Credential Issuer Service",
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
