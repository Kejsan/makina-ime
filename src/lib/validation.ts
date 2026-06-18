export const VEHICLE_LIMITS = {
    nameLength: 80,
    minYear: 1886,
    maxMileage: 9_999_999,
    maxEngineCapacity: 100_000,
    maxMoney: 1_000_000_000,
    maxPlateLength: 15,
} as const;

export type VehicleField =
    | 'make'
    | 'model'
    | 'year'
    | 'plateNumber'
    | 'vin'
    | 'currentMileage'
    | 'engineCapacity'
    | 'estimatedValue';

export type VehicleDraft = Record<VehicleField, string>;
export type FieldErrors<T extends string = string> = Partial<Record<T, string>>;

export interface VehicleValues {
    make: string;
    model: string;
    year: number;
    plateNumber: string;
    vin: string;
    currentMileage: number;
    engineCapacity: number | null;
    estimatedValue: number | null;
}

export interface ValidationResult<T, K extends string = string> {
    value: T | null;
    errors: FieldErrors<K>;
}

const integerPattern = /^\d+$/;
const moneyPattern = /^\d+(?:\.\d{1,2})?$/;
const platePattern = /^[A-Z0-9](?:[A-Z0-9 -]{0,13}[A-Z0-9])?$/;
const vinPattern = /^[A-HJ-NPR-Z0-9]{17}$/;

export const maxVehicleYear = (now = new Date()) => now.getFullYear() + 1;

export const normalizeWhitespace = (value: string) => value.trim().replace(/\s+/g, ' ');
export const normalizePlate = (value: string) => normalizeWhitespace(value).toUpperCase();
export const normalizeVin = (value: string) => value.trim().toUpperCase();
export const plateError = (value: string) => {
    const normalized = normalizePlate(value);
    return normalized && (normalized.length > VEHICLE_LIMITS.maxPlateLength || !platePattern.test(normalized) || !/[A-Z]/.test(normalized) || !/\d/.test(normalized))
        ? 'Use 2-15 letters, numbers, spaces, or hyphens, including at least one letter and one number.'
        : undefined;
};
export const vinError = (value: string) => {
    const normalized = normalizeVin(value);
    return normalized && !vinPattern.test(normalized)
        ? 'VIN must contain exactly 17 valid characters and cannot include I, O, or Q.'
        : undefined;
};

export const parseInteger = (
    value: string,
    { min = 0, max, required = false }: { min?: number; max: number; required?: boolean },
) => {
    const normalized = value.trim();
    if (!normalized) return required ? { value: null, error: 'This field is required.' } : { value: null };
    if (!integerPattern.test(normalized)) return { value: null, error: 'Enter a whole number without signs or exponents.' };
    const parsed = Number(normalized);
    if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
        return { value: null, error: 'Enter a whole number within the allowed range.' };
    }
    return { value: parsed };
};

export const parseMoney = (value: string, { required = false, min = 0 }: { required?: boolean; min?: number } = {}) => {
    const normalized = value.trim();
    if (!normalized) return required ? { value: null, error: 'This field is required.' } : { value: null };
    if (!moneyPattern.test(normalized)) return { value: null, error: 'Enter a normal amount with no more than two decimal places.' };
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed) || parsed < min || parsed > VEHICLE_LIMITS.maxMoney) {
        return { value: null, error: 'Enter an amount within the allowed range.' };
    }
    return { value: parsed };
};

export const isValidDateInput = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

export const validateVehicleDraft = (draft: VehicleDraft, now = new Date()): ValidationResult<VehicleValues, VehicleField> => {
    const errors: FieldErrors<VehicleField> = {};
    const make = normalizeWhitespace(draft.make);
    const model = normalizeWhitespace(draft.model);
    const plateNumber = normalizePlate(draft.plateNumber);
    const vin = normalizeVin(draft.vin);

    if (!make) errors.make = 'Make is required.';
    else if (make.length > VEHICLE_LIMITS.nameLength) errors.make = 'Make must be 80 characters or fewer.';
    if (!model) errors.model = 'Model is required.';
    else if (model.length > VEHICLE_LIMITS.nameLength) errors.model = 'Model must be 80 characters or fewer.';

    const year = parseInteger(draft.year, { min: VEHICLE_LIMITS.minYear, max: maxVehicleYear(now), required: true });
    if (year.error) errors.year = year.error;

    const plateValidationError = plateError(plateNumber);
    const vinValidationError = vinError(vin);
    if (plateValidationError) errors.plateNumber = plateValidationError;
    if (vinValidationError) errors.vin = vinValidationError;

    const currentMileage = parseInteger(draft.currentMileage, { max: VEHICLE_LIMITS.maxMileage });
    if (currentMileage.error) errors.currentMileage = currentMileage.error;
    const engineCapacity = parseInteger(draft.engineCapacity, { min: 1, max: VEHICLE_LIMITS.maxEngineCapacity });
    if (engineCapacity.error) errors.engineCapacity = engineCapacity.error;
    const estimatedValue = parseMoney(draft.estimatedValue);
    if (estimatedValue.error) errors.estimatedValue = estimatedValue.error;

    if (Object.keys(errors).length > 0 || year.value === null) return { value: null, errors };
    return {
        value: {
            make,
            model,
            year: year.value,
            plateNumber,
            vin,
            currentMileage: currentMileage.value ?? 0,
            engineCapacity: engineCapacity.value ?? null,
            estimatedValue: estimatedValue.value ?? null,
        },
        errors,
    };
};

export const vehicleRecordErrors = (vehicle: Partial<Record<VehicleField, unknown>>, now = new Date()) => validateVehicleDraft({
    make: typeof vehicle.make === 'string' ? vehicle.make : '',
    model: typeof vehicle.model === 'string' ? vehicle.model : '',
    year: vehicle.year == null ? '' : String(vehicle.year),
    plateNumber: typeof vehicle.plateNumber === 'string' ? vehicle.plateNumber : '',
    vin: typeof vehicle.vin === 'string' ? vehicle.vin : '',
    currentMileage: vehicle.currentMileage == null ? '' : String(vehicle.currentMileage),
    engineCapacity: vehicle.engineCapacity == null ? '' : String(vehicle.engineCapacity),
    estimatedValue: vehicle.estimatedValue == null ? '' : String(vehicle.estimatedValue),
}, now).errors;
