import type { Metadata } from "next";
import "./globals.css";

import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";

export const metadata: Metadata = {
  title: {
    default: "ShivayTech | Web Development & Digital Services",
    template: "%s | ShivayTech",
  },
  description:
    "ShivayTech builds professional websites and provides digital services to help businesses grow online.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main>{children}</main>
        <Footer backgroundImage="/images/Footers.png" />
      </body>
    </html>
  );
}