// src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./pages/HomePage";
import Privacy from "./pages/Privacy";
import Login from "./pages/Login";
import Home from "./pages/webApp";
import SignUp from "./pages/Signup";
import Confirm from "./pages/Confirm";
import SettingsPage from "./pages/Settings";

export default function App() {
  return (
    <Routes>
      {/* Public pages */}
      <Route path="/"       element={<HomePage />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/login"   element={<Login />} />
      <Route path="/signup"  element={<SignUp />} />
      <Route path="/confirm" element={<Confirm />} />

      {/* Protected webapp */}
      <Route path="/webapp" element={<Home />} />
      <Route path="/settings" element={<SettingsPage />} />

      {/* Catch‐all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}