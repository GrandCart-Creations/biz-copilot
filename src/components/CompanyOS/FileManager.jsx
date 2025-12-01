/**
 * FILE MANAGER
 * 
 * Basic file management for Company OS folders
 */

import React, { useState } from 'react';
import { FaFolder, FaFile, FaArrowLeft, FaUpload, FaDownload } from 'react-icons/fa';

const FileManager = ({ folder, onBack }) => {
  const [files, setFiles] = useState([]);

  if (!folder) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No folder selected</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-[#005C70] text-white rounded-lg hover:bg-[#014A5A] transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FaArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{folder.name}</h2>
            <p className="text-sm text-gray-600">{folder.description}</p>
          </div>
        </div>
        <button className="px-4 py-2 bg-gradient-to-r from-[#005C70] to-[#00BFA6] text-white rounded-lg hover:from-[#014A5A] hover:to-[#019884] transition-all flex items-center gap-2">
          <FaUpload className="w-4 h-4" />
          Upload File
        </button>
      </div>

      {folder.subfolders && folder.subfolders.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {folder.subfolders.map((subfolder) => (
            <div key={subfolder.id} className="p-4 bg-white rounded-lg border border-gray-200 hover:border-[#00BFA6] transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <FaFolder className="w-6 h-6 text-blue-600" />
                <span className="font-medium text-gray-900">{subfolder.name}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center py-12">
          <FaFile className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Files Yet</h3>
          <p className="text-gray-600 mb-6">
            Upload files to organize them in this folder
          </p>
          <button className="px-6 py-3 bg-gradient-to-r from-[#005C70] to-[#00BFA6] text-white rounded-lg hover:from-[#014A5A] hover:to-[#019884] transition-all flex items-center gap-2 mx-auto">
            <FaUpload className="w-4 h-4" />
            Upload Files
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileManager;

