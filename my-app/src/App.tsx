import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// Example Pages
import HomePage from "./pages/HomePage";
import Privacy from "./pages/Privacy";
// import AboutPage from "./pages/AboutPage";
// import BlogPage from "./pages/BlogPage";

export default function App() {
  return (
    <    BrowserRouter
>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}