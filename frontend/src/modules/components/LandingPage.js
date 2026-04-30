import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styling/LandingPage.css';

function LandingPage() {
  const navigate = useNavigate();

  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [programmerInputs, setProgrammerInputs] = useState({
    reconstructionFilePath: '',
    optimizationJsonPath: '',
    optimizationJson: null,
  });

  const handleProgrammerInputChange = (event) => {
    const { name, value } = event.target;

    setProgrammerInputs((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const postPath = async (url, filePath) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ file_path: filePath }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.detail || `Request failed: ${response.status}`);
    }

    return response.json();
  };

  const handleOpenProgrammer = async () => {
    setErrorMessage('');
    setIsLoading(true);

    try {
      if (!programmerInputs.reconstructionFilePath.trim()) {
        throw new Error('Enter the reconstruction .mat path.');
      }

      const electrodeData = await postPath(
        'http://localhost:8000/api/retrieve-electrode-data',
        programmerInputs.reconstructionFilePath.trim(),
      );

      let optimizationJson = null;
      if (programmerInputs.optimizationJsonPath.trim()) {
        optimizationJson = await postPath(
          'http://localhost:8000/api/retrieve-optimization-json',
          programmerInputs.optimizationJsonPath.trim(),
        );
      }

      navigate('/programmer', {
        state: {
          patient: {
            id: electrodeData.patient_id || 'Prior Optimization',
            elmodel: electrodeData.elmodels[0],
          },
          electrodeModel: electrodeData.elmodels[0],
          optimizationJson: optimizationJson?.v ?? optimizationJson ?? null,
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
        <div className="programmer-input-row">
          <input
            type="text"
            name="reconstructionFilePath"
            placeholder="Path to reconstruction .mat"
            value={programmerInputs.reconstructionFilePath}
            onChange={handleProgrammerInputChange}
            className="programmer-input reconstruction-input"
          />

          <input
            type="text"
            name="optimizationJsonPath"
            placeholder="Optional path to optimizer JSON"
            value={programmerInputs.optimizationJsonPath}
            onChange={handleProgrammerInputChange}
            className="programmer-input optimization-input"
          />

          <button
            onClick={handleOpenProgrammer}
            className="landing-page-button"
            disabled={isLoading}
          >
            {isLoading ? 'Opening...' : 'Open Programmer'}
          </button>
        </div>

        <div className="standalone-status">
          Electrode model is read from the reconstruction file.
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
