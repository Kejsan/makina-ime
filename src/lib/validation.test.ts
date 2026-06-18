import assert from 'node:assert/strict';
import test from 'node:test';
import { parseInteger, parseMoney, validateVehicleDraft } from './validation.ts';

const validDraft = {
    make: 'Volkswagen',
    model: 'Golf',
    year: '2020',
    plateNumber: 'ab 123 cd',
    vin: 'WVWZZZ1JZXW000001',
    currentMileage: '120000',
    engineCapacity: '1598',
    estimatedValue: '6500.50',
};

test('normalizes and accepts a valid international vehicle profile', () => {
    const result = validateVehicleDraft(validDraft, new Date('2026-06-18T00:00:00Z'));
    assert.deepEqual(result.errors, {});
    assert.equal(result.value?.plateNumber, 'AB 123 CD');
    assert.equal(result.value?.estimatedValue, 6500.5);
});

test('rejects values reported in the usability screenshot', () => {
    const result = validateVehicleDraft({
        ...validDraft,
        year: '20000000',
        plateNumber: 'Ndosnwksmsm',
        vin: '$$83wmaok1-nfowns',
        currentMileage: '-e7720',
    }, new Date('2026-06-18T00:00:00Z'));
    assert.ok(result.errors.year);
    assert.ok(result.errors.plateNumber);
    assert.ok(result.errors.vin);
    assert.ok(result.errors.currentMileage);
    assert.equal(result.value, null);
});

test('rejects exponent, signed, decimal, and out-of-range integers', () => {
    for (const value of ['1e5', '-1', '+1', '1.5', '10000000']) {
        assert.ok(parseInteger(value, { max: 9_999_999 }).error, value);
    }
});

test('accepts two-decimal money and rejects malformed money', () => {
    assert.equal(parseMoney('100.25', { required: true }).value, 100.25);
    for (const value of ['1e3', '-1', '12.345', 'NaN', 'Infinity']) {
        assert.ok(parseMoney(value, { required: true }).error, value);
    }
});

test('accepts the next model year and rejects later years', () => {
    assert.ok(validateVehicleDraft({ ...validDraft, year: '2027' }, new Date('2026-06-18T00:00:00Z')).value);
    assert.ok(validateVehicleDraft({ ...validDraft, year: '2028' }, new Date('2026-06-18T00:00:00Z')).errors.year);
});
