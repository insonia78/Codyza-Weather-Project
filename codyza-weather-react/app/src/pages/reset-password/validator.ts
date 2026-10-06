import * as yup from 'yup';

export const requestResetPasswordSchema = yup.object({
  email: yup.string().email('Invalid email format').required('Email is required'),
});

export const confirmResetPasswordSchema = yup.object({
  token: yup.string().required('Password reset token is required'),
  password: yup.string().min(8, 'Password must be at least 8 characters').required('Password is required'),
  confirmPassword: yup.string()
    .oneOf([yup.ref('password'), undefined], 'Passwords must match')
    .required('Confirm Password is required'),
});
