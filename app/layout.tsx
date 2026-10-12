import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "../components/storefront/cart-context";

export const metadata: Metadata = {
  title: {
    default: "Libaas Online — Your shop, dressed for the internet",
    template: "%s | Libaas Online",
  },
  description:
    "A polished online storefront for independent fashion sellers in Pakistan.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-PK" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
