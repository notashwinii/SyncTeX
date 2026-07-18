import Image from "next/image";
import SignUpForm from '@/components/Auth/SignUpForm';
import styles from './signup.module.css';

const SignUpPage = () => {
  return (
    <div className={styles.container}>
      <div className={styles.logo}>
        <Image src="/SyncTex.png" alt="SyncTeX" width={180} height={38} />
      </div>
      <SignUpForm />
    </div>
  );
};

export default SignUpPage;