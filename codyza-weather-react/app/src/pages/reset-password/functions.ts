import schema from './validator';

export function validateResetPasswordForm(values: { email: string;}) : string[]{
  try {
    schema.validateSync(values, { abortEarly: false })
    return [] as string[]
  } catch (err: any) {
    if (err && Array.isArray(err.inner) && err.inner.length > 0) {
      const msgs = err.inner.map((e: any) => e.message).filter(Boolean)
      return Array.from(new Set(msgs))
    }
    return [err?.message || 'Validation failed']
  }
}