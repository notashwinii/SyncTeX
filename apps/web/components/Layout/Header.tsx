'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronDown, LogOut, Sun, Moon } from 'lucide-react';
import { PUBLIC_ROUTES } from '@/lib/config';
import styles from './Header.module.css';

export default function Header() {
  const pathname = usePathname();
  const isPublicRoute = PUBLIC_ROUTES.has(pathname);
  
  const { logout, isLogoutLoading, user } = useAuth({ fetchUser: !isPublicRoute });
  const { theme, toggleTheme } = useTheme();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isDropdownOpen]);

  if (isPublicRoute) {
    return null;
  }

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
    setIsDropdownOpen(false);
  };

  const handleThemeToggle = () => {
    toggleTheme();
    setIsDropdownOpen(false);
  };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          <h1>SyncTex</h1>
        </Link>
        <div className={styles.userSection}>
          {user && (
            <div className={styles.userDropdown} ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={styles.userButton}
                aria-label="User menu"
              >
                <div className={styles.userInfo}>
                  <div className={styles.userIcon}>
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <span className={styles.username}>{user.username}</span>
                </div>
                <ChevronDown 
                  className={`${styles.dropdownIcon} ${isDropdownOpen ? styles.rotated : ''}`} 
                  size={16} 
                />
              </button>
              
              {isDropdownOpen && (
                <div className={styles.dropdownMenu}>
                  <button
                    onClick={handleThemeToggle}
                    className={styles.dropdownItem}
                  >
                    {theme === 'light' ? (
                      <>
                        <Moon size={16} />
                        <span>Dark Mode</span>
                      </>
                    ) : (
                      <>
                        <Sun size={16} />
                        <span>Light Mode</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleLogout}
                    disabled={isLogoutLoading}
                    className={`${styles.dropdownItem} ${styles.logoutItem}`}
                  >
                    <LogOut size={16} />
                    <span>{isLogoutLoading ? 'Logging out...' : 'Logout'}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
