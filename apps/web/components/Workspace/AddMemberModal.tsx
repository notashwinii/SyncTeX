'use client';

import { useState } from 'react';
import { useAddWorkspaceMember } from '@/lib/query/mutations/workspace.mutations';
import { userApi } from '@/lib/api/endpoints/user';
import { workspaceApi } from '@/lib/api/endpoints/workspace';
import { UserSearchResult } from '@/types/user';
import styles from './AddMemberModal.module.css';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
}

export default function AddMemberModal({ isOpen, onClose, workspaceId }: AddMemberModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [selectedRole, setSelectedRole] = useState<'owner' | 'editor' | 'viewer'>('editor');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [showInviteOption, setShowInviteOption] = useState(false);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [inviteSuccessEmail, setInviteSuccessEmail] = useState('');

  const addMember = useAddWorkspaceMember(workspaceId);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchError('Please enter an email or username');
      return;
    }

    setIsSearching(true);
    setSearchError('');
    setShowInviteOption(false);
    
    try {
      // Try to search by email first
      if (searchQuery.includes('@')) {
        const user = await userApi.getUserByEmail(searchQuery.trim());
        if (user) {
          setSearchResults([user]);
          setSelectedUser(user);
          setShowInviteOption(false);
        } else {
          // User not found - show invitation option
          setSearchError(`No user found with email "${searchQuery.trim()}"`);
          setSearchResults([]);
          setShowInviteOption(true);
        }
      } else {
        // Search by username
        const users = await userApi.searchUsers(searchQuery.trim());
        if (users.length > 0) {
          setSearchResults(users);
          if (users.length === 1) {
            setSelectedUser(users[0]);
          }
          setShowInviteOption(false);
        } else {
          setSearchError('No users found matching your search');
          setSearchResults([]);
          setShowInviteOption(false);
        }
      }
    } catch (error) {
      setSearchError('Failed to search for users. Please try again.');
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendInvitation = async () => {
    if (!searchQuery.includes('@')) {
      setSearchError('Please enter a valid email address');
      return;
    }

    setIsSendingInvite(true);
    setSearchError('');
    try {
      await workspaceApi.sendInvitation(workspaceId, {
        email: searchQuery.trim(),
        role: selectedRole,
      });
      
      setInviteSuccess(true);
      setInviteSuccessEmail(searchQuery.trim());
      setSearchQuery('');
      setShowInviteOption(false);
      
      // Auto-close after 3 seconds
      setTimeout(() => {
        handleClose();
      }, 3000);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to send invitation';
      setSearchError(errorMessage);
      console.error('Send invitation error:', error);
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser) {
      setSearchError('Please select a user first');
      return;
    }

    try {
      await addMember.mutateAsync({
        user_id: selectedUser.id,
        role: selectedRole,
      });
      
      handleClose();
    } catch (error) {
      console.error('Failed to add member:', error);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedUser(null);
    setSelectedRole('editor');
    setSearchError('');
    setShowInviteOption(false);
    setIsSendingInvite(false);
    setInviteSuccess(false);
    setInviteSuccessEmail('');
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !selectedUser) {
      e.preventDefault();
      handleSearch();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Add Member to Workspace</h2>
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
            <label htmlFor="user-search">
              Search User <span className={styles.required}>*</span>
            </label>
            <div className={styles.searchWrapper}>
              <input
                id="user-search"
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchError('');
                }}
                onKeyPress={handleKeyPress}
                placeholder="Enter email or username"
                autoFocus
                disabled={isSearching || addMember.isPending}
              />
              <button
                type="button"
                className={styles.searchBtn}
                onClick={handleSearch}
                disabled={isSearching || addMember.isPending || !searchQuery.trim()}
              >
                {isSearching ? (
                  <span className={styles.spinner} />
                ) : (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="8.5" cy="8.5" r="5.75" stroke="currentColor" strokeWidth="1.5" />
                    <path d="m13 13 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                )}
              </button>
            </div>
            <p className={styles.hint}>
              Search by email address or username
            </p>
          </div>

          {searchError && (
            <div className={styles.errorMessage}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 4v4m0 3h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              {searchError}
            </div>
          )}

          {inviteSuccess && (
            <div className={styles.successMessage}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
                <path d="m6 10 2.5 2.5L14 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div>
                <strong>Invitation sent!</strong>
                <p>We&apos;ve sent an email invitation to <strong>{inviteSuccessEmail}</strong></p>
              </div>
            </div>
          )}

          {showInviteOption && (
            <div className={styles.inviteOption}>
              <p className={styles.inviteText}>
                User not found. Would you like to send an invitation to <strong>{searchQuery}</strong>?
              </p>
              <button
                type="button"
                className={styles.inviteBtn}
                onClick={handleSendInvitation}
                disabled={isSendingInvite}
              >
                {isSendingInvite ? (
                  <>
                    <span className={styles.spinner} />
                    Sending...
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path
                        d="M18.333 2.5 10 10.833m0 0L7.5 17.5 1.667 1.667 17.5 7.5 10.833 10Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Send Invitation
                  </>
                )}
              </button>
            </div>
          )}

          {searchResults.length > 1 && !selectedUser && (
            <div className={styles.field}>
              <label>Select User</label>
              <div className={styles.userList}>
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className={styles.userItem}
                    onClick={() => setSelectedUser(user)}
                  >
                    <div className={styles.userAvatar}>
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div className={styles.userInfo}>
                      <div className={styles.username}>{user.username}</div>
                      <div className={styles.userEmail}>{user.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedUser && (
            <div className={styles.selectedUser}>
              <div className={styles.selectedUserHeader}>
                <span>Selected User:</span>
                <button
                  type="button"
                  className={styles.clearBtn}
                  onClick={() => {
                    setSelectedUser(null);
                    setSearchResults([]);
                  }}
                >
                  Change
                </button>
              </div>
              <div className={styles.userItem}>
                <div className={styles.userAvatar}>
                  {selectedUser.username.charAt(0).toUpperCase()}
                </div>
                <div className={styles.userInfo}>
                  <div className={styles.username}>{selectedUser.username}</div>
                  <div className={styles.userEmail}>{selectedUser.email}</div>
                </div>
              </div>
            </div>
          )}

          {selectedUser && (
            <div className={styles.field}>
              <label htmlFor="member-role">
                Role <span className={styles.required}>*</span>
              </label>
              <select
                id="member-role"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as 'owner' | 'editor' | 'viewer')}
                disabled={addMember.isPending}
                className={styles.select}
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
                <option value="owner">Owner</option>
              </select>
              <p className={styles.hint}>
                <strong>Editor:</strong> Can edit all projects • 
                <strong>Viewer:</strong> Can only view projects • 
                <strong>Owner:</strong> Full control
              </p>
            </div>
          )}

          {addMember.isError && (
            <div className={styles.errorMessage}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 4v4m0 3h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              {addMember.error instanceof Error
                ? addMember.error.message
                : 'Failed to add member'}
            </div>
          )}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={handleClose}
              disabled={addMember.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={addMember.isPending || !selectedUser}
            >
              {addMember.isPending ? (
                <>
                  <span className={styles.spinner} />
                  Adding...
                </>
              ) : (
                'Add Member'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
