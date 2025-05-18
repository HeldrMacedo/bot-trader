import { Suspense } from "react";
import ResetPasswordPage from "./ResetPasswordContent";

export default function Page() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <ResetPasswordPage />
    </Suspense>
  );
}
