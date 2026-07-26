import React, { useState, useEffect } from 'react';
import { X, Calendar, Users, FileText, CheckCircle2, XCircle, AlertCircle, Download, ExternalLink, ShieldCheck } from 'lucide-react';
import DocViewer, { DocViewerRenderers } from '@cyntler/react-doc-viewer';
import '@cyntler/react-doc-viewer/dist/index.css';
import './VotingDetailsView.css';

const VotingDetailsView = ({ voting, onClose, context }) => {
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [docError, setDocError] = useState(null);
  const [activeDocIndex, setActiveDocIndex] = useState(0);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Fetch related documents (druki)
  useEffect(() => {
    if (!voting?.id) return;

    const fetchDocuments = async () => {
      setLoadingDocs(true);
      setDocError(null);
      try {
        const response = await fetch(`/api/votings/${voting.id}/documents`);
        if (!response.ok) {
          throw new Error('Nie udało się pobrać dokumentów dla tego głosowania.');
        }
        const data = await response.json();
        setDocuments(data);
        setActiveDocIndex(0);
      } catch (err) {
        setDocError(err.message);
      } finally {
        setLoadingDocs(false);
      }
    };

    fetchDocuments();
  }, [voting?.id]);

  if (!voting) return null;

  const {
    voting_number,
    title,
    topic,
    description,
    results,
    club_results
  } = voting;

  const sitting = context?.sitting || voting.sitting || 'X';
  const dateStr = context?.date || voting.date;
  const formattedDate = dateStr ? new Date(dateStr).toLocaleDateString('pl-PL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : 'Brak daty';

  const passed = results?.passed;
  const yesCount = results?.yes || 0;
  const noCount = results?.no || 0;
  const abstainCount = results?.abstain || 0;
  const notVotedCount = results?.not_voted || 0;
  const totalVotes = yesCount + noCount + abstainCount;

  const yesPercent = totalVotes > 0 ? ((yesCount / totalVotes) * 100).toFixed(1) : '0';
  const noPercent = totalVotes > 0 ? ((noCount / totalVotes) * 100).toFixed(1) : '0';
  const abstainPercent = totalVotes > 0 ? ((abstainCount / totalVotes) * 100).toFixed(1) : '0';

  const docViewerDocs = documents.map(doc => ({
    uri: `/api/bills/documents/${doc.id}/download`,
    fileName: doc.filename
  }));

  const getDecisionBadge = (decision) => {
    const dec = String(decision).toUpperCase();
    switch (dec) {
      case 'YES':
      case 'ZA':
        return <span className="club-decision-badge za">ZA</span>;
      case 'NO':
      case 'PRZECIW':
        return <span className="club-decision-badge przeciw">PRZECIW</span>;
      case 'ABSTAIN':
      case 'WSTRZYMAŁ SIĘ':
        return <span className="club-decision-badge wstrzymal">WSTRZYMAŁ SIĘ</span>;
      case 'SPLIT':
      case 'PODZIELENI':
        return <span className="club-decision-badge podzieleni">PODZIELENI</span>;
      default:
        return <span className="club-decision-badge inne">{dec}</span>;
    }
  };

  return (
    <div className="voting-details-overlay" onClick={(e) => {
      if (e.target.className === 'voting-details-overlay') onClose();
    }}>
      <div className="voting-details-modal-card" id={`voting-detail-modal-${voting.id}`}>
        {/* Top Header with Close Button */}
        <div className="voting-view-header">
          <div className="voting-view-breadcrumbs">
            <span className="breadcrumb-pill">Posiedzenie nr {sitting}</span>
            <span className="breadcrumb-sep">&bull;</span>
            <span className="breadcrumb-date"><Calendar size={14} /> {formattedDate}</span>
            <span className="breadcrumb-sep">&bull;</span>
            <span className="breadcrumb-vote-num">Głosowanie nr {voting_number}</span>
          </div>
          
          <button 
            className="voting-view-close-btn" 
            onClick={onClose} 
            title="Zamknij (ESC)"
            id="close-voting-modal-btn"
          >
            <X size={22} className="close-icon" />
            <span>Zamknij</span>
          </button>
        </div>

        {/* Title & Topic Section */}
        <div className="voting-view-body">
          <div className="voting-title-section">
            <h1 className="voting-main-title">{title || `Głosowanie nr ${voting_number}`}</h1>
            {topic && <div className="voting-topic-pill">{topic}</div>}
            {description && <p className="voting-description-text">{description}</p>}
          </div>

          {/* Outcome & Visual Progress Bar Section */}
          <div className="voting-stats-banner">
            <div className="outcome-header-row">
              <div className={`outcome-main-badge ${passed ? 'passed' : 'failed'}`}>
                {passed ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                <span>{passed ? 'UCHWALONO' : 'ODRZUCONO'}</span>
              </div>
              <div className="attendance-info">
                <Users size={18} />
                <span>Frekwencja: <strong>{results?.attendance || 'N/A'}</strong></span>
              </div>
            </div>

            {/* 3-Color Horizontal Progress Bar */}
            <div className="voting-progress-bar-container">
              <div 
                className="progress-segment yes-segment" 
                style={{ width: `${yesPercent}%` }} 
                title={`Za: ${yesCount} (${yesPercent}%)`} 
              />
              <div 
                className="progress-segment no-segment" 
                style={{ width: `${noPercent}%` }} 
                title={`Przeciw: ${noCount} (${noPercent}%)`} 
              />
              <div 
                className="progress-segment abstain-segment" 
                style={{ width: `${abstainPercent}%` }} 
                title={`Wstrzymało się: ${abstainCount} (${abstainPercent}%)`} 
              />
            </div>

            {/* Stat Boxes */}
            <div className="stats-boxes-grid">
              <div className="stat-box stat-yes">
                <span className="stat-label">ZA</span>
                <span className="stat-number">{yesCount}</span>
                <span className="stat-percent">{yesPercent}%</span>
              </div>
              <div className="stat-box stat-no">
                <span className="stat-label">PRZECIW</span>
                <span className="stat-number">{noCount}</span>
                <span className="stat-percent">{noPercent}%</span>
              </div>
              <div className="stat-box stat-abstain">
                <span className="stat-label">WSTRZYMAŁO SIĘ</span>
                <span className="stat-number">{abstainCount}</span>
                <span className="stat-percent">{abstainPercent}%</span>
              </div>
              <div className="stat-box stat-not-voted">
                <span className="stat-label">NIE GŁOSOWAŁO</span>
                <span className="stat-number">{notVotedCount}</span>
                <span className="stat-percent">-</span>
              </div>
            </div>
          </div>

          {/* Party Decisions Section */}
          {club_results && club_results.length > 0 && (
            <div className="voting-clubs-section">
              <h3 className="section-heading">
                <ShieldCheck size={20} className="heading-icon" />
                Decyzje klubów i kół parlamentarnych
              </h3>
              <div className="clubs-grid">
                {club_results.map((cr) => (
                  <div key={cr.club_id} className={`club-card decision-border-${String(cr.decision).toLowerCase()}`}>
                    <div className="club-card-header">
                      <span className="club-name">{cr.club_id}</span>
                      {getDecisionBadge(cr.decision)}
                    </div>
                    <div className="club-card-stats">
                      <span className="club-stat yes" title="Za">Za: <strong>{cr.stats?.yes || 0}</strong></span>
                      <span className="club-stat no" title="Przeciw">Prz: <strong>{cr.stats?.no || 0}</strong></span>
                      <span className="club-stat abstain" title="Wstrzymało się">Wstrz: <strong>{cr.stats?.abstain || 0}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents Section (Druki sejmowe) */}
          <div className="voting-docs-section">
            <h3 className="section-heading">
              <FileText size={20} className="heading-icon" />
              Powiązane druki i dokumenty
            </h3>

            {loadingDocs ? (
              <div className="docs-loading-card">
                <div className="spinner"></div>
                <span>Wyszukiwanie i pobieranie druków z archiwum Sejmu...</span>
              </div>
            ) : docError ? (
              <div className="docs-error-card">
                <AlertCircle size={20} />
                <span>{docError}</span>
              </div>
            ) : documents.length === 0 ? (
              <div className="docs-empty-card">
                <FileText size={28} className="empty-icon" />
                <p>Nie znaleziono powiązanych druków dla tego głosowania.</p>
              </div>
            ) : (
              <div className="document-viewer-container">
                <div className="document-tabs-bar">
                  {documents.map((doc, index) => (
                    <button
                      key={doc.id}
                      className={`doc-tab-btn ${index === activeDocIndex ? 'active' : ''}`}
                      onClick={() => setActiveDocIndex(index)}
                    >
                      <FileText size={16} />
                      <span>{doc.filename}</span>
                    </button>
                  ))}
                  {documents[activeDocIndex] && (
                    <a 
                      href={`/api/bills/documents/${documents[activeDocIndex].id}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="doc-download-link"
                      title="Pobierz plik"
                    >
                      <Download size={16} />
                      <span>Pobierz PDF</span>
                    </a>
                  )}
                </div>

                <div className="document-viewer-wrapper">
                  <DocViewer 
                    documents={[docViewerDocs[activeDocIndex]]} 
                    pluginRenderers={DocViewerRenderers}
                    style={{ height: "550px", borderRadius: "0 0 12px 12px", border: "1px solid var(--border)", borderTop: "none" }}
                    config={{
                      header: {
                        disableHeader: true,
                        disableFileName: true,
                        retainURLParams: false
                      }
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VotingDetailsView;
