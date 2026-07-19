import { Suspense } from 'react';
import ResetPasswordForm from '@/components/Auth/ResetPasswordForm';

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
