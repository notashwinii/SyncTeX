'use client';

import { useState } from 'react';
import CreateWorkspaceModal from '@/components/Workspace/CreateWorkspaceModal';
import styles from "@/components/Projects/projects.module.css";

const SideBar = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  return (
    <div>
      <button 
        className={styles.newProjectBtn}
        onClick={() => setIsCreateModalOpen(true)}
      >
        New Workspace
      </button>
      <nav>
        <ul className={styles.navList}>
          <li 
            className={`${styles.navItem} ${activeTab === 'all' ? styles.active : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All projects
          </li>
          <li 
            className={`${styles.navItem} ${activeTab === 'your' ? styles.active : ''}`}
            onClick={() => setActiveTab('your')}
          >
            Your projects
          </li>
          <li 
            className={`${styles.navItem} ${activeTab === 'shared' ? styles.active : ''}`}
            onClick={() => setActiveTab('shared')}
          >
            Shared with you
          </li>
        </ul>
      </nav>

      <CreateWorkspaceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
};

export default SideBar;
