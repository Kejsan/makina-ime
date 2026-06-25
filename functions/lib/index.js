"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditOrganizationOperation = exports.auditVehicleOperation = exports.auditOrganizationVehicle = exports.onReminderCreate = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
admin.initializeApp();
/**
 * Trigger: When a new reminder is created, validate it.
 */
exports.onReminderCreate = (0, firestore_1.onDocumentCreated)("reminders/{reminderId}", (event) => {
    var _a;
    const newValue = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!newValue)
        return null;
    console.log("New reminder created", { reminderId: event.params.reminderId, userId: newValue.userId });
    return null;
});
const auditExcludedFields = new Set([
    "path", "url", "downloadUrl", "uploadUrl", "privateKey", "token", "rawText",
]);
const sanitizeAuditData = (value) => {
    if (!value)
        return undefined;
    return Object.fromEntries(Object.entries(value).flatMap(([key, item]) => {
        if (auditExcludedFields.has(key))
            return [];
        if (item === null || ["string", "number", "boolean"].includes(typeof item))
            return [[key, item]];
        if (item instanceof admin.firestore.Timestamp)
            return [[key, item]];
        if (Array.isArray(item))
            return [[key, item.slice(0, 50).map((entry) => typeof entry === "object" ? "[record]" : entry)]];
        return [];
    }));
};
const writeAuditEvent = async ({ organizationId, vehicleId, recordType, recordId, before, after, }) => {
    const actorId = (after === null || after === void 0 ? void 0 : after.updatedBy) || (after === null || after === void 0 ? void 0 : after.archivedBy) || (after === null || after === void 0 ? void 0 : after.createdBy) || (before === null || before === void 0 ? void 0 : before.updatedBy) || (before === null || before === void 0 ? void 0 : before.archivedBy) || (before === null || before === void 0 ? void 0 : before.createdBy) || "system";
    const changedFields = Array.from(new Set([...Object.keys(before || {}), ...Object.keys(after || {})]))
        .filter((key) => !auditExcludedFields.has(key) && JSON.stringify(before === null || before === void 0 ? void 0 : before[key]) !== JSON.stringify(after === null || after === void 0 ? void 0 : after[key]));
    const action = !before
        ? "create"
        : !after
            ? "delete"
            : !before.archivedAt && after.archivedAt
                ? "archive"
                : before.archivedAt && !after.archivedAt
                    ? "restore"
                    : "update";
    await admin.firestore().collection("organizations").doc(organizationId).collection("auditEvents").add({
        organizationId,
        vehicleId: vehicleId || null,
        actorId,
        action,
        recordType,
        recordId,
        changedFields,
        before: sanitizeAuditData(before) || null,
        after: sanitizeAuditData(after) || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
};
exports.auditOrganizationVehicle = (0, firestore_1.onDocumentWritten)("vehicles/{vehicleId}", async (event) => {
    var _a, _b;
    const before = ((_a = event.data) === null || _a === void 0 ? void 0 : _a.before.exists) ? event.data.before.data() : undefined;
    const after = ((_b = event.data) === null || _b === void 0 ? void 0 : _b.after.exists) ? event.data.after.data() : undefined;
    const data = after || before;
    if ((data === null || data === void 0 ? void 0 : data.ownerType) !== "organization")
        return;
    const organizationId = data.ownerId || data.organizationId;
    if (!organizationId)
        return;
    await writeAuditEvent({ organizationId, vehicleId: event.params.vehicleId, recordType: "vehicle", recordId: event.params.vehicleId, before, after });
});
exports.auditVehicleOperation = (0, firestore_1.onDocumentWritten)("vehicles/{vehicleId}/{recordType}/{recordId}", async (event) => {
    var _a, _b;
    const before = ((_a = event.data) === null || _a === void 0 ? void 0 : _a.before.exists) ? event.data.before.data() : undefined;
    const after = ((_b = event.data) === null || _b === void 0 ? void 0 : _b.after.exists) ? event.data.after.data() : undefined;
    const data = after || before;
    const vehicle = await admin.firestore().collection("vehicles").doc(event.params.vehicleId).get();
    const vehicleData = vehicle.data();
    const organizationId = (data === null || data === void 0 ? void 0 : data.organizationId) || (vehicleData === null || vehicleData === void 0 ? void 0 : vehicleData.ownerId) || (vehicleData === null || vehicleData === void 0 ? void 0 : vehicleData.organizationId);
    if ((vehicleData === null || vehicleData === void 0 ? void 0 : vehicleData.ownerType) !== "organization" || !organizationId)
        return;
    await writeAuditEvent({ organizationId, vehicleId: event.params.vehicleId, recordType: event.params.recordType, recordId: event.params.recordId, before, after });
});
exports.auditOrganizationOperation = (0, firestore_1.onDocumentWritten)("organizations/{organizationId}/{recordType}/{recordId}", async (event) => {
    var _a, _b;
    if (event.params.recordType === "auditEvents")
        return;
    const before = ((_a = event.data) === null || _a === void 0 ? void 0 : _a.before.exists) ? event.data.before.data() : undefined;
    const after = ((_b = event.data) === null || _b === void 0 ? void 0 : _b.after.exists) ? event.data.after.data() : undefined;
    await writeAuditEvent({ organizationId: event.params.organizationId, recordType: event.params.recordType, recordId: event.params.recordId, before, after });
});
//# sourceMappingURL=index.js.map