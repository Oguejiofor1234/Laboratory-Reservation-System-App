import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/common/Navbar';
import LoadingSpinner from './components/common/LoadingSpinner';
import ProtectedRoute from './components/common/ProtectedRoute';

// Pages
import LandingPublic from './pages/LandingPublic';
import AuthPage from './pages/AuthPage';
import BookingFlow from './pages/BookingFlow';
import Dashboard from './pages/Dashboard';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import NotFound from './pages/NotFound';
import Contact  from './pages/Contact';

// Dark-themed shell for authenticated/app routes
const AppShell = ({ children }) => (
  <div className="min-h-screen bg-dark-bg">
    <Navbar />
    {children}
  </div>
);

const App = () => {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* / — home page (landing) */}
        <Route path="/" element={<LandingPublic />} />
        <Route path="/home" element={<LandingPublic />} />

        {/* Auth pages — beautiful light-theme combined page */}
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<AuthPage />} />
        <Route path="/verify-email/:token" element={<AppShell><VerifyEmail /></AppShell>} />
        <Route path="/forgot-password" element={<AppShell><ForgotPassword /></AppShell>} />
        <Route path="/reset-password/:token" element={<AppShell><ResetPassword /></AppShell>} />
        <Route path="/contact" element={<Contact />} />

        {/* Protected app routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/book" element={<AppShell><BookingFlow /></AppShell>} />
          <Route path="/dashboard" element={<AppShell><Dashboard /></AppShell>} />
        </Route>

        <Route path="*" element={<AppShell><NotFound /></AppShell>} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
