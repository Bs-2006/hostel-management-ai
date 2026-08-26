import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Rooms from "./pages/Rooms";
import Outings from "./pages/Outings";
import Complaints from "./pages/Complaints";
import Attendance from "./pages/Attendance";
import FoodMenu from "./pages/FoodMenu";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/rooms" element={<Rooms />} />
        <Route path="/outings" element={<Outings />} />
        <Route path="/complaints" element={<Complaints />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/food-menu" element={<FoodMenu />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;