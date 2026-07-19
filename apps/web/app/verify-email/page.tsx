import { Suspense } from 'react';
import VerifyEmailStatus from '@/components/Auth/VerifyEmailStatus';

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailStatus />
    </Suspense>
  );
}
