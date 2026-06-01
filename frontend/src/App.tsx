import { useEffect } from "react";
import AppRoutes from "@/routes/AppRoutes";
import { Toaster } from "@/components/ui/sonner";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import { useAuthStore } from "@/store/authStore";

function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const fetchCurrentUser = useAuthStore((s) => s.fetchCurrentUser);

  // Verify token is still valid on app startup
  useEffect(() => {
    if (isAuthenticated) {
      fetchCurrentUser();
    }
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
