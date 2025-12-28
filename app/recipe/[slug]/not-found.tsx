import Link from "next/link";
import styles from "./not-found.module.css";

export default function RecipeNotFound() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Recipe not found</h1>
      <Link href="/" className={styles.link}>
        Back to recipes
      </Link>
    </div>
  );
}
