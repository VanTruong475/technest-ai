import AppRoutes from "@/routes/AppRoutes";
import { Toaster } from "@/components/ui/sonner";
import ErrorBoundary from "@/components/common/ErrorBoundary";

function App() {
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
