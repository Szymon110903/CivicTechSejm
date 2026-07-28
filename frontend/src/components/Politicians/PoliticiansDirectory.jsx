import React from 'react';
import './Politicians.css';

const PoliticiansDirectory = () => {
  return (
    <div className="container-fluid h-100 p-3">
      <div className="row h-100">
        {/* Główna sekcja z półkolem */}
        <div className="col-lg-8 col-xl-9 d-flex flex-column mb-3 mb-lg-0">
          <div className="card bg-dark border-secondary h-100 shadow">
            <div className="card-header border-secondary text-light">
              <h5 className="mb-0">Sala Plenarna Sejmu</h5>
            </div>
            <div className="card-body d-flex flex-column align-items-center justify-content-center">
              <p className="text-muted">Trwa budowa interaktywnej sali...</p>
            </div>
          </div>
        </div>
        
        {/* Panel boczny */}
        <div className="col-lg-4 col-xl-3 d-flex flex-column">
          <div className="card bg-dark border-secondary h-100 shadow">
            <div className="card-header border-secondary text-light">
              <h5 className="mb-0">Panel Posła</h5>
            </div>
            <div className="card-body text-light">
              <p className="text-muted">Wybierz miejsce na sali, aby zobaczyć szczegóły.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PoliticiansDirectory;
