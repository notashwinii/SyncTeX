'use client'

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

const BaseEditor = dynamic(() => import('@/components/Editor/BaseEditor'), {
  ssr: false,
  loading: () => <div>Loading collaborative editor...</div>
});

export default function ProjectEditor() {
  const params = useParams();
  const projectId = params.projectId as string;
  
  const handleCompile = (content: string) => {
    console.log('Compiling content:', content);
    // Add compile logic here if needed
  };
  
  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Invalid Project</h2>
          <p className="text-gray-600">Project ID not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-gray-100 p-2 text-sm border-b flex justify-between items-center">
        <div>
          <span className="font-semibold">Project:</span> {projectId}
        </div>
        <div className="text-xs text-gray-500">
          Share this URL with collaborators to work together
        </div>
      </div>
      <BaseEditor projectId={projectId} onCompile={handleCompile} />
    </div>
  );
}
