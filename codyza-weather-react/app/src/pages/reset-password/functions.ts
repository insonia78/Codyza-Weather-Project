import { confirmResetPasswordSchema, requestResetPasswordSchema } from './validator';

function mapValidationError(err: any): string[] {
  if (err && Array.isArray(err.inner) && err.inner.length > 0) {
    const msgs = err.inner.map((entry: any) => entry.message).filter(Boolean);
    return Array.from(new Set(msgs));
  }

  return [err?.message || 'Validation failed'];
}

export function validateResetPasswordRequestForm(values: { email: string }): string[] {
  try {
    requestResetPasswordSchema.validateSync(values, { abortEarly: false });
    return [];
  } catch (err: any) {
    return mapValidationError(err);
  }
}

export function validateResetPasswordConfirmForm(values: {
  token: string;
  password: string;
  confirmPassword: string;
}): string[] {
  try {
    confirmResetPasswordSchema.validateSync(values, { abortEarly: false });
    return [];
  } catch (err: any) {
    return mapValidationError(err);
  }
}
