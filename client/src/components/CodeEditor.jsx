import React, { useEffect, useState, useRef } from "react";
// import { EditorState } from "@codemirror/state";
// import { EditorView } from "@codemirror/view";
// import {
//   syntaxHighlighting,
//   defaultHighlightStyle,
//   StreamLanguage,
// } from "@codemirror/language";
// import { stex } from "@codemirror/legacy-modes/mode/stex";
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-latex";
import "ace-builds/src-noconflict/theme-github";
import "ace-builds/src-noconflict/ext-language_tools";


const CodeEditor = ({onChange,code }) => {
  // const editorRef = useRef(null);

  // const onUpdate = EditorView.updateListener.of((v) => {
  //   setCode(v.state.doc.toString());
  // });

  // useEffect(() => {
  //   const extensions = [
  //     EditorView.contentAttributes.of({ spellcheck: 'true' }),
  //     EditorView.lineWrapping,
  //     EditorView.theme({
  //       '&': { // Root element of the editor
  //         height: '93%', // Make the editor take up the full height of its container
  //         backgroundColor: 'white', // Set the background color to white
  //       },
  //       '.cm-content': {
  //         maxWidth: '50em',

  //       },

  //       '.cm-scroller': {
  //         maxHeight: '75vh',
  //       },
  //     }),
  //     StreamLanguage.define(stex),
  //     syntaxHighlighting(defaultHighlightStyle),
  //     onUpdate
  //   ];

  //   const state = EditorState.create({ doc:code,extensions });

  //   const view = new EditorView({
  //     state,
  //     parent: editorRef.current,
  //   });

  //   view.dispatch({
  //     changes: {
  //       code
  //     }
  // })

  //   console.log("view", view);
  //   // Cleanup function to destroy the editor instance on unmount
  //   return () => {
  //     view.destroy();
  //   };
  // }, []);


  return (
    <AceEditor
      mode="latex"
      theme="github"
      onChange={onChange}
      value={code}
      name="RnadomName"
      editorProps={{ $blockScrolling: true }}
    />
  );
  // <div id="editor" ref={editorRef} style={{ height: '100%', width: '100%' }}></div>;
};

export default CodeEditor;
