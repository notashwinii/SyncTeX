import React, { ReactNode, useEffect, useState, useRef } from 'react';
import './documentLayout.css';

interface AutoPaginatedDocumentProps {
  children: ReactNode;
  showPageNumbers?: boolean;
}

export const AutoPaginatedDocument: React.FC<AutoPaginatedDocumentProps> = ({ 
  children, 
  showPageNumbers = true 
}) => {
  const [pages, setPages] = useState<ReactNode[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Simple approach: Split content when it exceeds page height
    const splitIntoPages = () => {
      if (!contentRef.current) return;
      
      // Get all child elements
      const elements = Array.from(contentRef.current.children);
      const newPages: ReactNode[] = [];
      let currentPageElements: ReactNode[] = [];
      let estimatedHeight = 0;
      
      // Approximate height per page (A4 minus margins)
      const maxPageHeight = 247; // 297mm - 50mm margins ≈ 247mm
      
      elements.forEach((element, index) => {
        // Estimate element height (simplified)
        const elementType = element.tagName?.toLowerCase() || '';
        let estimatedElementHeight = 0;
        
        switch (elementType) {
          case 'h1':
            estimatedElementHeight = 15; // ~15mm for h1
            break;
          case 'h2':
            estimatedElementHeight = 12; // ~12mm for h2
            break;
          case 'h3':
            estimatedElementHeight = 10; // ~10mm for h3
            break;
          case 'p':
            // Estimate based on text length
            const textLength = element.textContent?.length || 0;
            estimatedElementHeight = Math.max(6, Math.ceil(textLength / 80) * 5); // ~5mm per line
            break;
          case 'div':
            // Check if it's a math equation or other special div
            if (element.className?.includes('equation')) {
              estimatedElementHeight = 8; // ~8mm for equations
            } else {
              estimatedElementHeight = Math.max(4, Math.ceil((element.textContent?.length || 0) / 100) * 5);
            }
            break;
          case 'ul':
          case 'ol':
            const listItems = element.querySelectorAll('li').length;
            estimatedElementHeight = listItems * 6; // ~6mm per list item
            break;
          default:
            estimatedElementHeight = 5; // Default ~5mm
        }
        
        // If adding this element would exceed page height, start new page
        if (estimatedHeight + estimatedElementHeight > maxPageHeight && currentPageElements.length > 0) {
          newPages.push(
            <div key={`page-${newPages.length}`} className="document-page">
              {currentPageElements}
            </div>
          );
          currentPageElements = [];
          estimatedHeight = 0;
        }
        
        // Clone the element for the page
        currentPageElements.push(
          <div key={`elem-${index}`} dangerouslySetInnerHTML={{__html: element.outerHTML}} />
        );
        estimatedHeight += estimatedElementHeight;
      });
      
      // Add remaining elements as the last page
      if (currentPageElements.length > 0) {
        newPages.push(
          <div key={`page-${newPages.length}`} className="document-page">
            {currentPageElements}
          </div>
        );
      }
      
      setPages(newPages.length > 0 ? newPages : [
        <div key="page-0" className="document-page">{children}</div>
      ]);
    };
    
    // Use timeout to ensure DOM is ready
    const timer = setTimeout(splitIntoPages, 100);
    return () => clearTimeout(timer);
  }, [children]);
  
  return (
    <div className="latex-document-container">
      {/* Hidden container to get original content */}
      <div ref={contentRef} style={{ position: 'absolute', top: '-10000px', left: '-10000px' }}>
        {children}
      </div>
      
      {/* Render paginated content */}
      <div className="pages-container">
        {pages.map((pageContent, pageIndex) => (
          <div key={`page-wrapper-${pageIndex}`} className="page-wrapper">
            <div className="page-content">
              {pageContent}
            </div>
            
            {showPageNumbers && (
              <div className="page-number">
                {pageIndex + 1}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};