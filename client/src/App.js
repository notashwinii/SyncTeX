import React from "react";
import {Navigate, Routes, Route } from "react-router-dom";
import {Home, Projects, Editorpg} from "./components"; 
import {io} from 'socket.io-client'
 

const App = () => {
  const socket = io("http://localhost:3001");

  return (
    <div className='w-screen h-screen overflow-hidden'>
      <Routes>
        
        <Route path="/home/*" element={<Home />} /> 
        <Route path="*" element={<Navigate to= {"/Home"} />} />

        <Route path="/projects/*" element={<Projects />} />
        {/* <Route path="/editor/new" element={<Editorpg socket={socket}/>} /> */}
        <Route path="/editor/:projectId" element={<Editorpg socket={socket}/>} />
      </Routes>
    </div>
  );
};

export default App;
