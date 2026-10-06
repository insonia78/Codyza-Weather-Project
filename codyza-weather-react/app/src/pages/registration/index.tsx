import React from "react";
import { Form, Link, useActionData, useNavigation } from 'react-router-dom';
import type { RegistrationActionData } from './route';
import styles from './css/styles.module.css';
import { CodyzaBranding } from '../../components/CodyzaBranding';
const Registration = () => {    
  const actionData = useActionData() as RegistrationActionData | undefined;
  const navigation = useNavigation();
  const errors = actionData?.errors ?? [];
  const isSubmitting = navigation.state === 'submitting';



  return (
    <main className={styles.page}>
      <section className={styles.card}>
      <CodyzaBranding compact showPoweredBy={false} />
      <p className={styles.eyebrow}>Join Codyza Weather</p>
      <h1 className={styles.title}>Registration</h1>
      <p className={styles.description}>Create your account to save locations and alerts.</p>
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
        <label className={styles.field} htmlFor="confirmPassword">
          <span>Confirm Password</span>
          <input type="password" id="confirmPassword" name="confirmPassword" required />
        </label>
        <button className={styles.submitButton} type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Register'}
        </button>
      </Form>
      <div className={styles.footerLinks}>
        <Link to="/login">Already have an account?</Link>
      </div>
      <p className={styles.poweredBy}>Powered by Codyza</p>
      </section>
    </main>
  );
};

export default Registration;