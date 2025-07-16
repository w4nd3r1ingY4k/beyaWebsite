// src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import HomePage from "@/webapp/components/HomePage";
import Privacy from "./pages/Privacy";
import Login from "@/webapp/components/Login";
import SignUp from "@/webapp/components/Signup";
import Confirm from "@/webapp/components/Confirm";
import SettingsPage from "@/webapp/components/Settings";
import WebAppHome from "./webapp";
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
      <Route path="/webapp" element={<WebAppHome />} />
      <Route path="/settings" element={<SettingsPage />} />

      {/* Catch‐all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}