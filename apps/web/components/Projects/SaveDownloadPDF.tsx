import React from 'react';
import styles from './SaveDownloadPDF.module.css';
import { useSaveProject } from '@/lib/query/mutations/project.mutations';

interface SaveDownloadPDFProps {
    id: string;
    content: string;
    getContent?: () => string;
}

export const SaveDownloadPDF: React.FC<SaveDownloadPDFProps> = ({
    id,
    content,
    getContent
}) => {

    const saveProject = useSaveProject();

    const handleSave = (id: string, content: string) => {
        // Get fresh content if getter is provided
        const contentToSave = getContent ? getContent() : content;
        saveProject.mutate({
            id,
            content: contentToSave
        });
   };

    return (
        <div className={styles.buttonContainer}>
       
        <div
        className={styles.toolbarButton}>
            <button
                onClick={() => handleSave(id, content)}
                disabled={saveProject.isPending}
                title="Save Project"
                
                >
                {saveProject.isPending ? 'Saving...' : 'Save Project'}
                </button>
        </div>
        </div>
    );
};
