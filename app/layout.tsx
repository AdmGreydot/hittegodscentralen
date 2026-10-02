import type { Metadata } from "next";
import { Abhaya_Libre, Outfit } from "next/font/google";
import { getCurrentUser } from "../lib/auth";
import { AuthModalProvider } from "./components/auth/AuthModal";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const abhayaLibre = Abhaya_Libre({
  variable: "--font-abhaya-libre",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Hittegodscentralen",
  description: "Den hurtigste vej mellem taber og finder",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  return (
    <html
      lang="da"
      className={`${outfit.variable} ${abhayaLibre.variable} h-full scroll-smooth motion-reduce:scroll-auto antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthModalProvider>
          <Navbar user={user && { fullName: user.fullName, email: user.email }} />
          {children}
          <Footer />
        </AuthModalProvider>
      </body>
    </html>
  );
}
