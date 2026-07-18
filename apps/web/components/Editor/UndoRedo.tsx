'use client';
import React from 'react';
import type { editor as MonacoEditorNS } from 'monaco-editor';


//undo redo props
interface UndoRedoButtonProps {
  editorRef?: React.RefObject<MonacoEditorNS.IStandaloneCodeEditor | null>;
  isReady?: boolean;
}

const UndoRedoButton: React.FC<UndoRedoButtonProps> = ({ 
  editorRef, 
  isReady = false 
}) => {
  const handleUndo = () => {
    if (editorRef?.current && isReady) {
      try {
        //if valid till here then the monaco triggers undo on current instance of editor
        editorRef.current.trigger('keyboard', 'undo', null);
        console.log("Undo executed successfully");
      } catch (error) {
        console.error("Error during undo:", error);
      }
    } else {
      console.log("Editor not ready or not available");
    }
  };

  const handleRedo = () => {
    if (editorRef?.current && isReady) {
      try {
        //if valid till here then the monaco triggers redo on current instance of editor
        editorRef.current.trigger('keyboard', 'redo', null);
        console.log("Redo executed successfully");
      } catch (error) {
        console.error("Error during redo:", error);
      }
    } else {
      console.log("Editor not ready or not available");
    }
  };

  return (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
      <button 
        onClick={handleUndo}
        disabled={!isReady}
      >
        Undo
      </button>
      <button 
        onClick={handleRedo}
        disabled={!isReady}
      >
        Redo
      </button>
    </div>
  );
};

export default UndoRedoButton;