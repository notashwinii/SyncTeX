import React, { useEffect, useState } from "react";
import ProjectList from "./ProjectList";
import { Link } from "react-router-dom";
import { io } from "socket.io-client";
import { v4 as uuidv4 } from 'uuid';
import SplitPane from "react-split-pane";
import "./style.css";

const socket = io("http://localhost:3001");

const Projects = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [newProjectId, setNewProjectId] = useState(null);

  useEffect(() => {
    socket.on("projectCreated", (projectId) => {
      console.log("New project created with ID:", projectId);
      setNewProjectId(projectId);
    });

    const initialProjects = [
      { id: 1, name: "Project 1", date: "2024-06-21", owner: "User A" },
      { id: 2, name: "Project 2", date: "2024-06-22", owner: "User B" },
      { id: 3, name: "Project 3", date: "2024-06-23", owner: "User C" },
      { id: 4, name: "Project 4", date: "2024-06-24", owner: "User D" },
    ];

    setProjects(initialProjects);
    setFilteredProjects(initialProjects);

    return () => {
      socket.off("projectCreated");
    };
  }, []);

//searching for projects
  useEffect(() => {
    const filtered = projects.filter((project) =>
      project.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProjects(filtered);
  }, [searchTerm, projects]);

  
  const handleNewProject = () => {
    const newProjectId = uuidv4();
    socket.emit("createProject", newProjectId);
  };

  const handleJoinProject = () => {
    setShowJoinDialog(true);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleDialogClose = () => {
    setShowJoinDialog(false);
    setSelectedProjectId(null);
  };

  const handleConfirmJoin = () => {
    if (selectedProjectId) {
      console.log("Joining project with ID:", selectedProjectId);
      setShowJoinDialog(false);
    }
  };

  const handleProjectIdChange = (e) => {
    setSelectedProjectId(e.target.value);
  };

  const handleShareProject = () => {
    if (newProjectId) {
      alert(`Share this project with ID: ${newProjectId}`);
    }
  };

  return (


    
    <div className="w-screen h-screen bg-[#f8f9fa] flex flex-col items-start justify-start overflow-hidden">
      <header className="w-full flex items-center justify-between px-6 py-4 h-16 bg-white shadow-sm">
        <div className="flex items-center justify-center gap-6">
          <img
            className="px-1 w-auto h-8 object-contain"
            src={"/assets/synctex.svg"}
            alt="SyncTeX logo"
          />
        </div>
      </header>
      <div className="flex flex-grow overflow-hidden">
      <SplitPane split="vertical" minSize={150} defaultSize={300} className="flex flex-grow">
        <div className="flex flex-col w-full border-r bg-white p-6">
          <Link
            to="/editor/new"
            className="bg-[#00A79D] hover:bg-[#0056b3] h-12 flex items-center justify-center text-white font-bold py-2 px-4 rounded-lg mb-4"
            onClick={handleNewProject}
          >
            New Project
          </Link>
          <button
            className="bg-[#00A79D] hover:bg-[#00A79D] h-12 flex items-center justify-center text-white font-bold py-2 px-4 rounded-lg"
            onClick={handleJoinProject}
          >
            Join Project
          </button>
          {newProjectId && (
            <button
              className="bg-[#007bff] hover:bg-[#0056b3] h-12 flex items-center justify-center text-white font-bold py-2 px-4 rounded-lg mt-4"
              onClick={handleShareProject}
            >
              Share Project
            </button>
          )}
        </div>
        <div className="flex flex-col w-full p-6 overflow-hidden">
          <input
            type="text"
            placeholder="Search in all projects..."
            className="p-2 rounded border border-gray-300 mb-4 w-1/2"
            value={searchTerm}
            onChange={handleSearchChange}
          />
          <div className="flex-grow overflow-auto">
            <ProjectList projects={filteredProjects} />
          </div>
        </div>
      </SplitPane>
      </div>

      {showJoinDialog && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 z-50">
          <div className="bg-white p-4 rounded-lg">
            <p className="mb-4 text-lg font-semibold">Enter Project ID:</p>
            <input
              type="text"
              className="border border-gray-300 rounded-md px-3 py-2 w-full"
              placeholder="Enter Project ID"
              value={selectedProjectId}
              onChange={handleProjectIdChange}
            />
            <div className="mt-4 flex justify-end">
              <button
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded mr-2"
                onClick={handleConfirmJoin}
              >
                Join
              </button>
              <button
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
                onClick={handleDialogClose}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
