import type { MaintenanceInsight, MaintenanceRuleCategory, ServiceRecord, Vehicle } from './types';

type RuleConfig = {
    category: MaintenanceRuleCategory;
    id: string;
    titleKey: string;
    detailKey: string;
    actionKey: string;
    matcher: RegExp;
    intervalKm?: number;
    intervalMonths?: number;
};

const KM_PER_MILE = 1.60934;
const dueSoonKm = 1500;
const dueSoonDays = 30;

export const defaultMaintenanceRules: RuleConfig[] = [
    {
        id: 'oil',
        category: 'oil',
        titleKey: 'Oil and filter change',
        detailKey: 'Based on the latest matching service record and current odometer.',
        actionKey: 'Create oil reminder',
        matcher: /\b(oil|vaj|filter|filtra|filteri)\b/i,
        intervalKm: 10000,
        intervalMonths: 12,
    },
    {
        id: 'tires',
        category: 'tires',
        titleKey: 'Tire rotation and pressure check',
        detailKey: 'Tire care uses mileage guidance and should still follow the tire label and owner manual.',
        actionKey: 'Create tire reminder',
        matcher: /\b(tire|tyre|gom|goma|rotation|rotacion|pressure|presion)\b/i,
        intervalKm: Math.round(6000 * KM_PER_MILE),
    },
    {
        id: 'brakes',
        category: 'brakes',
        titleKey: 'Brake inspection',
        detailKey: 'Brake checks are suggested from service history and mileage, with driver symptoms taking priority.',
        actionKey: 'Create brake reminder',
        matcher: /\b(brake|brakes|frena|frenat|disk|pad|pads)\b/i,
        intervalKm: 15000,
    },
    {
        id: 'filters',
        category: 'filters',
        titleKey: 'Air and cabin filters',
        detailKey: 'Filter suggestions are based on matching service notes and a conservative default interval.',
        actionKey: 'Create filter reminder',
        matcher: /\b(air filter|cabin filter|filter ajri|filter kabine|filtri i ajrit|filtri i kabines)\b/i,
        intervalKm: 20000,
    },
    {
        id: 'fluids',
        category: 'fluids',
        titleKey: 'Coolant and fluid check',
        detailKey: 'Fluid checks are time-based defaults unless a specific service record is available.',
        actionKey: 'Create fluid reminder',
        matcher: /\b(coolant|antifreeze|fluid|fluids|frenave|antifriz|leng)\b/i,
        intervalMonths: 24,
    },
];

const dateFromService = (service: ServiceRecord) => service.date?.toDate?.() || null;

const addMonths = (date: Date, months: number) => {
    const next = new Date(date);
    next.setMonth(next.getMonth() + months);
    return next;
};

const daysUntil = (date: Date) => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
};

const getLatestMatchingService = (services: ServiceRecord[], matcher: RegExp) => {
    return services
        .filter((service) => matcher.test(service.description || ''))
        .sort((left, right) => {
            const rightDate = dateFromService(right)?.getTime() || 0;
            const leftDate = dateFromService(left)?.getTime() || 0;
            return rightDate - leftDate;
        })[0];
};

const getLatestService = (services: ServiceRecord[]) => {
    return services
        .filter((service) => service.date?.toDate || service.mileage)
        .sort((left, right) => {
            const rightDate = dateFromService(right)?.getTime() || 0;
            const leftDate = dateFromService(left)?.getTime() || 0;
            return rightDate - leftDate;
        })[0];
};

const statusFromRemaining = (remainingKm?: number, daysRemaining?: number) => {
    if (remainingKm !== undefined && remainingKm <= 0) return 'overdue';
    if (daysRemaining !== undefined && daysRemaining <= 0) return 'overdue';
    if (remainingKm !== undefined && remainingKm <= dueSoonKm) return 'due_soon';
    if (daysRemaining !== undefined && daysRemaining <= dueSoonDays) return 'due_soon';
    return 'ok';
};

const getConfiguredIntervalKm = (vehicle: Vehicle, rule: RuleConfig) => {
    const profile = vehicle.maintenanceProfile;
    if (rule.category === 'oil') return profile?.oilIntervalKm || (profile?.severeUsage ? 7500 : rule.intervalKm);
    if (rule.category === 'tires') return profile?.tireRotationIntervalKm || rule.intervalKm;
    if (rule.category === 'brakes') return profile?.brakeInspectionIntervalKm || rule.intervalKm;
    if (rule.category === 'filters') return profile?.filterIntervalKm || rule.intervalKm;
    return rule.intervalKm;
};

const getConfiguredIntervalMonths = (vehicle: Vehicle, rule: RuleConfig) => {
    const profile = vehicle.maintenanceProfile;
    if (rule.category === 'oil') return profile?.oilIntervalMonths || (profile?.severeUsage ? 6 : rule.intervalMonths);
    if (rule.category === 'fluids') return profile?.coolantIntervalMonths || rule.intervalMonths;
    return rule.intervalMonths;
};

const buildRuleInsight = (vehicle: Vehicle, services: ServiceRecord[], rule: RuleConfig): MaintenanceInsight => {
    const currentMileage = vehicle.currentMileage || 0;
    const matchingService = getLatestMatchingService(services, rule.matcher);
    const lastDate = matchingService ? dateFromService(matchingService) || undefined : undefined;
    const lastMileage = matchingService?.mileage || undefined;
    const intervalKm = getConfiguredIntervalKm(vehicle, rule);
    const intervalMonths = getConfiguredIntervalMonths(vehicle, rule);

    if (!currentMileage || !matchingService) {
        return {
            id: rule.id,
            category: rule.category,
            status: 'setup_needed',
            titleKey: rule.titleKey,
            detailKey: !currentMileage
                ? 'No current mileage is saved yet. Add the odometer reading to unlock mileage-based care suggestions.'
                : 'No matching service record was found. Add the last completed service to improve this suggestion.',
            actionKey: rule.actionKey,
            basis: 'service_history',
            confidence: 'default',
        };
    }

    const dueMileage = intervalKm && lastMileage ? lastMileage + intervalKm : undefined;
    const dueDate = intervalMonths && lastDate ? addMonths(lastDate, intervalMonths) : undefined;
    const remainingKm = dueMileage ? dueMileage - currentMileage : undefined;
    const daysRemaining = dueDate ? daysUntil(dueDate) : undefined;

    return {
        id: rule.id,
        category: rule.category,
        status: statusFromRemaining(remainingKm, daysRemaining),
        titleKey: rule.titleKey,
        detailKey: rule.detailKey,
        actionKey: rule.actionKey,
        basis: dueMileage && dueDate ? 'mileage_and_date' : dueMileage ? 'mileage' : 'date',
        dueMileage,
        dueDate,
        remainingKm,
        daysRemaining,
        lastServiceMileage: lastMileage,
        lastServiceDate: lastDate,
        confidence: vehicle.maintenanceProfile ? 'user_configured' : 'service_history',
    };
};

const buildTimingBeltInsight = (vehicle: Vehicle, services: ServiceRecord[]): MaintenanceInsight => {
    const profile = vehicle.maintenanceProfile;
    const currentMileage = vehicle.currentMileage || 0;
    const timingService = getLatestMatchingService(services, /\b(timing|belt|rrip|rrethim|chain|zinxhir)\b/i);
    const lastDate = timingService ? dateFromService(timingService) || undefined : undefined;
    const lastMileage = timingService?.mileage || undefined;

    if (!profile?.timingBeltKnown || (!profile.timingBeltIntervalKm && !profile.timingBeltIntervalMonths)) {
        return {
            id: 'timing-belt',
            category: 'timing_belt',
            status: 'setup_needed',
            titleKey: 'Timing belt schedule',
            detailKey: 'Timing belt intervals are manufacturer-specific. Add the belt interval from the owner manual before relying on this suggestion.',
            actionKey: 'Create timing belt reminder',
            basis: 'service_history',
            confidence: 'default',
        };
    }

    const dueMileage = profile.timingBeltIntervalKm
        ? (lastMileage ? lastMileage + profile.timingBeltIntervalKm : profile.timingBeltIntervalKm)
        : undefined;
    const dueDate = profile.timingBeltIntervalMonths && lastDate ? addMonths(lastDate, profile.timingBeltIntervalMonths) : undefined;
    const remainingKm = dueMileage && currentMileage ? dueMileage - currentMileage : undefined;
    const daysRemaining = dueDate ? daysUntil(dueDate) : undefined;

    return {
        id: 'timing-belt',
        category: 'timing_belt',
        status: currentMileage || dueDate ? statusFromRemaining(remainingKm, daysRemaining) : 'setup_needed',
        titleKey: 'Timing belt schedule',
        detailKey: timingService
            ? 'Based on the latest matching service record and current odometer.'
            : 'No matching service record was found. Add the last completed service to improve this suggestion.',
        actionKey: 'Create timing belt reminder',
        basis: dueMileage && dueDate ? 'mileage_and_date' : dueMileage ? 'mileage' : 'date',
        dueMileage,
        dueDate,
        remainingKm,
        daysRemaining,
        lastServiceMileage: lastMileage,
        lastServiceDate: lastDate,
        confidence: 'user_configured',
    };
};

export const buildMaintenanceInsights = (vehicle: Vehicle, services: ServiceRecord[]) => [
    ...defaultMaintenanceRules.map((rule) => buildRuleInsight(vehicle, services, rule)),
    buildTimingBeltInsight(vehicle, services),
];

export const getLatestServiceSnapshot = (services: ServiceRecord[]) => {
    const service = getLatestService(services);
    if (!service) return null;
    return {
        mileage: service.mileage,
        date: dateFromService(service),
        description: service.description,
    };
};
