import React from "react";
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-latex";
import "ace-builds/src-noconflict/theme-twilight";
import "ace-builds/src-noconflict/ext-language_tools";
import 'ace-builds/webpack-resolver'

const CodeEditor = ({ onChange, code }) => {
  return (
    <AceEditor
      mode="latex"
      theme="twilight"
      onChange={onChange}
      value={code}
      name="RandomName"
      editorProps={{ $blockScrolling: true }}
      style={{ height: "93%", width: "calc(100% - 20px)" }}
      setOptions={{
        enableBasicAutocompletion: true,
        enableLiveAutocompletion: true,
        enableSnippets: true,
        showLineNumbers: true,
        tabSize: 2,
      }}
    />
  );
};

export default CodeEditor;
