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
    />
  );

};

export default CodeEditor;
