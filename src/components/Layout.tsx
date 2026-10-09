import { useEffect } from 'react';
import { Link, Outlet, ScrollRestoration, useLocation } from 'react-router';
import Disclaimer from './Disclaimer';
import styles from './Layout.module.css';

export default function Layout() {
  const { hash } = useLocation();

  // Client-side links to "/#signup" don't scroll on their own.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  return (
    <>
      <header className={`${styles.header} wrap`}>
        <Link to="/" className={styles.brand} viewTransition>
          AI Tri Coach
        </Link>
        <nav aria-label="Main" className={styles.nav}>
          <Link to="/kit" viewTransition>Starter kit</Link>
          <Link to="/#signup">Newsletter</Link>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className={`${styles.footer} wrap stack`}>
        <Disclaimer />
        <p className="muted">&copy; {new Date().getFullYear()} James Rozy</p>
      </footer>
      <ScrollRestoration />
    </>
  );
}
