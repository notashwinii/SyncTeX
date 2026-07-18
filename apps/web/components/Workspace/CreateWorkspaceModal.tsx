'use client';

import { useState } from 'react';
import { useCreateWorkspace } from '@/lib/query/mutations/workspace.mutations';
import styles from './CreateWorkspaceModal.module.css';

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateWorkspaceModal({ isOpen, onClose }: CreateWorkspaceModalProps) {
  const [name, setName] = useState('');
  const createWorkspace = useCreateWorkspace();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;

    try {
      await createWorkspace.mutateAsync({
        name: name.trim(),
      });
      
      setName('');
      onClose();
    } catch (error) {
      console.error('Failed to create workspace:', error);
    }
  };

  const handleClose = () => {
    setName('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Create Workspace</h2>
          <button
            className={styles.closeBtn}
            onClick={handleClose}
            aria-label="Close modal"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 6 6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="workspace-name">
              Name <span className={styles.required}>*</span>
            </label>
            <input
              id="workspace-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome Workspace"
              required
              autoFocus
              disabled={createWorkspace.isPending}
            />
          </div>

          {createWorkspace.isError && (
            <div className={styles.errorMessage}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 4v4m0 3h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              {createWorkspace.error instanceof Error
                ? createWorkspace.error.message
                : 'Failed to create workspace'}
            </div>
          )}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={handleClose}
              disabled={createWorkspace.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={createWorkspace.isPending || !name.trim()}
            >
              {createWorkspace.isPending ? (
                <>
                  <span className={styles.spinner} />
                  Creating...
                </>
              ) : (
                'Create Workspace'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
