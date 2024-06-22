import React, { useEffect, useState } from "react";
import ProjectList from "./ProjectList";
import { Link } from "react-router-dom";
import { io } from "socket.io-client";
import SplitPane from "react-split-pane";
import { v4 as uuidv4 } from 'uuid'; // Import UUID generator
import "./style.css";

const socket = io("http://localhost:3001");

const Projects = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [newProjectId, setNewProjectId] = useState(null); // State to store the latest created project ID

  useEffect(() => {
    socket.on("projectCreated", (projectId) => {
      console.log("New project created with ID:", projectId);
      setNewProjectId(projectId); // Store the newly created project ID
      // Assuming projects get updated dynamically from server upon creation
      // You might fetch or update projects from your server here
      // Example: fetchProjectsFromServer();
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
      // You can implement further sharing logic here, such as copying to clipboard or sharing via a service
    }
  };

  return (
    <div className="w-screen h-screen bg-[#6da7af] flex flex-col items-start justify-start overflow-hidden">
      <header className="w-full flex items-center justify-between px-12 py-4 h-12 bg-white">
        <div className="flex items-center justify-center gap-6">
          <img
            className="px-1 w-auto h-8 object-contain"
            src={"/assets/synctex.svg"}
            alt="SyncTeX logo"
          />
        </div>
      </header>

      <div className="flex flex-grow overflow-hidden">
        <SplitPane
          split="vertical"
          minSize={100}
          max={-100}
          style={{ paddingLeft: "20px" }}
          defaultSize={"15%"}
        >
          <div className="flex flex-col items-center justify-center mt-8">
            <Link
              to="/editor/new"
              className="bg-white hover:bg-[#618487] h-7 flex items-center text-[#5b8c92] font-bold py-2 px-4 rounded-lg mb-4"
              style={{ fontSize: "18px", textDecoration: "none", color: "#5b8c92" }}
              onClick={handleNewProject}
            >
              New Project
            </Link>
            <button
              className="bg-white hover:bg-[#618487] h-7 flex items-center text-[#5b8c92] font-bold py-2 px-4 rounded-lg"
              style={{ fontSize: "18px", textDecoration: "none", color: "#5b8c92" }}
              onClick={handleJoinProject}
            >
              Join Project
            </button>
            {newProjectId && (
              <button
                className="bg-white hover:bg-[#618487] h-7 flex items-center text-[#5b8c92] font-bold py-2 px-4 rounded-lg"
                style={{ fontSize: "18px", textDecoration: "none", color: "#5b8c92", marginTop: '1rem' }}
                onClick={handleShareProject}
              >
                Share Project
              </button>
            )}
          </div>
          <div className=" p-2 pane-right">
            <input
              type="text"
              placeholder="Search projects..."
              className="mt-4 p-2 rounded border border-gray-400 w-1/2"
              value={searchTerm}
              onChange={handleSearchChange}
            />
            <ProjectList projects={filteredProjects} />
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
