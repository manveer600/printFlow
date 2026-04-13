import { Routes, Route, Navigate } from "react-router-dom";
import { getToken } from "./api.js";
import Layout from "./components/Layout.jsx";
import ReminderAlarm from "./components/ReminderAlarm.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Orders from "./pages/Orders.jsx";
import OrderForm from "./pages/OrderForm.jsx";
import Customers from "./pages/Customers.jsx";
import Payments from "./pages/Payments.jsx";
import Settings from "./pages/Settings.jsx";

function PrivateRoute({ children }) {
  if (!getToken()) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <>
      <ReminderAlarm />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/new" element={<OrderForm />} />
          <Route path="orders/:id" element={<OrderForm />} />
          <Route path="customers" element={<Customers />} />
          <Route path="customers/:id" element={<Customers />} />
          <Route path="payments" element={<Payments />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
