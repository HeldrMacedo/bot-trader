/**
 * Persists a real-account operation. Virtual (demo) operations are skipped.
 * Accepts the fields built by buildOperationRecord plus the user's JWT.
 */
export const saveOperation = async ({ isVirtual, ...operation }) => {
  if (isVirtual) return false;
  const response = await fetch("/api/operation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(operation),
  });
  return response;
};
