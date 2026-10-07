import React from "react";
import { Form, Link, useActionData, useNavigation } from 'react-router-dom';
import { useCallback, useState } from "react";
import type { LoginActionData } from './route';
import styles from './css/styles.module.css';
import { CodyzaBranding } from '../../components/CodyzaBranding';
import { TurnstileWidget } from "../../components/TurnstileWidget";

const Login = () => {  
  const actionData = useActionData() as LoginActionData | undefined;
  const navigation = useNavigation();
  const errors = actionData?.errors ?? [];
  const isSubmitting = navigation.state === 'submitting';
  const [turnstileToken, setTurnstileToken] = useState('');
  const handleTurnstileTokenChange = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);
    
  return (
    <main className={styles.page}>
      <section className={styles.card}>
      <CodyzaBranding compact showPoweredBy={false} />
      <p className={styles.eyebrow}>Welcome back</p>
      <h1 className={styles.title}>Sign in</h1>
      <p className={styles.description}>Access your saved locations, alerts, and personalized Codyza Weather experience.</p>
      {errors.length > 0 && (
        <div className={styles.errorBox}>
          <h2>Validation Errors:</h2>
          <ul>
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      {actionData?.success && (
        <div className={styles.successBox}>{actionData.success}</div>
      )}
      <Form className={styles.form} method="post" noValidate>
        <label className={styles.field} htmlFor="email">
          <span>Email</span>
          <input type="email" id="email" name="email" defaultValue={actionData?.values?.email ?? ''} required />
        </label>
        <label className={styles.field} htmlFor="password">
          <span>Password</span>
          <input type="password" id="password" name="password" required />
        </label>
        <input type="hidden" name="turnstileToken" value={turnstileToken} />
        <div className={styles.securityCheck}>
          <span className={styles.securityLabel}>Security check</span>
          <TurnstileWidget
            siteKey={process.env.REACT_APP_TURNSTILE_SITE_KEY ?? ''}
            onTokenChange={handleTurnstileTokenChange}
            containerClassName={styles.turnstileWidget}
            warningClassName={styles.securityWarning}
          />
        </div>
        <button className={styles.submitButton} type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Login'}
        </button>
      </Form>
      <div className={styles.footerLinks}>
        <Link to="/registration">Create an account</Link>
        <Link to="/reset-password">Forgot password?</Link>
      </div>
      <p className={styles.poweredBy}>Powered by Codyza</p>
      </section>
    </main>
  );
};

export default Login;