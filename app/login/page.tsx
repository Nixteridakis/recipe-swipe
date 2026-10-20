import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Sign In | Brasserie",
  description: "Sign in to your private recipe collection.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const destination = next?.startsWith("/") && !next.startsWith("//") ? next : "/";
  return <LoginForm destination={destination} />;
}
