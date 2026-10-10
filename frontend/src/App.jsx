import { BrowserRouter, Routes, Route } from "react-router-dom";
import Setup from "./pages/Setup";
import Room from "./pages/Room";
import Report from "./pages/Report";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Setup />} />
        <Route path="/room" element={<Room />} />
        <Route path="/report" element={<Report />} />
      </Routes>
    </BrowserRouter>
  );
}
