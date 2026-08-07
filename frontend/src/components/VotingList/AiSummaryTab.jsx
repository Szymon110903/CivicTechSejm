import React, { useState, useEffect } from 'react';
import { AlertTriangle, Loader, RefreshCw, Zap, CheckCircle2, AlertCircle } from 'lucide-react';

const AiSummaryTab = ({ votingId }) => {
  const [summaryData, setSummaryData] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, pending, success, error
  const [errorMsg, setErrorMsg] = useState(null);

  const fetchSummary = async () => {
    try {
      const res = await fetch(`/api/votings/${votingId}/summary`);
      if (res.status === 404) {
        setStatus('idle');
        return;
      }
      const data = await res.json();
      if (data.status === 'success' && data.data) {
        setSummaryData(data.data);
        setStatus('success');
      } else if (data.status === 'pending') {
        setStatus('pending');
      } else {
        setStatus('idle');
      }
    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMsg('Nie udało się pobrać statusu analizy.');
    }
  };

  useEffect(() => {
    fetchSummary();
    
    // Polling if pending
    let intervalId;
    if (status === 'pending') {
      intervalId = setInterval(() => {
        fetchSummary();
      }, 5000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [votingId, status]);

  const generateSummary = async () => {
    setStatus('pending');
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/votings/${votingId}/generate-summary`, { method: 'POST' });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Wystąpił błąd podczas zlecania analizy.');
      }
      // Pomyślnie zlecono, status zmieniony na pending (uruchomi to polling z useEffect)
    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="card shadow-sm mb-4 border border-secondary-subtle bg-body-tertiary flex-grow-1">
      <div className="card-header bg-body p-4 border-bottom border-secondary d-flex align-items-center gap-2">
        <span className="fs-4">✨</span>
        <h3 className="h4 fw-bold mb-0 text-light">Podsumowanie AI</h3>
      </div>
      
      <div className="card-body p-4">
        {/* Disclaimer */}
        <div className="alert alert-warning d-flex align-items-start gap-3 border border-warning shadow-sm mb-4">
          <AlertTriangle size={24} className="flex-shrink-0 mt-1" />
          <div>
            <h5 className="alert-heading fw-bold">Uwaga: Treść wygenerowana przez Sztuczną Inteligencję</h5>
            <p className="mb-0">
              Poniższe podsumowanie zostało wygenerowane w sposób zautomatyzowany przez model językowy. 
              Mimo starań o jak najwyższą obiektywność, podsumowanie może zawierać błędy, pominięcia lub nadinterpretacje. 
              Zalecamy zapoznanie się z oryginalnymi drukami sejmowymi w zakładce <strong>"Podgląd PDF"</strong> przed wyciągnięciem ostatecznych wniosków.
            </p>
          </div>
        </div>

        {status === 'idle' && (
          <div className="text-center p-5 bg-body rounded-3 border border-secondary border-dashed my-4">
            <Zap size={48} className="text-warning mb-3" />
            <h4 className="text-light fw-bold">Brak wygenerowanego podsumowania</h4>
            <p className="text-muted mb-4 fs-5">
              To głosowanie dotyczy projektu, który nie został jeszcze przeanalizowany przez nasze algorytmy. 
              Możesz zlecić analizę teraz.
            </p>
            <button 
              className="btn btn-warning btn-lg fw-bold px-4 rounded-pill shadow"
              onClick={generateSummary}
            >
              Wygeneruj analizę AI (ok. 10-30 sekund)
            </button>
          </div>
        )}

        {status === 'pending' && (
          <div className="text-center p-5 bg-body rounded-3 border border-secondary border-dashed my-4 d-flex flex-column align-items-center justify-content-center">
            <div className="spinner-border text-warning mb-3" style={{ width: '3rem', height: '3rem' }} role="status"></div>
            <h4 className="text-light fw-bold">Analiza w toku...</h4>
            <p className="text-muted mb-0">Model językowy analizuje właśnie Uzasadnienie i OSR dla tej ustawy. Może to potrwać kilkanaście sekund. Proszę czekać...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="alert alert-danger d-flex align-items-center gap-2 p-4 rounded-3 border border-danger">
            <AlertCircle size={24} />
            <span className="fs-5">{errorMsg}</span>
          </div>
        )}

        {status === 'success' && summaryData && (
          <div className="analysis-result fade-in">
            {summaryData.summary && (
              <div className="mb-4 bg-body p-4 rounded-3 border border-secondary shadow-sm">
                <h5 className="text-info fw-bold mb-3">Główne założenia (Krótkie podsumowanie)</h5>
                <p className="text-light fs-5 mb-0" style={{ lineHeight: '1.6' }}>{summaryData.summary}</p>
              </div>
            )}
            
            <div className="row g-4">
              <div className="col-12 col-lg-6">
                 {summaryData.affected_groups && summaryData.affected_groups.length > 0 && (
                  <div className="bg-body p-4 rounded-3 border border-secondary h-100 shadow-sm">
                    <h5 className="text-success fw-bold mb-3">Kogo dotyczy ustawa?</h5>
                    <ul className="list-group list-group-flush border-0">
                      {summaryData.affected_groups.map((group, idx) => (
                        <li key={idx} className="list-group-item bg-transparent text-light border-secondary px-0 py-2 d-flex gap-2">
                          <CheckCircle2 size={18} className="text-success mt-1 flex-shrink-0" />
                          <span>{group}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                 )}
              </div>
              <div className="col-12 col-lg-6">
                {summaryData.changes && (
                  <div className="bg-body p-4 rounded-3 border border-secondary h-100 shadow-sm">
                    <h5 className="text-warning fw-bold mb-3">Zmieniane obszary</h5>
                    <p className="text-light mb-0" style={{ lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{summaryData.changes}</p>
                  </div>
                )}
              </div>
            </div>
            
            {summaryData.consequences && (
              <div className="mt-4 bg-body p-4 rounded-3 border border-secondary shadow-sm">
                <h5 className="text-danger fw-bold mb-3">Główne konsekwencje (finansowe, społeczne, prawne)</h5>
                <p className="text-light mb-0" style={{ lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{summaryData.consequences}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AiSummaryTab;
