import { useEffect } from "react";
import AppRoutes from "@/routes/AppRoutes";
import { Toaster } from "@/components/ui/sonner";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import { useAuthStore } from "@/store/authStore";

function App() {
  const fetchCurrentUser = useAuthStore((s) => s.fetchCurrentUser);

  // Always re-validate HttpOnly session cookie on mount (user in localStorage is non-secret cache only)
  useEffect(() => {
    void fetchCurrentUser();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <ErrorBoundary>
        <AppRoutes />
      </ErrorBoundary>
      <Toaster />
    </>
  );
}

export default App;
