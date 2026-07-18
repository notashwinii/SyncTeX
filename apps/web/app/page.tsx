'use client';

import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !isLoading) {
      router.push('/workspaces');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <div className={styles.loader}>Loading...</div>
        </main>
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className={styles.page}>
      {/* Navigation */}
      <nav className={styles.nav}>
        <div className={styles.navContainer}>
          <div className={styles.navBrand}>
            <Image
              src="/SyncTex.png"
              alt="SyncTeX"
              width={140}
              height={30}
              priority
            />
          </div>
          <div className={styles.navLinks}>
            <Link href="/login" className={styles.navLink}>
              Sign In
            </Link>
            <Link href="/signup" className={styles.navLinkPrimary}>
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            {/* Floating particles background */}
            <div className={styles.particlesContainer}>
              <div className={styles.particle}></div>
              <div className={styles.particle}></div>
              <div className={styles.particle}></div>
              <div className={styles.particle}></div>
              <div className={styles.particle}></div>
            </div>

          

            <h1 className={styles.heroTitle}>
              Write LaTeX,
              <br />
              <span className={styles.gradient}>Collaborate Instantly</span>
            </h1>
            
            <p className={styles.heroSubtitle}>
              The modern LaTeX editor built for teams. Write, compile, and preview documents together in real-time.
            </p>

         

            <div className={styles.heroCta}>
              <Link href="/signup" className={styles.ctaButton}>
                <span className={styles.ctaButtonText}>Start Writing Free</span>
                <svg className={styles.arrowIcon} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <span className={styles.buttonShine}></span>
              </Link>
              <Link href="/login" className={styles.ctaSecondary}>
                <span>Already have an account?</span>
                <svg className={styles.secondaryArrow} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </Link>
            </div>

         
           
          </div>

          {/* Animated Code Preview Mockup */}
          <div className={styles.previewMockup}>
            <div className={styles.mockupWindow}>
              <div className={styles.mockupHeader}>
                <div className={styles.mockupDots}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <div className={styles.mockupTitle}>document.tex</div>
              </div>
              <div className={styles.mockupContent}>
                <div className={styles.codeLine}>
                  <span className={styles.codeComment}>% Your LaTeX document</span>
                </div>
                <div className={styles.codeLine}>
                  <span className={styles.codeKeyword}>\documentclass</span>
                  <span className={styles.codeText}>{'{'}article{'}'}</span>
                </div>
                <div className={styles.codeLine}>
                  <span className={styles.codeKeyword}>\begin</span>
                  <span className={styles.codeText}>{'{'}document{'}'}</span>
                </div>
                <div className={styles.codeLine}>
                  <span className={styles.codeKeyword}>\section</span>
                  <span className={styles.codeText}>{'{'}Introduction{'}'}</span>
                </div>
                <div className={styles.codeLine}>
                  <span className={styles.codeText}>Real-time collaboration...</span>
                  <span className={styles.cursor}></span>
                </div>
              </div>
            </div>
          </div>
        </section>

       

        {/* CTA Section */}
        <section className={styles.ctaSection}>
          <div className={styles.ctaSectionContent}>
            <h2 className={styles.ctaTitle}>Ready to elevate your LaTeX workflow?</h2>
            <p className={styles.ctaText}>
              Join the community of researchers, students, and teams creating beautiful documents together.
            </p>
            <Link href="/signup" className={styles.ctaButtonLarge}>
              <span>Get Started — It's Free</span>
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </Link>
            <p className={styles.ctaNote}>Free forever for personal use</p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContainer}>
          <p className={styles.footerText}>
            © {new Date().getFullYear()} SyncTeX. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
