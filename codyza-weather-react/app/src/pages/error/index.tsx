import React from 'react';
import { Link } from 'react-router-dom';
import styles from './css/styles.module.css';

const ErrorPage = () => {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.code}>404</p>
        <h1 className={styles.title}>Something went wrong</h1>
        <p className={styles.description}>
          The page you requested does not exist or is temporarily unavailable.
        </p>
        <div className={styles.actions}>
          <Link className={styles.primaryAction} to="/">
            Back to home
          </Link>
          <Link className={styles.secondaryAction} to="/login">
            Go to login
          </Link>
        </div>
      </section>
    </main>
  );
};

export default ErrorPage;