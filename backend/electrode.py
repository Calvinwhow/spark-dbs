from scipy.io import loadmat
import h5py
import os
import numpy as np

def patientid(file_path) -> str:
    """
    Extracts the patient ID from the file name.

    The file name is expected to follow the pattern: sub-patientid_desc-reconstruction.mat

    Returns:
        str: The extracted patient ID.
    """
    base_name = os.path.basename(file_path)
    patient_id = base_name.split("_")[0]
    return patient_id

def get_elmodels(file_path):
    try: 
        elmodel = loadmat(file_path, simplify_cells=True)
        reco_data = elmodel['reco']
        if isinstance(reco_data, dict):
            if 'props' in reco_data:
                props = reco_data['props']
                if isinstance(props, dict):
                    props = [props]
                elmodels = [str(item['elmodel']) for item in props if 'elmodel' in item]
                return elmodels
            else:
                raise KeyError("'props' not found in 'reco'")
        elif isinstance(reco_data, list):
            # Assuming the list contains dictionaries
            elmodels = [str(item['props']['elmodel']) for item in reco_data if 'props' in item]
            return elmodels
        else:
            raise TypeError("Unexpected data structure for 'reco'")
    except Exception:
        with h5py.File(file_path, 'r') as f:
            return _read_hdf5_elmodels(f)

def _decode_hdf5_value(file_handle, value):
    if isinstance(value, h5py.Reference):
        return _decode_hdf5_value(file_handle, file_handle[value])

    if isinstance(value, h5py.Dataset):
        return _decode_hdf5_value(file_handle, value[()])

    if isinstance(value, bytes):
        return value.decode("utf-8")

    if isinstance(value, np.ndarray):
        if value.dtype == object:
            return [_decode_hdf5_value(file_handle, item) for item in value.flat]

        if np.issubdtype(value.dtype, np.integer):
            chars = [chr(int(item)) for item in value.flat if int(item) != 0]
            if chars:
                return "".join(chars)

        return value.tolist()

    if isinstance(value, np.generic):
        return value.item()

    return value

def _flatten_strings(value):
    if isinstance(value, str):
        return [value]

    if isinstance(value, list):
        output = []
        for item in value:
            output.extend(_flatten_strings(item))
        return output

    return [str(value)]

def _read_hdf5_elmodels(file_handle):
    decoded = _decode_hdf5_value(file_handle, file_handle['reco']['props']['elmodel'])
    return _flatten_strings(decoded)

def setup_app(file_path):
    elmodels = get_elmodels(file_path)
    patient_id = patientid(file_path)
    return elmodels, patient_id
