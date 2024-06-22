import React, { useEffect, useState, useRef } from "react";

import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-latex";
import "ace-builds/src-noconflict/theme-github";
import "ace-builds/src-noconflict/ext-language_tools";


const CodeEditor = ({onChange,code }) => {
  

  return (
    <AceEditor
      mode="latex"
      theme="github"
      onChange={onChange}
      value={code}
      name="RnadomName"
      editorProps={{ $blockScrolling: true }}
      style={{ height: "93%", width: "calc(100% - 20px)"}}
    />
  );

};

export default CodeEditor;
