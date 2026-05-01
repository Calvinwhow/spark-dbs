import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Button, ButtonGroup, ToggleButton } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import Electrode from './Electrode';
import electrodeModels from '../utils/electrodeModels.json';
import { processImportedStimulationData } from '../services/dataProcessing';
import { extractStimParamVector } from '../services/stimParamParsing';
import {
  getElectrodeDisplayName,
  getElectrodeValue,
  getIPGFromElectrode,
} from '../constants/electrodeModelInterpreter';
import '../styling/ElectrodeManager.css';

const emptyContactState = (numContacts) => {
  const quantities = { 0: 0 };
  const selectedValues = { 0: 'right' };

  for (let contact = 1; contact <= numContacts; contact += 1) {
    quantities[contact] = 0;
    selectedValues[contact] = 'left';
  }

  return { quantities, selectedValues };
};

const normalizeVector = (vector, numContacts) => {
  const output = [];

  for (let index = 0; index < numContacts; index += 1) {
    const value = Array.isArray(vector) ? vector[index] : 0;
    output.push(Math.max(Number(value) || 0, 0));
  }

  return output;
};

const vectorToContactState = (vector, numContacts) => {
  const normalized = normalizeVector(vector, numContacts);
  const amplitude = normalized.reduce((acc, value) => acc + value, 0);
  const { quantities, selectedValues } = emptyContactState(numContacts);

  if (amplitude === 0) {
    return {
      quantities,
      selectedValues,
      amplitude: 0,
    };
  }

  quantities[0] = Number(amplitude.toFixed(3));

  normalized.forEach((value, index) => {
    const contact = index + 1;

    if (value > 0) {
      quantities[contact] = Number(value.toFixed(3));
      selectedValues[contact] = 'center';
    }
  });

  return {
    quantities,
    selectedValues,
    amplitude: Number(amplitude.toFixed(3)),
  };
};

const normalizeImportedOptimization = (json) => {
  const raw = json?.v ?? json?.V ?? json?.optimization ?? json;

  if (Array.isArray(raw)) {
    if (raw.every((item) => typeof item === 'number' || typeof item === 'string')) {
      return [raw];
    }

    return raw;
  }

  if (raw && typeof raw === 'object') {
    return Object.keys(raw)
      .sort((a, b) => Number(a) - Number(b))
      .map((key) => raw[key]);
  }

  return [];
};

const unwrapStimulationData = (json) => {
  const raw = json?.v ?? json?.V ?? json?.optimization ?? json;

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  if (raw.amplitude && (raw.Rs1 || raw.Ls1)) {
    return raw;
  }

  const firstStimKey = Object.keys(raw).find((key) => {
    const value = raw[key];
    return value && typeof value === 'object' && value.amplitude && (value.Rs1 || value.Ls1);
  });

  return firstStimKey ? raw[firstStimKey] : null;
};

const hasMeaningfulQuantity = (quantities = {}) => (
  Object.keys(quantities).some((key) => key !== '0' && Number(quantities[key]) > 0)
);

const buildInitialProgrammerState = (optimizationJson, electrodeValue) => {
  const electrode = getElectrodeValue(electrodeValue || 'boston_vercise_directed');
  const elspec = electrodeModels[electrode] || electrodeModels.boston_vercise_directed;
  const numContacts = elspec.numel;
  const importedVectors = normalizeImportedOptimization(optimizationJson);
  const importedStim = unwrapStimulationData(optimizationJson);

  const allQuantities = {};
  const allSelectedValues = {};
  const allTotalAmplitudes = {};
  const allStimulationParameters = {};
  const allTogglePositions = {};
  const allPercAmpToggles = {};
  const allVolAmpToggles = {};

  for (let source = 1; source <= 8; source += 1) {
    const { quantities, selectedValues } = emptyContactState(numContacts);
    allQuantities[source] = quantities;
    allSelectedValues[source] = selectedValues;
    allTotalAmplitudes[source] = 0;
    allStimulationParameters[source] = { pulseWidth: 60, frequency: 130 };
    allTogglePositions[source] = 'mA';
    allPercAmpToggles[source] = 'center';
    allVolAmpToggles[source] = 'center';
  }

  let IPG = getIPGFromElectrode(electrode);
  let visModel = '3';

  if (importedStim) {
    const processed = processImportedStimulationData(importedStim, electrode);

    Object.assign(allQuantities, processed.filteredQuantities);
    Object.assign(allSelectedValues, processed.filteredValues);
    Object.assign(allTotalAmplitudes, processed.newTotalAmplitude);
    Object.assign(allTogglePositions, processed.newAllTogglePositions);
    Object.assign(allVolAmpToggles, processed.newAllVolAmpToggles);

    IPG = processed.outputIPG || IPG;
    visModel = processed.outputVisModel || visModel;
  } else {
    const rightVector = importedVectors[0];
    const leftVector = importedVectors[1];

    if (rightVector) {
      const rightState = vectorToContactState(rightVector, numContacts);
      allQuantities[5] = rightState.quantities;
      allSelectedValues[5] = rightState.selectedValues;
      allTotalAmplitudes[5] = rightState.amplitude;
      allTogglePositions[5] = 'mA';
      allPercAmpToggles[5] = 'center';
    }

    if (leftVector) {
      const leftState = vectorToContactState(leftVector, numContacts);
      allQuantities[1] = leftState.quantities;
      allSelectedValues[1] = leftState.selectedValues;
      allTotalAmplitudes[1] = leftState.amplitude;
      allTogglePositions[1] = 'mA';
      allPercAmpToggles[1] = 'center';
    }
  }

  return {
    electrode,
    elspec,
    IPG,
    visModel,
    allQuantities,
    allSelectedValues,
    allTotalAmplitudes,
    allStimulationParameters,
    allTogglePositions,
    allPercAmpToggles,
    allVolAmpToggles,
    allTemplateSpaces: 0,
  };
};

function PriorOptimizationViewer({ patient, optimizationJson, electrodeModel }) {
  const location = useLocation();
  const routeState = location.state || {};
  const activePatient = patient || routeState.patient;
  const activeOptimizationJson = optimizationJson || routeState.optimizationJson;
  const activeElectrodeModel = electrodeModel || routeState.electrodeModel;

  const [hemisphereKey, setHemisphereKey] = useState('5');
  const [showViewer, setShowViewer] = useState(true);
  const [contactNaming, setContactNaming] = useState('clinical');
  const [stimParamInput, setStimParamInput] = useState('');
  const [stimParamError, setStimParamError] = useState('');

  const initialState = useMemo(
    () => buildInitialProgrammerState(activeOptimizationJson, activeElectrodeModel || activePatient?.elmodel),
    [activeOptimizationJson, activeElectrodeModel, activePatient?.elmodel],
  );

  const [viewerState, setViewerState] = useState(initialState);

  useEffect(() => {
    document.body.style.zoom = '100%';
  }, []);

  useEffect(() => {
    setViewerState(initialState);
    setHemisphereKey(hasMeaningfulQuantity(initialState.allQuantities[5]) ? '5' : '1');
  }, [initialState]);

  const hemisphereButtons = [
    { name: 'Right', value: '5' },
    { name: 'Left', value: '1' },
  ];

  const sourceButtons = useMemo(() => {
    const isRight = parseInt(hemisphereKey, 10) >= 5;
    const baseValue = isRight ? 5 : 1;

    return [1, 2, 3, 4].map((source) => ({
      label: source.toString(),
      value: (baseValue + source - 1).toString(),
      isActive: hemisphereKey === (baseValue + source - 1).toString(),
    }));
  }, [hemisphereKey]);

  const updateViewerState = (updates) => {
    setViewerState((prev) => ({
      ...prev,
      ...updates,
    }));
  };

  const updateSourceState = (key, value) => {
    setViewerState((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [hemisphereKey]: value,
      },
    }));
  };

  const setParameters = (updater) => {
    setViewerState((prev) => {
      const currentParameters = prev.allStimulationParameters[hemisphereKey] || {};
      const nextParameters = typeof updater === 'function' ? updater(currentParameters) : updater;

      return {
        ...prev,
        allStimulationParameters: {
          ...prev.allStimulationParameters,
          [hemisphereKey]: nextParameters,
        },
      };
    });
  };

  const loadStimParamFromPath = async (filePath) => {
    const response = await fetch('/api/retrieve-optimization-json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ file_path: filePath }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.detail || `Could not load stim params: ${response.status}`);
    }

    return response.json();
  };

  const handleLoadStimParam = async () => {
    try {
      const trimmed = stimParamInput.trim();
      const rawStimParams = trimmed.startsWith('/')
        ? await loadStimParamFromPath(trimmed)
        : stimParamInput;
      const vector = extractStimParamVector(rawStimParams);

      if (!vector) {
        throw new Error('Could not find a numeric stim vector.');
      }

      const sourceState = vectorToContactState(vector, viewerState.elspec.numel);

      setViewerState((prev) => ({
        ...prev,
        allQuantities: {
          ...prev.allQuantities,
          [hemisphereKey]: sourceState.quantities,
        },
        allSelectedValues: {
          ...prev.allSelectedValues,
          [hemisphereKey]: sourceState.selectedValues,
        },
        allTotalAmplitudes: {
          ...prev.allTotalAmplitudes,
          [hemisphereKey]: sourceState.amplitude,
        },
        allTogglePositions: {
          ...prev.allTogglePositions,
          [hemisphereKey]: 'mA',
        },
        allPercAmpToggles: {
          ...prev.allPercAmpToggles,
          [hemisphereKey]: 'center',
        },
      }));
      setStimParamError('');
    } catch (error) {
      setStimParamError(error.message);
    }
  };

  return (
    <div className="prior-viewer-page">
      <header className="prior-viewer-header">
        <div className="prior-viewer-title">{activePatient?.id || 'Prior Optimization'}</div>
        <div className="prior-viewer-model">{getElectrodeDisplayName(viewerState.electrode)}</div>
      </header>

      <div className="prior-viewer-toolbar">
        <div className="prior-viewer-control">
          <span>Hemisphere</span>
          <ButtonGroup className="prior-button-group">
            {hemisphereButtons.map((button, idx) => (
              <ToggleButton
                key={button.value}
                id={`prior-hemisphere-${idx}`}
                type="radio"
                name="prior-hemisphere"
                value={button.value}
                checked={parseInt(hemisphereKey, 10) >= 5 ? button.value === '5' : button.value === '1'}
                onChange={(event) => setHemisphereKey(event.currentTarget.value)}
                style={{
                  borderRadius: '20px',
                  width: '150px',
                  backgroundColor: 'white',
                  color: 'navy',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.4)',
                  border: 'none',
                  ...((parseInt(hemisphereKey, 10) >= 5 && button.value === '5')
                    || (parseInt(hemisphereKey, 10) < 5 && button.value === '1')) && {
                    color: 'black',
                    boxShadow: 'inset 0 4px 8px rgba(0, 0, 0, 0.4)',
                  },
                }}
              >
                {button.name}
              </ToggleButton>
            ))}
          </ButtonGroup>
        </div>

        <div className="prior-viewer-control">
          <span>Source</span>
          <div className="prior-source-buttons">
            {sourceButtons.map((source) => (
              <Button
                key={source.value}
                style={{
                  borderRadius: '20px',
                  width: '70px',
                  marginRight: '10px',
                  backgroundColor: 'white',
                  color: 'navy',
                  fontWeight: 'bold',
                  border: 'none',
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.4)',
                  ...(source.isActive && {
                    color: 'black',
                    boxShadow: 'inset 0 4px 8px rgba(0, 0, 0, 0.4)',
                  }),
                }}
                onClick={() => setHemisphereKey(source.value)}
              >
                {source.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="prior-stim-loader">
          <input
            type="text"
            value={stimParamInput}
            onChange={(event) => setStimParamInput(event.target.value)}
            placeholder="Paste stim params"
            className="prior-stim-input"
          />
          <Button
            onClick={handleLoadStimParam}
            style={{
              borderRadius: '8px',
              backgroundColor: '#111',
              color: 'white',
              fontWeight: 'bold',
              border: 'none',
            }}
          >
            Load
          </Button>
          {stimParamError && <span className="prior-stim-error">{stimParamError}</span>}
        </div>
      </div>

      <main className="prior-electrode-stage">
        <div className="prior-electrode-scale">
        <Electrode
          name={hemisphereKey}
          allQuantities={viewerState.allQuantities}
          quantities={viewerState.allQuantities[hemisphereKey]}
          setQuantities={(quantities) => updateSourceState('allQuantities', quantities)}
          selectedValues={viewerState.allSelectedValues[hemisphereKey]}
          setSelectedValues={(selectedValues) => updateSourceState('allSelectedValues', selectedValues)}
          IPG={viewerState.IPG}
          totalAmplitude={viewerState.allTotalAmplitudes[hemisphereKey]}
          setTotalAmplitude={(amplitude) => updateSourceState('allTotalAmplitudes', amplitude)}
          parameters={viewerState.allStimulationParameters[hemisphereKey]}
          setParameters={setParameters}
          visModel={viewerState.visModel}
          setVisModel={(visModel) => updateViewerState({ visModel })}
          sessionTitle="optimizer"
          togglePosition={viewerState.allTogglePositions[hemisphereKey]}
          setTogglePosition={(position) => updateSourceState('allTogglePositions', position)}
          percAmpToggle={viewerState.allPercAmpToggles[hemisphereKey]}
          setPercAmpToggle={(toggle) => updateSourceState('allPercAmpToggles', toggle)}
          volAmpToggle={viewerState.allVolAmpToggles[hemisphereKey]}
          setVolAmpToggle={(toggle) => updateSourceState('allVolAmpToggles', toggle)}
          contactNaming={contactNaming}
          setContactNaming={setContactNaming}
          adornment={viewerState.allVolAmpToggles[hemisphereKey] === 'right' ? 'V' : 'mA'}
          elspec={viewerState.elspec}
          electrodeLabel={getElectrodeDisplayName(viewerState.electrode)}
          templateSpace={viewerState.allTemplateSpaces}
          setTemplateSpace={(allTemplateSpaces) => updateViewerState({ allTemplateSpaces })}
          showViewer={showViewer}
          setShowViewer={setShowViewer}
          disableBodyZoom
        />
        </div>
      </main>
    </div>
  );
}

export default PriorOptimizationViewer;
