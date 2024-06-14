import React, { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Editpg  from "./components/Editpg";



const App = () => {
  const [editorValue, setEditorValue] = useState("");

  return (
    <div className="w-screen h-screen items-start justify-start overflow-hidden">
      <Routes>
       
        <Route path="/Editpg/*" element={<Editpg />} />
        <Route path="/login/*" element={<ExternalPage page="login/index.html" />} />
        <Route path="/landing-page/*" element={<ExternalPage page="landing-page/index.html" />} />

        
        
       
      </Routes>
    </div>
  );
};

const ExternalPage = ({ page }) => {
  return (
    <div className="w-screen h-screen">
      <iframe
        src={`/${page}`}
        width="100%"
        height="100%"
        title="External HTML Page"
      />
    </div>
  );
};

export default App;
