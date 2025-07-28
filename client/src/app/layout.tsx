import type { Metadata } from "next";

// メタデータ定義
// このページのメタ情報（ブラウザのタブに表示されるタイトルなど）を設定します。
export const metadata: Metadata = {
  title: "Credential Issuer Service",
  description: "Credential Issuer Service",
};

// ルートレイアウトコンポーネント
/**
 * このアプリケーションの全ページに適用される基本的なHTML構造を定義するコンポーネントです。
 * @param children - Next.jsによって渡される、各ページコンポーネントの内容
 */
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
