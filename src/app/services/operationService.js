export const saveOperation = async ({
  operationId,
  account,
  deposit,
  result,
  token,
}) => {
  const response = await fetch("/api/operation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      operationId,
      account,
      deposit,
      result,
      token,
    }),
  });
  return response;
};
