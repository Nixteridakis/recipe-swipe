"use client";

import { useState, type FormEvent } from "react";
import { AppIcon } from "@/app/AppIcon";
import { formatFailedFetchMessage } from "@/lib/api-error-message";
import styles from "./page.module.css";

export function LoginForm({ destination }: { destination: string }) {
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const body = await response.text();
      if (!response.ok) {
        setError(formatFailedFetchMessage(body, response.status));
        return;
      }
      window.location.assign(destination);
    } catch {
      setError("The application could not be reached. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <div className={styles.brand}>Brasserie</div>
        <div className={styles.illustration} aria-hidden>
          <span className={styles.orbit} />
          <AppIcon name="chef-hat" className={styles.chefIcon} />
        </div>
        <div className={styles.copy}>
          <span className={styles.kicker}>Private kitchen</span>
          <h1>Your recipes,<br />behind closed doors.</h1>
          <p>Enter the shared password to open the collection.</p>
        </div>
        <form className={styles.form} onSubmit={submit}>
          <label>
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              autoFocus
              required
            />
          </label>
          <button type="submit" disabled={isSubmitting || !password}>
            {isSubmitting ? "Opening..." : "Enter Brasserie"}
            <AppIcon name="arrow-right" />
          </button>
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
        </form>
      </section>
    </main>
  );
}
