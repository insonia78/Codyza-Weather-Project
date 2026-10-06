import React from "react";
import { Form, Link, useActionData, useNavigation } from 'react-router-dom';
import type { ResetPasswordActionData } from './route';
import styles from './css/styles.module.css';
import { CodyzaBranding } from '../../components/CodyzaBranding';



const ResetPassword = () => {
  const actionData = useActionData() as ResetPasswordActionData | undefined;
  const navigation = useNavigation();
  const errors = actionData?.errors ?? [];
  const isSubmitting = navigation.state === 'submitting';



  return (
    <main className={styles.page}>
      <section className={styles.card}>
      <CodyzaBranding compact showPoweredBy={false} />
      <p className={styles.eyebrow}>Account recovery</p>
      <h1 className={styles.title}>Reset Password</h1>
      <p className={styles.description}>Enter your email and we will guide you back into your account. Administrator emails are redirected to the Codyza Weather administration password setup flow.</p>
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
        <button className={styles.submitButton} type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Reset Password'}
        </button>
      </Form>
      <div className={styles.footerLinks}>
        <Link to="/login">Back to login</Link>
        <Link to="/registration">Create account</Link>
      </div>
      <p className={styles.poweredBy}>Powered by Codyza</p>
      </section>
    </main>
  );
};

export default ResetPassword;