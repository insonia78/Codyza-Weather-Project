import React from "react";
import { Form, Link, useActionData, useNavigation, useSearchParams } from 'react-router-dom';
import type { ResetPasswordActionData } from './route';
import styles from './css/styles.module.css';
import { CodyzaBranding } from '../../components/CodyzaBranding';



const ResetPassword = () => {
  const actionData = useActionData() as ResetPasswordActionData | undefined;
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();
  const errors = actionData?.errors ?? [];
  const isSubmitting = navigation.state === 'submitting';
  const token = searchParams.get('token')?.trim() ?? '';
  const isConfirmingPasswordReset = Boolean(token);
  const isCompleted = Boolean(actionData?.completed);



  return (
    <main className={styles.page}>
      <section className={styles.card}>
      <CodyzaBranding compact showPoweredBy={false} />
      <p className={styles.eyebrow}>Account recovery</p>
      <h1 className={styles.title}>{isConfirmingPasswordReset ? 'Choose a New Password' : 'Reset Password'}</h1>
      <p className={styles.description}>
        {isConfirmingPasswordReset
          ? 'Enter and confirm your new password to finish resetting your Codyza Weather account.'
          : 'Enter your email and we will guide you back into your account. Administrator emails are redirected to the Codyza Weather administration password setup flow.'}
      </p>
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
      {actionData?.previewUrl && (
        <div className={styles.successBox}>
          <p>Password reset email preview:</p>
          <a href={actionData.previewUrl}>Open password reset link</a>
        </div>
      )}
      {!isCompleted && <Form className={styles.form} method="post" noValidate>
        {isConfirmingPasswordReset ? (
          <>
            <input type="hidden" name="token" value={token} />
            <label className={styles.field} htmlFor="password">
              <span>New password</span>
              <input type="password" id="password" name="password" defaultValue={actionData?.values?.password ?? ''} required />
            </label>
            <label className={styles.field} htmlFor="confirmPassword">
              <span>Confirm new password</span>
              <input type="password" id="confirmPassword" name="confirmPassword" defaultValue={actionData?.values?.confirmPassword ?? ''} required />
            </label>
          </>
        ) : (
          <label className={styles.field} htmlFor="email">
            <span>Email</span>
            <input type="email" id="email" name="email" defaultValue={actionData?.values?.email ?? ''} required />
          </label>
        )}
        <button className={styles.submitButton} type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? 'Submitting...'
            : isConfirmingPasswordReset
              ? 'Save New Password'
              : 'Send Reset Link'}
        </button>
      </Form>}
      <div className={styles.footerLinks}>
        <Link to="/login">Back to login</Link>
        {!isConfirmingPasswordReset && <Link to="/registration">Create account</Link>}
      </div>
      <p className={styles.poweredBy}>Powered by Codyza</p>
      </section>
    </main>
  );
};

export default ResetPassword;