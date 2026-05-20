import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Phone, Lock, UserPlus, Loader2, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';
import BTGInput from '../atoms/BTGInput';
import BTGButton from '../atoms/BTGButton';
import './RegisterForm.css';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(11, 'Enter a valid phone number (min 11 digits)'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const RegisterForm = ({ onToggleLogin }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setServerError('');
    
    try {
      await api.post('/auth/register', {
        name: data.name,
        phone: data.phone,
        password: data.password,
      });
      setIsSuccess(true);
    } catch (err) {
      setServerError(err.response?.data?.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="btg-register-form btg-register-form--success">
        <div className="btg-register-form__success-icon">
          <CheckCircle2 size={64} color="#10b981" />
        </div>
        <h2 className="btg-register-form__title">Welcome to the Network!</h2>
        <p className="btg-register-form__subtitle">
          Your account has been created. Please log in to continue.
        </p>
        <BTGButton 
          variant="primary" 
          className="btg-register-form__submit"
          onClick={onToggleLogin}
        >
          Go to Login
        </BTGButton>
      </div>
    );
  }

  return (
    <form className="btg-register-form" onSubmit={handleSubmit(onSubmit)}>
      <h2 className="btg-register-form__title">Create Account</h2>
      <p className="btg-register-form__subtitle">Join the #1 Tyre Wholesale Network in BD</p>

      {serverError && (
        <div className="btg-register-form__alert btg-register-form__alert--error">
          {serverError}
        </div>
      )}

      <BTGInput
        label="Full Name"
        placeholder="Enter your name"
        icon={<User size={18} />}
        error={errors.name?.message}
        {...register('name')}
      />

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
        placeholder="Create a strong password"
        icon={<Lock size={18} />}
        error={errors.password?.message}
        {...register('password')}
      />

      <BTGInput
        label="Confirm Password"
        type="password"
        placeholder="Repeat your password"
        icon={<Lock size={18} />}
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />

      <div className="btg-register-form__actions">
        <BTGButton
          type="submit"
          variant="primary"
          className="btg-register-form__submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <span className="btg-register-form__loading">
              <Loader2 className="btg-register-form__spinner" /> Creating Account...
            </span>
          ) : (
            <span className="btg-register-form__btn-content">
              <UserPlus size={20} /> Register
            </span>
          )}
        </BTGButton>
      </div>

      <div className="btg-register-form__footer">
        <p>Already have an account? <button type="button" onClick={onToggleLogin} className="btg-register-form__text-btn">Login</button></p>
      </div>
    </form>
  );
};

export default RegisterForm;
