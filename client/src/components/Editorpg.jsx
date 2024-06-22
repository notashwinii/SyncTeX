import React, { useState, useEffect } from "react";
import SplitPane from "react-split-pane";
import { MdCheck, MdEdit, MdDownload, MdShare } from "react-icons/md";
import { motion, AnimatePresence } from "framer-motion";
import CodeEditor from "./CodeEditor";
import { useParams } from "react-router";
import { Link } from "react-router-dom";

const DialogBox = ({ projectId, onClose }) => {
  return (
    <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center z-50">
      <div className="bg-[#5b8c92] p-6 shadow-lg w-96">
        <h2 className="text-xl font-semibold text-white mb-4">Project ID</h2>
        <p className="text-lg text-white">{projectId}</p>
        <button
          onClick={onClose}
          className="mt-4 bg-white hover:bg-[#618487] text-[#618487] h-8 flex justify-center items-center font-bold py-2 px-4 rounded-lg"
          style={{ float: "right" }}
        >
          Close
        </button>
      </div>
    </div>
  );
};

const Editorpg = ({ socket }) => {
  const { projectId } = useParams();
  const [isTitle, setIsTitle] = useState(false);
  const [title, setTitle] = useState("Untitled");
  const [showDialog, setShowDialog] = useState(false);
  const [code, setCode] = useState("");
  const [pdfUrl, setPdfUrl] = useState(null);

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
  };

  const handleShareClick = () => {
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
  };

  useEffect(() => {
    socket.on("connect", (data) => {
      console.log("Socket Connected");
    });

    socket.emit("connectTo", {
      projectId: projectId,
    });
  }, []);

  useEffect(() => {
    socket.on("changedCode", (data) => {
      console.log(data);
      setCode(data);
    });
  }, [socket]);

  const onCodeChange = (val) => {
    setCode(val);
    socket.emit("codeChange", { projectId: projectId, code: val });
  };

  const handleCompileClick = async () => {
    console.log("Compile button clicked");
    try {
      const response = await fetch("http://localhost:3001/api/compile-latex", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: code }),
      });

      console.log("Server response:", response);

      if (!response.ok) {
        throw new Error("Failed to compile LaTeX");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      console.log("PDF URL set:", url);
    } catch (error) {
      console.error("Error compiling LaTeX:", error);
    }
  };

  return (
    <div className="w-screen h-screen bg-[#323639] flex flex-col items-start justify-start overflow-hidden">
      <header className="w-full flex items-center justify-between px-12 py-4 h-12 bg-[#3c5e63] relative">
        <Link to={"/projects"} className="flex items-center justify-center gap-6 absolute left-0">
          <img
            className="px-2 w-12 h-auto object-contain"
            src={"/assets/sync.svg"}
            alt="SyncTeX logo"
          />
        </Link>
        <div className="flex items-center justify-center gap-3 mx-auto">
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
                className="px-3 py-2 text-white text-lg"
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



{/* <div className="flex items-center justify-center px-3 -mt-2 gap-2 ">
  <p className="text-white text text-sm">
    {user?.displayName ? user?.displayName : `${user?.email.split("@")[0]}`}
  </p>
</div> */}

        <div className="flex items-center absolute right-10">
          <div
            key="MdShare"
            className="cursor-pointer text-white hover:text-[#808285]"
            onClick={handleShareClick}
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
          <div className="flex flex-col h-screen bg-[#323639]">
            <div className="bg-[#323639] p-1 flex items-center justify-between" style={{height: '57px'}}>
              <h2 className="text-lg text-[#F9EFD6] font-semibold">
                Code Editor
              </h2>
              <button
                onClick={handleCompileClick}
                className="bg-white hover:bg-[#618487] h-7 flex items-center text-[#5b8c92] font-bold py-2 px-4 rounded-lg "
                style={{ fontSize: "18px" }}
              >
                Compile
              </button>
            </div>
            <div className="flex-grow h-[calc(100dvh-15rem)]">
              <CodeEditor onChange={onCodeChange} code={code} />
            </div>
          </div>
          <div className="flex flex-col h-screen">
            <div className="flex-grow w-full h-screen">
              {pdfUrl && (
                <iframe
                  src={pdfUrl}
                  title="PDF Preview"
                  className="w-full h-full border-none"
                />
              )}
            </div>
          </div>
        </SplitPane>
      </div>
      {showDialog && (
        <DialogBox projectId={projectId} onClose={handleCloseDialog} />
      )}
    </div>
  );
};

export default Editorpg;
