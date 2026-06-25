import { onDocumentCreated, onDocumentWritten } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

admin.initializeApp();

/**
 * Trigger: When a new reminder is created, validate it.
 */
export const onReminderCreate = onDocumentCreated("reminders/{reminderId}", (event) => {
      const newValue = event.data?.data();
      if (!newValue) return null;
      console.log("New reminder created", { reminderId: event.params.reminderId, userId: newValue.userId });
      return null;
    });

const auditExcludedFields = new Set([
    "path", "url", "downloadUrl", "uploadUrl", "privateKey", "token", "rawText",
]);

const sanitizeAuditData = (value: FirebaseFirestore.DocumentData | undefined) => {
    if (!value) return undefined;
    return Object.fromEntries(Object.entries(value).flatMap(([key, item]) => {
        if (auditExcludedFields.has(key)) return [];
        if (item === null || ["string", "number", "boolean"].includes(typeof item)) return [[key, item]];
        if (item instanceof admin.firestore.Timestamp) return [[key, item]];
        if (Array.isArray(item)) return [[key, item.slice(0, 50).map((entry) => typeof entry === "object" ? "[record]" : entry)]];
        return [];
    }));
};

const writeAuditEvent = async ({
    organizationId,
    vehicleId,
    recordType,
    recordId,
    before,
    after,
}: {
    organizationId: string;
    vehicleId?: string | null;
    recordType: string;
    recordId: string;
    before?: FirebaseFirestore.DocumentData;
    after?: FirebaseFirestore.DocumentData;
}) => {
    const actorId = after?.updatedBy || after?.archivedBy || after?.createdBy || before?.updatedBy || before?.archivedBy || before?.createdBy || "system";
    const changedFields = Array.from(new Set([...Object.keys(before || {}), ...Object.keys(after || {})]))
        .filter((key) => !auditExcludedFields.has(key) && JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key]));
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

export const auditOrganizationVehicle = onDocumentWritten("vehicles/{vehicleId}", async (event) => {
    const before = event.data?.before.exists ? event.data.before.data() : undefined;
    const after = event.data?.after.exists ? event.data.after.data() : undefined;
    const data = after || before;
    if (data?.ownerType !== "organization") return;
    const organizationId = data.ownerId || data.organizationId;
    if (!organizationId) return;
    await writeAuditEvent({ organizationId, vehicleId: event.params.vehicleId, recordType: "vehicle", recordId: event.params.vehicleId, before, after });
});

export const auditVehicleOperation = onDocumentWritten("vehicles/{vehicleId}/{recordType}/{recordId}", async (event) => {
    const before = event.data?.before.exists ? event.data.before.data() : undefined;
    const after = event.data?.after.exists ? event.data.after.data() : undefined;
    const data = after || before;
    const vehicle = await admin.firestore().collection("vehicles").doc(event.params.vehicleId).get();
    const vehicleData = vehicle.data();
    const organizationId = data?.organizationId || vehicleData?.ownerId || vehicleData?.organizationId;
    if (vehicleData?.ownerType !== "organization" || !organizationId) return;
    await writeAuditEvent({ organizationId, vehicleId: event.params.vehicleId, recordType: event.params.recordType, recordId: event.params.recordId, before, after });
});

export const auditOrganizationOperation = onDocumentWritten("organizations/{organizationId}/{recordType}/{recordId}", async (event) => {
    if (event.params.recordType === "auditEvents") return;
    const before = event.data?.before.exists ? event.data.before.data() : undefined;
    const after = event.data?.after.exists ? event.data.after.data() : undefined;
    await writeAuditEvent({ organizationId: event.params.organizationId, recordType: event.params.recordType, recordId: event.params.recordId, before, after });
});
