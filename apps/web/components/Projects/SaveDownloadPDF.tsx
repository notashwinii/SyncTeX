import React, {useState} from 'react';
import styles from './SaveDownloadPDF.module.css';
import { useDownloadPDF, useSaveProject } from '@/lib/query/mutations/project.mutations';

interface SaveDownloadPDFProps {
    id: string;
    content: string;
    isSaving: boolean;
    isDownloading: boolean;
    getContent?: () => string; // Function to get current content
}

export const SaveDownloadPDF: React.FC<SaveDownloadPDFProps> = ({
    id,
    content,
    isSaving,
    isDownloading,
    getContent
}) => {

    const SaveProject = useSaveProject();
    const onDownload = useDownloadPDF();

    const handleSave = (id: string, content: string) => {
        // Get fresh content if getter is provided
        const contentToSave = getContent ? getContent() : content;
        SaveProject.mutate({
            id,
            content: contentToSave
        });
   };

   const handleDownload = (id: string) => {
        // Get fresh content if getter is provided
        const contentToDownload = getContent ? getContent() : content;
        
        if (!contentToDownload || contentToDownload.trim() === '') {
            alert('No content available to download');
            return;
        }
        
        onDownload.mutate({ id, content: contentToDownload });
   };

    return (
        <div className={styles.buttonContainer}>
       
        <div
        className={styles.toolbarButton}>
            <button
                onClick={() => handleSave(id, content)}
                disabled={isSaving}
                title="Save Project"
                
                >
                {isSaving ? 'Saving...' : 'Save Project'}
                </button>
        </div>
        </div>
    );
};