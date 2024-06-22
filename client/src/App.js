import React from "react";
import { Routes, Route } from "react-router-dom";
import {Home, Projects, Editorpg} from "./components"; 
 

const App = () => {
  return (
    <div className='w-screen h-screen overflow-hidden'>
      <Routes>
        <Route path="/home/*" element={<Home />} /> 
        <Route path="/projects/*" element={<Projects />} />
        <Route path="/editor/new" element={<Editorpg />} />
        <Route path="/editor/:projectId" element={<Editorpg />} />
      </Routes>
    </div>
  );
};

export default App;
