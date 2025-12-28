import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Import Recipe | Brasserie",
  description: "Parse recipe URLs and preview ingredients before adding them to Brasserie.",
};

export default function ImportLayout({ children }: { children: ReactNode }) {
  return children;
}
