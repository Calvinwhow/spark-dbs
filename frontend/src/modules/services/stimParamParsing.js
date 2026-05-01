export const findNumericVector = (value) => {
  const raw = value?.v ?? value?.V ?? value?.optimization ?? value;

  if (Array.isArray(raw) && raw.every((item) => typeof item === 'number' || typeof item === 'string')) {
    const vector = raw.map(Number);
    return vector.some((item) => Number.isNaN(item)) ? null : vector;
  }

  if (Array.isArray(raw)) {
    for (const item of raw) {
      const vector = findNumericVector(item);
      if (vector) return vector;
    }
  }

  if (raw && typeof raw === 'object') {
    for (const key of Object.keys(raw)) {
      const vector = findNumericVector(raw[key]);
      if (vector) return vector;
    }
  }

  return null;
};

export const parseStimParamInput = (input) => {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new Error('Paste a stim parameter vector first.');
  }

  try {
    const parsed = JSON.parse(trimmed);
    const vector = findNumericVector(parsed);
    if (vector) return vector;
  } catch (error) {
    // Fall through to delimiter parsing.
  }

  const matches = trimmed.match(/[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?/g);
  const values = matches ? matches.map(Number) : [];

  if (!values.length || values.some((value) => Number.isNaN(value))) {
    throw new Error('Could not parse stim params. Paste numbers, JSON, or a stimparams file path.');
  }

  return values;
};

export const extractStimParamVector = (value) => {
  if (typeof value === 'string') {
    return parseStimParamInput(value);
  }

  return findNumericVector(value);
};
