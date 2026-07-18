import Image from "next/image";
import LoginForm from "@/components/Auth/LoginForm";
import styles from "./login.module.css";

export default function LoginPage() {
  return (
    <div className={styles.container}>
      <div className={styles.logoWrapper}>
        <Image src="/SyncTex.png" alt="Synctex Logo" width={224} height={48} />
      </div>
      <LoginForm />
    </div>
  );
}