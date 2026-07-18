'use client'
import React from "react";
import * as Y from 'yjs';

interface CompileProp {
    yjsDoc: React.RefObject<Y.Doc>;
    onCompile: (content: string) => void;
}

const Recompile: React.FC<CompileProp> = ({ yjsDoc, onCompile }) => {
    
    const buildLatex = () => {
        if (yjsDoc.current) {
            try {
                const yText = yjsDoc.current.getText('monacotest');
                const content = yText.toString();
                onCompile(content); // Send content up to page.tsx
            } catch (error) {
                console.log("Error compiling document to LaTeX", error);
            }
        } else {
            console.log("Editor Unavailable");
        }
    };

    return (
        <div style={{ marginLeft: '420px' }}>
            <button onClick={buildLatex}>
                Compile
            </button>
        </div>
    );
};

export default Recompile;