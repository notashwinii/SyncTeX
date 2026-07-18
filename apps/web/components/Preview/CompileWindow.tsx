'use client'
import React, { useEffect, useRef } from 'react';
import styles from '@/components/Preview/preview.module.css';
import Mains from '../Parser/ui/Client';
import ErrorBoundary from '../Parser/ui/ErrorBoundary';

interface PreviewWindowProps {
    inputText: string;
    shouldRender: boolean;
    validationErrors?: string[];
}

const PreviewWindow: React.FC<PreviewWindowProps> = ({ inputText, shouldRender, validationErrors = [] }) => {
    const previewRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const scaleToFit = () => {
            if (!previewRef.current) return;

            const previewRect = previewRef.current.getBoundingClientRect();
            const previewWidth = previewRect.width - 40; // Account for padding
            const previewHeight = previewRect.height - 80; // Account for padding and toolbar

            // A4 dimensions in pixels (assuming 96 DPI)
            const a4WidthPx = 210 * 3.78; // 210mm in pixels
            const a4HeightPx = 297 * 3.78; // 297mm in pixels

            // Calculate scale factors
            const scaleX = previewWidth / a4WidthPx;
            const scaleY = previewHeight / a4HeightPx;
            
            // Use the smaller scale to ensure entire page fits
            const scale = Math.min(scaleX, scaleY, 1); // Never scale up, only down

            // Apply scale to all page wrappers
            const pageWrappers = previewRef.current.querySelectorAll('.page-wrapper');
            pageWrappers.forEach((wrapper: Element) => {
                const element = wrapper as HTMLElement;
                element.style.transform = `scale(${scale})`;
                element.style.transformOrigin = 'top center';
                
                // Adjust margin to prevent overlap
                const scaledHeight = a4HeightPx * scale;
                element.style.marginBottom = `${scaledHeight - a4HeightPx + 20}px`;
            });

            // Update container to center content
            const container = previewRef.current.querySelector('.latex-document-container') as HTMLElement;
            if (container) {
                container.style.paddingTop = '20px';
                container.style.minHeight = '100%';
            }
        };

        // Scale on mount and window resize
        if (shouldRender && inputText) {
            const timer = setTimeout(scaleToFit, 100); // Allow DOM to settle
            window.addEventListener('resize', scaleToFit);
            
            return () => {
                clearTimeout(timer);
                window.removeEventListener('resize', scaleToFit);
            };
        }
    }, [shouldRender, inputText]);

    // Show validation errors if present
    if (validationErrors.length > 0) {
        return (
            <div className={styles.window}>
                <div style={{
                    padding: '20px',
                    backgroundColor: '#fff5f5',
                    height: '100%',
                    overflow: 'auto'
                }}>
                    <div style={{
                        width: '100%',
                        backgroundColor: 'white',
                        border: '2px solid #ef4444',
                        borderRadius: '12px',
                        padding: '20px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            marginBottom: '16px',
                            color: '#ef4444'
                        }}>
                            <span style={{ fontSize: '24px', marginRight: '12px' }}>⚠️</span>
                            <h2 style={{ 
                                fontSize: '18px', 
                                fontWeight: '600', 
                                margin: 0,
                                color: '#ef4444'
                            }}>
                                LaTeX Compilation Errors
                            </h2>
                        </div>
                        
                        <p style={{ 
                            marginBottom: '16px', 
                            color: '#666',
                            fontSize: '14px'
                        }}>
                            Fix these errors to see your document preview:
                        </p>
                        
                        <div style={{
                            maxHeight: 'calc(100vh - 300px)',
                            overflowY: 'auto',
                            paddingRight: '8px'
                        }}>
                            <ul style={{
                                listStyle: 'none',
                                padding: 0,
                                margin: 0
                            }}>
                                {validationErrors.map((error, index) => (
                                    <li key={index} style={{
                                        display: 'block',
                                        marginBottom: '12px',
                                        padding: '12px',
                                        backgroundColor: '#fef2f2',
                                        borderRadius: '8px',
                                        border: '1px solid #fecaca'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '8px'
                                        }}>
                                            <span style={{
                                                color: '#ef4444',
                                                fontWeight: 'bold',
                                                fontSize: '16px',
                                                flexShrink: 0,
                                                marginTop: '2px'
                                            }}>•</span>
                                            <span style={{ 
                                                color: '#7f1d1d', 
                                                fontSize: '13px',
                                                lineHeight: '1.5',
                                                fontFamily: 'system-ui, -apple-system, sans-serif',
                                                wordBreak: 'break-word',
                                                flex: 1
                                            }}>
                                                {error}
                                            </span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        
                        <div style={{
                            marginTop: '20px',
                            padding: '12px',
                            backgroundColor: '#f0f9ff',
                            borderRadius: '8px',
                            border: '1px solid #bae6fd'
                        }}>
                            <p style={{
                                margin: 0,
                                fontSize: '13px',
                                color: '#0c4a6e',
                                display: 'flex',
                                alignItems: 'center'
                            }}>
                                <span style={{ marginRight: '8px' }}>💡</span>
                                <strong>Tip:</strong> Click &quot;Compile&quot; after fixing errors to refresh the preview
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Show rendered content if no errors
    if (shouldRender && inputText) {
        return (
            <div ref={previewRef} className={styles.window}>
                <ErrorBoundary>
                    <Mains input={inputText} />
                </ErrorBoundary>
            </div>
        );
    } else {
        return (
            <div className={styles.window}>
                <div style={{
                    padding: '40px',
                    textAlign: 'center',
                    color: '#666666',
                    fontSize: '16px',
                    backgroundColor: '#ffffff',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <p style={{ fontSize: '24px', marginBottom: '8px' }}>📝</p>
                    <p style={{ marginBottom: '8px', fontSize: '16px', color: '#333' }}>
                        Ready to compile
                    </p>
                    <p style={{fontSize: '14px', marginTop: '10px', color: '#666666'}}>
                        Click &quot;Compile&quot; to see your LaTeX document preview
                    </p>
                </div>
            </div>
        );
    }
};

export default PreviewWindow;
