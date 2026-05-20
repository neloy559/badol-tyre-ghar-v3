import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Phone, Lock, LogIn, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import BTGInput from '../atoms/BTGInput';
import BTGButton from '../atoms/BTGButton';
import './LoginForm.css';

const loginSchema = z.object({
  phone: z.string().min(11, 'Enter a valid phone number (min 11 digits)'),
  password: z.string().min(1, 'Password is required'),
});

const LoginForm = ({ onSuccess }) => {
  const { login } = useAuth();
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setServerError('');
    
    const result = await login(data.phone, data.password);
    
    if (result.success) {
      if (onSuccess) onSuccess();
    } else {
      setServerError(result.message);
    }
    setIsSubmitting(false);
  };

  return (
    <form className="btg-login-form" onSubmit={handleSubmit(onSubmit)}>
      <h2 className="btg-login-form__title">Welcome Back</h2>
      <p className="btg-login-form__subtitle">Enter your credentials to access B2B pricing</p>

      {serverError && (
        <div className="btg-login-form__alert btg-login-form__alert--error">
          {serverError}
        </div>
      )}

      <BTGInput
        label="Phone Number"
        placeholder="01712345678"
        icon={<Phone size={18} />}
        error={errors.phone?.message}
        {...register('phone')}
      />

      <BTGInput
        label="Password"
        type="password"
        placeholder="••••••••"
        icon={<Lock size={18} />}
        error={errors.password?.message}
        {...register('password')}
      />

      <div className="btg-login-form__actions">
        <BTGButton
          type="submit"
          variant="primary"
          className="btg-login-form__submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <span className="btg-login-form__loading">
              <Loader2 className="btg-login-form__spinner" /> Logging in...
            </span>
          ) : (
            <span className="btg-login-form__btn-content">
              <LogIn size={20} /> Login
            </span>
          )}
        </BTGButton>
      </div>

      <div className="btg-login-form__footer">
        <a href="#forgot" className="btg-login-form__link">Forgot Password?</a>
      </div>
    </form>
  );
};

export default LoginForm;
