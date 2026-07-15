import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, Users, FileText } from 'lucide-react';
import './Sidebar.css';

const Sidebar = () => {
  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        <span className="logo-icon">🏛️</span>
        <span className="logo-text">Sejm</span>
      </div>
      
      <div className="sidebar-links">
        <NavLink to="/" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} end>
          <Calendar className="link-icon" size={20} />
          <span className="link-text">Posiedzenia</span>
        </NavLink>
        
        <NavLink to="/glosowania" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <LayoutDashboard className="link-icon" size={20} />
          <span className="link-text">Głosowania</span>
        </NavLink>
        
        {/* Placeholders for future tabs */}
        <NavLink to="/poslowie" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Users className="link-icon" size={20} />
          <span className="link-text">Posłowie</span>
        </NavLink>
        
        <NavLink to="/projekty" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <FileText className="link-icon" size={20} />
          <span className="link-text">Projekty</span>
        </NavLink>
      </div>
    </nav>
  );
};

export default Sidebar;
