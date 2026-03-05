import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Analytics from "./pages/Analytics";
import Accounts from "./pages/Accounts";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import StatementUpload from "./pages/StatementUpload";
import StatementInterview from "./pages/StatementInterview";
import ReviewComplete from "./pages/ReviewComplete";
import ReceiptScan from "./pages/ReceiptScan";
import MissionAccomplished from "./pages/MissionAccomplished";
import BottomNav from "./components/BottomNav";
import AddTransactionSheet from "./components/AddTransactionSheet";
import AmbientBackground from "./components/AmbientBackground";

const queryClient = new QueryClient();

const ProtectedLayout = () => {
  const { user, loading } = useAuth();
  const [showAdd, setShowAdd] = useState(false);

  if (loading) {
    return (
      <div className="bg-deep-sea min-h-screen flex items-center justify-center">
        <div className="text-primary animate-pulse text-2xl font-bold">Lumina</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="bg-deep-sea min-h-screen relative overflow-x-hidden">
      <AmbientBackground />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/statement-upload" element={<StatementUpload />} />
        <Route path="/statement-interview/:importId" element={<StatementInterview />} />
        <Route path="/review-complete/:importId" element={<ReviewComplete />} />
        <Route path="/mission-accomplished" element={<MissionAccomplished />} />
        <Route path="/receipt-scan" element={<ReceiptScan />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <BottomNav onAddClick={() => setShowAdd(true)} />
      <AddTransactionSheet open={showAdd} onOpenChange={setShowAdd} />
    </div>
  );
};

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="bg-deep-sea min-h-screen flex items-center justify-center">
        <div className="text-primary animate-pulse text-2xl font-bold">Lumina</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <Auth />} />
      <Route path="/*" element={<ProtectedLayout />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
