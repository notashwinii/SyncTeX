import React, { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import {
  syntaxHighlighting,
  defaultHighlightStyle,
  StreamLanguage,
} from '@codemirror/language';
import { stex } from '@codemirror/legacy-modes/mode/stex';

const CodeEditor = () => {
  const editorRef = useRef(null);

  useEffect(() => {
    const extensions = [
      EditorView.contentAttributes.of({ spellcheck: 'true' }),
      EditorView.lineWrapping,
      EditorView.theme({
        '&': { // Root element of the editor
          height: '93%', // Make the editor take up the full height of its container
          backgroundColor: 'white', // Set the background color to white
        },
        '.cm-content': {
          maxWidth: '50em',
          
        },
        
        '.cm-scroller': {
          maxHeight: '75vh',
        },
      }),
      StreamLanguage.define(stex),
      syntaxHighlighting(defaultHighlightStyle),
      
    ];

    const state = EditorState.create({ extensions });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });
    console.log("view", view);
    // Cleanup function to destroy the editor instance on unmount
    return () => {
      view.destroy();
    };
  }, []);

  return <div id="editor" ref={editorRef} style={{ height: '100%', width: '100%' }}></div>;
};

export default CodeEditor;
