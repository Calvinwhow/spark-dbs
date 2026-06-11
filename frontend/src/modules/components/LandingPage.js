import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styling/LandingPage.css';

function LandingPage() {
  const navigate = useNavigate();

  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [programmerFiles, setProgrammerFiles] = useState({
    reconstructionFile: null,
    optimizationJsonFile: null,
  });

  const postProgrammerSession = async () => {
    const formData = new FormData();
    formData.append('reconstruction_file', programmerFiles.reconstructionFile);

    if (programmerFiles.optimizationJsonFile) {
      formData.append('optimization_json_file', programmerFiles.optimizationJsonFile);
    }

    const response = await fetch('/api/programmer-session', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.detail || `Request failed: ${response.status}`);
    }

    return response.json();
  };

  const handleFileSelect = (name, files) => {
    const file = files?.[0] || null;
    setProgrammerFiles((prev) => ({
      ...prev,
      [name]: file,
    }));
  };

  const handleDrop = (name) => (event) => {
    event.preventDefault();
    handleFileSelect(name, event.dataTransfer.files);
  };

  const preventDefault = (event) => {
    event.preventDefault();
  };

  const handleOpenProgrammer = async () => {
    setErrorMessage('');
    setIsLoading(true);

    try {
      if (!programmerFiles.reconstructionFile) {
        throw new Error('Drop/select a reconstruction .mat file.');
      }

      const session = await postProgrammerSession();

      navigate('/programmer', {
        state: {
          patient: session.patient,
          electrodeModel: session.electrodeModel,
          optimizationJson: session.optimizationJson,
        },
      });
    } catch (error) {
      console.error(error);
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="landing-page-container">
      <h1 className="landing-page-title">StimPyPer</h1>

      <div className="standalone-programmer-panel">
        <div className="programmer-upload-grid">
          <label
            className="programmer-dropzone"
            onDrop={handleDrop('reconstructionFile')}
            onDragOver={preventDefault}
          >
            <span className="programmer-dropzone-title">Reconstruction .mat</span>
            <span className="programmer-dropzone-detail">
              {programmerFiles.reconstructionFile?.name || 'Drop file here or click to choose'}
            </span>
            <input
              type="file"
              accept=".mat"
              onChange={(event) => handleFileSelect('reconstructionFile', event.target.files)}
              className="programmer-file-input"
            />
          </label>

          <label
            className="programmer-dropzone"
            onDrop={handleDrop('optimizationJsonFile')}
            onDragOver={preventDefault}
          >
            <span className="programmer-dropzone-title">Optimizer JSON</span>
            <span className="programmer-dropzone-detail">
              {programmerFiles.optimizationJsonFile?.name || 'Optional: drop JSON or click to choose'}
            </span>
            <input
              type="file"
              accept=".json,application/json"
              onChange={(event) => handleFileSelect('optimizationJsonFile', event.target.files)}
              className="programmer-file-input"
            />
          </label>
        </div>

        <div className="programmer-input-row">
          <button
            onClick={handleOpenProgrammer}
            className="landing-page-button"
            disabled={isLoading}
          >
            {isLoading ? 'Opening...' : 'Open Programmer'}
          </button>
        </div>

        <div className="standalone-status">
          Files are sent to the backend through the programmer session API.
        </div>

        {errorMessage && (
          <div className="standalone-error">
            {errorMessage}
          </div>
        )}
      </div>
    </div>
  );
}

export default LandingPage;
