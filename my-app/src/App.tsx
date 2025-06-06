import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import HomePage from "./pages/HomePage";
import Privacy from "./pages/Privacy";
import Login from "./webapp/pages/Login";
import Homes from "./webapp/pages/Home";
import SignUp from "./webapp/pages/Signup";
import Confirm from "./webapp/pages/Confirm";
import SettingsPage from "./webapp/pages/Settings";
import { AuthProvider } from "./AuthContext";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/privacy" element={<Privacy />} />

          <Route path="/login" element={<Login />} />
          <Route path="/webapp" element={<Homes />} />
          <Route path="/signup"  element={<SignUp />} />
          <Route path="/confirm" element={<Confirm />} />
          <Route path="/settings" element={<SettingsPage />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}