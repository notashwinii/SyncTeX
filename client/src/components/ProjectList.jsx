import React from "react";
import { RiFilePdfLine, RiDeleteBin6Line } from "react-icons/ri";
import { RiFilePdfLine, RiDeleteBin6Line } from "react-icons/ri"; // Importing icons from react-icons
import { useNavigate } from "react-router";

const ProjectList = ({ projects }) => {
  const naviagte = useNavigate()
  const handleOpenProject = (projectId) => {
    console.log(`Opening project ${projectId}`);
    naviagte(`/editor/${projectId}`)
    // Replace with actual logic to navigate to the project editor or details page
  };

  const handleDownloadPDF = (projectId) => {
    console.log(`Downloading PDF for project ${projectId}`);
  };

  const handleDeleteProject = (projectId) => {
    console.log(`Deleting project ${projectId}`);
  };

  return (
    <div className="overflow-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Title
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Owner
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Last Modified
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {projects.map((project) => (
            <tr key={project.id}>
              <td
                className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 cursor-pointer"
                onClick={() => handleOpenProject(project.id)}
              >
                {project.name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {project.owner}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {project.date}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium flex space-x-2">
                <button
                  className="text-blue-500 hover:text-blue-600"
                  onClick={() => handleDownloadPDF(project.id)}
                >
                  <RiFilePdfLine size={18} />
                </button>
                <button
                  className="text-red-500 hover:text-red-600"
                  onClick={() => handleDeleteProject(project.id)}
                >
                  <RiDeleteBin6Line size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProjectList;
