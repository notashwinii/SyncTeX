'use client';

import { useWorkspaceMembers } from '@/lib/query/queries/workspace.queries';
import styles from './MembersList.module.css';

interface MembersListProps {
  workspaceId: string;
}

export default function MembersList({ workspaceId }: MembersListProps) {
  const { data: members, isLoading, error } = useWorkspaceMembers(workspaceId);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading members...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            <path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <p>Failed to load members</p>
        </div>
      </div>
    );
  }

  if (!members || members.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <path
              d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p>No members yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.list}>
        {members.map((member) => (
          <div key={member.id} className={styles.memberCard}>
            <div className={styles.avatar}>
              {member.user_id.substring(0, 2).toUpperCase()}
            </div>
            <div className={styles.info}>
              <div className={styles.userId}>{member.user_id}</div>
              <div className={styles.role}>
                <span className={`${styles.roleBadge} ${styles[member.role]}`}>
                  {member.role}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
