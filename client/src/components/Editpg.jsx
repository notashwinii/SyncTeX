import React, { useState } from "react";
import SplitPane from "react-split-pane";
import LatexEditor from "./LatexEditor"; // Adjust the path as per your project structure

import { motion, AnimatePresence } from "framer-motion";
import { MdCheck, MdEdit, MdDownload, MdShare } from "react-icons/md";
import synctex from "../assets/synctex.svg";

const Editpg = () => {
  const [isTitle, setIsTitle] = useState(false);
  const [title, setTitle] = useState("Untitled");
  const [value, setValue] = useState(""); // State to hold the editor value

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
  };

  const onChange = (editor, data, value) => {
    setValue(value); // Update the editor value state
  };

  return (
    <div className="w-screen h-screen bg-[#6da7af] flex flex-col items-start justify-start overflow-hidden">
      <header className="w-full flex items-center justify-between px-12 py-4 h-12 bg-[#5b8c92]">
        <div className="flex items-center justify-center gap-6">
          <img
            className="px-2 w-12 h-auto object-contain"
            src={synctex}
            alt="SyncTeX logo"
          />
          <div className="flex flex-col items-start justify-start">
            <div className="flex items-center justify-center gap-3">
              <AnimatePresence>
                {isTitle ? (
                  <motion.input
                    key={"TitleInput"}
                    type="text"
                    placeholder="Project Title"
                    className="px-3 py-2 rounded-md bg-transparent text-primaryText text-base outline-none border-none"
                    value={title}
                    onChange={handleTitleChange}
                  />
                ) : (
                  <motion.p
                    key={"titleLabel"}
                    className="px-3 py-2 text-[#F9EFD6] text-lg"
                  >
                    {title}
                  </motion.p>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {isTitle ? (
                  <motion.div
                    key={"MdCheck"}
                    className="cursor-pointer"
                    onClick={() => setIsTitle(false)}
                  >
                    <MdCheck className="text-2xl text-[#F9EFD6]" />
                  </motion.div>
                ) : (
                  <motion.div
                    key={"MdEdit"}
                    className="cursor-pointer text-[#F9EFD6]"
                    onClick={() => setIsTitle(true)}
                    style={{ fontSize: "20px" }}
                  >
                    <MdEdit />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
        <div className="flex items-center">
          <div
            key="MdShare"
            className="cursor-pointer text-[#F9EFD6] hover:text-[#808285]"
          >
            <MdShare />
          </div>
        </div>
      </header>
      <div className="w-full h-full flex flex-grow overflow-hidden">
        <SplitPane
          split="vertical"
          minSize={100}
          max={-100}
          style={{ paddingLeft: "20px" }}
          defaultSize={"50%"}
        >
          <div className="flex flex-col">
            <div className="bg-[#6da7af] p-1 h-10 flex items-center justify-between">
              <h2 className="text-lg text-[#F9EFD6] font-semibold">
                Code Editor
              </h2>
            </div>
            <div className="flex-grow">
              {/* Replace this div with LatexEditor */}
              <LatexEditor />
            </div>
          </div>
          <div className="flex flex-col">
            <header className="bg-[#6da7af] p-1 h-10 flex items-center">
              <button
                className="bg-[#F9EFD6] hover:bg-[#618487] h-7 flex items-center text-[#5b8c92] font-bold py-2 px-4 rounded-full"
                style={{ fontSize: "18px" }}
              >
                Compile
              </button>
              <div
                key="MdDownload"
                className="cursor-pointer text-[#F9EFD6] hover:text-[#5b8c92] px-3"
              >
                <MdDownload />
              </div>
            </header>
            <div className="flex-grow">{/* Placeholder for preview */}</div>
          </div>
        </SplitPane>
      </div>
    </div>
  );
};

export default Editpg;
