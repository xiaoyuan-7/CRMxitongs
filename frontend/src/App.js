import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from 'antd';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CompanyList from './pages/CompanyList';
import CompanyDetail from './pages/CompanyDetail';
import ContactDetail from './pages/ContactDetail';
import Reminders from './pages/Reminders';
import WeekPlan from './pages/WeekPlan';
import Settings from './pages/Settings';
import MainLayout from './components/MainLayout';

const { Content } = Layout;

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="companies" element={<CompanyList />} />
          <Route path="companies/:id" element={<CompanyDetail />} />
          <Route path="contacts/:id" element={<ContactDetail />} />
          <Route path="reminders" element={<Reminders />} />
          <Route path="week-plan" element={<WeekPlan />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
