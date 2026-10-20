
import Link from "next/link";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          Shivay<span>Tech</span><i>.</i>
        </Link>

        <p className={styles.tagline}>
          Digital experiences built with purpose.
        </p>

        <p className={styles.copyright}>
          © 2026 ShivayTech. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
