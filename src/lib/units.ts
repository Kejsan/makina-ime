export type MeasurementSystem = 'metric' | 'imperial';

const KM_PER_MILE = 1.60934;

export const distanceUnit = (system: MeasurementSystem) => system === 'imperial' ? 'mi' : 'km';

export const storedKmToDisplayDistance = (kilometers: number, system: MeasurementSystem) => (
    system === 'imperial' ? Math.round(kilometers / KM_PER_MILE) : Math.round(kilometers)
);

export const displayDistanceToStoredKm = (distance: number, system: MeasurementSystem) => (
    system === 'imperial' ? Math.round(distance * KM_PER_MILE) : Math.round(distance)
);

export const formatDistance = (kilometers: number, system: MeasurementSystem) => (
    `${storedKmToDisplayDistance(kilometers, system).toLocaleString()} ${distanceUnit(system)}`
);
