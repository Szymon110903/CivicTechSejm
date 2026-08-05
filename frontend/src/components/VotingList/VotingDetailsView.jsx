import React, { useState, useEffect } from 'react';
import { X, Calendar, Users, FileText, CheckCircle2, XCircle, AlertCircle, Download, ShieldCheck } from 'lucide-react';
import DocViewer, { DocViewerRenderers } from '@cyntler/react-doc-viewer';
import '@cyntler/react-doc-viewer/dist/index.css';
import './VotingDetailsView.css';

const VotingDetailsView = ({ voting, onClose, context }) => {
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [docError, setDocError] = useState(null);
  const [activeDocIndex, setActiveDocIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('details');

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

  const docViewerDocs = documents.map(doc => {
    const safeFileName = doc.filename.replace(/\.docx?$/i, '.pdf');
    return {
      uri: `/api/bills/documents/${doc.id}/download?name=${safeFileName}`,
      fileName: safeFileName,
      fileType: 'pdf' // Wymuszamy PDF, bo backend konwertuje wszystko do PDF
    };
  });

  const getDecisionBadge = (decision) => {
    const dec = String(decision).toUpperCase();
    switch (dec) {
      case 'YES':
      case 'ZA':
        return <span className="badge bg-success">ZA</span>;
      case 'NO':
      case 'PRZECIW':
        return <span className="badge bg-danger">PRZECIW</span>;
      case 'ABSTAIN':
      case 'WSTRZYMAŁ SIĘ':
        return <span className="badge bg-warning text-dark">WSTRZYMAŁ SIĘ</span>;
      case 'SPLIT':
      case 'PODZIELENI':
        return <span className="badge bg-info text-dark">PODZIELENI</span>;
      default:
        return <span className="badge bg-secondary">{dec}</span>;
    }
  };

  const getBorderClass = (decision) => {
    const dec = String(decision).toUpperCase();
    switch (dec) {
      case 'YES':
      case 'ZA':
        return 'border-success';
      case 'NO':
      case 'PRZECIW':
        return 'border-danger';
      case 'ABSTAIN':
      case 'WSTRZYMAŁ SIĘ':
        return 'border-warning';
      case 'SPLIT':
      case 'PODZIELENI':
        return 'border-info';
      default:
        return 'border-secondary';
    }
  };

  return (
    <div className="container-fluid py-3 text-light h-100 d-flex flex-column">
      {/* Top Navigation & Breadcrumb Card */}
      <div className="card shadow-sm mb-4 border border-secondary-subtle bg-body-tertiary flex-shrink-0">
        <div className="card-body d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div className="d-flex align-items-center flex-wrap gap-2">
            <span className="badge bg-primary px-3 py-2 fs-6 shadow-sm">Posiedzenie nr {sitting}</span>
            <span className="text-muted">&bull;</span>
            <span className="text-muted d-flex align-items-center gap-1">
              <Calendar size={16} className="text-primary" /> {formattedDate}
            </span>
            <span className="text-muted">&bull;</span>
            <span className="fw-bold text-light fs-6">Głosowanie nr {voting_number}</span>

            {documents.length > 0 && (
              <button
                className={`btn btn-sm ms-2 ms-md-4 d-flex align-items-center gap-2 fw-bold px-3 py-2 rounded-pill shadow-sm transition-all ${activeTab === 'documents' ? 'btn-info text-dark' : 'btn-outline-info text-light'}`}
                onClick={() => setActiveTab(activeTab === 'documents' ? 'details' : 'documents')}
              >
                <FileText size={16} />
                {activeTab === 'documents' ? 'Wróć do statystyk' : 'Podgląd PDF'}
              </button>
            )}
          </div>

          <button
            className="btn btn-outline-danger d-flex align-items-center gap-2 px-3 py-2 rounded-3 fw-bold shadow-sm"
            onClick={onClose}
            title="Zamknij (ESC)"
          >
            <X size={20} />
            <span>Zamknij</span>
          </button>
        </div>
      </div>

      {activeTab === 'details' ? (
        <>
          {/* Main Title & Topic Card */}
          <div className="card shadow-sm mb-4 border border-secondary-subtle bg-body-tertiary flex-shrink-0">
            <div className="card-body p-4">
              <h1 className="h2 fw-bold mb-3 text-light">{title || `Głosowanie nr ${voting_number}`}</h1>
              {topic && <div className="badge bg-secondary mb-3 px-3 py-2 fs-6 text-wrap text-start">{topic}</div>}
              {description && <p className="text-muted fs-5 mb-0 lead">{description}</p>}
            </div>
          </div>

          {/* Outcome Banner & Visual Progress Bar Card */}
          <div className="card shadow-sm mb-4 border border-secondary-subtle bg-body-tertiary">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
                <div className={`badge ${passed ? 'bg-success' : 'bg-danger'} d-flex align-items-center gap-2 px-4 py-3 fs-5 shadow-sm`}>
                  {passed ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                  <span>{passed ? 'UCHWALONO' : 'ODRZUCONO'}</span>
                </div>
                <div className="d-flex align-items-center gap-2 bg-body px-3 py-2 rounded border border-secondary text-light shadow-sm">
                  <Users size={20} className="text-primary" />
                  <span>Frekwencja: <strong className="text-light">{results?.attendance || 'N/A'}</strong></span>
                </div>
              </div>

              <h5 className="text-muted fw-bold mb-3">Rozkład głosów</h5>
              <div className="progress mb-4 shadow-sm" style={{ height: "28px", borderRadius: "14px", overflow: "hidden", fontSize: "0.95rem" }}>
                {yesCount > 0 && (
                  <div className="progress-bar bg-success fw-bold" role="progressbar" style={{ width: `${yesPercent}%` }} title={`Za: ${yesCount} (${yesPercent}%)`}>
                    Za: {yesCount} ({yesPercent}%)
                  </div>
                )}
                {noCount > 0 && (
                  <div className="progress-bar bg-danger fw-bold" role="progressbar" style={{ width: `${noPercent}%` }} title={`Przeciw: ${noCount} (${noPercent}%)`}>
                    Prz: {noCount} ({noPercent}%)
                  </div>
                )}
                {abstainCount > 0 && (
                  <div className="progress-bar bg-warning text-dark fw-bold" role="progressbar" style={{ width: `${abstainPercent}%` }} title={`Wstrzymało się: ${abstainCount} (${abstainPercent}%)`}>
                    Wstrz: {abstainCount} ({abstainPercent}%)
                  </div>
                )}
              </div>

              {/* Four Stat Boxes */}
              <div className="row g-3">
                <div className="col-6 col-md-3">
                  <div className="card border-success bg-body text-center p-3 shadow-sm h-100">
                    <span className="text-muted small fw-bold">ZA</span>
                    <span className="fs-2 fw-bold text-success my-1">{yesCount}</span>
                    <div><span className="badge bg-success">{yesPercent}%</span></div>
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="card border-danger bg-body text-center p-3 shadow-sm h-100">
                    <span className="text-muted small fw-bold">PRZECIW</span>
                    <span className="fs-2 fw-bold text-danger my-1">{noCount}</span>
                    <div><span className="badge bg-danger">{noPercent}%</span></div>
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="card border-warning bg-body text-center p-3 shadow-sm h-100">
                    <span className="text-muted small fw-bold">WSTRZYMAŁO SIĘ</span>
                    <span className="fs-2 fw-bold text-warning my-1">{abstainCount}</span>
                    <div><span className="badge bg-warning text-dark">{abstainPercent}%</span></div>
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="card border-secondary bg-body text-center p-3 shadow-sm h-100">
                    <span className="text-muted small fw-bold">NIE GŁOSOWAŁO</span>
                    <span className="fs-2 fw-bold text-secondary my-1">{notVotedCount}</span>
                    <div><span className="badge bg-secondary">-</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Party Decisions Section */}
          {club_results && club_results.length > 0 && (
            <div className="card shadow-sm mb-4 border border-secondary-subtle bg-body-tertiary">
              <div className="card-header bg-body p-4 border-bottom border-secondary">
                <h3 className="h4 fw-bold mb-0 d-flex align-items-center gap-2 text-light">
                  <ShieldCheck size={24} className="text-primary" />
                  Decyzje klubów i kół parlamentarnych
                </h3>
              </div>
              <div className="card-body p-4">
                <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-xl-4 g-3">
                  {club_results.map((cr) => (
                    <div className="col" key={cr.club_id}>
                      <div className={`card h-100 shadow-sm bg-body border-0 border-start border-4 ${getBorderClass(cr.decision)}`}>
                        <div className="card-body d-flex flex-column justify-content-between p-3">
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <span className="fw-bold fs-5 text-light">{cr.club_id}</span>
                            {getDecisionBadge(cr.decision)}
                          </div>
                          <div className="d-flex justify-content-between small text-muted border-top border-secondary pt-2 mt-auto">
                            <span className="text-success fw-bold">Za: {cr.stats?.yes || 0}</span>
                            <span className="text-danger fw-bold">Prz: {cr.stats?.no || 0}</span>
                            <span className="text-warning fw-bold">Wstrz: {cr.stats?.abstain || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Documents Section (Druki sejmowe) - FULL SCREEN TAB */
        <div className="card shadow-sm mb-4 border border-secondary-subtle bg-body-tertiary flex-grow-1 d-flex flex-column" style={{ minHeight: "80vh" }}>
          <div className="card-header bg-body p-4 border-bottom border-secondary flex-shrink-0">
            <h3 className="h4 fw-bold mb-0 d-flex align-items-center gap-2 text-light">
              <FileText size={24} className="text-info" />
              Powiązane druki i dokumenty
            </h3>
          </div>
          <div className="card-body p-4 d-flex flex-column flex-grow-1">
            {loadingDocs ? (
              <div className="text-center p-5 bg-body rounded-3 border border-secondary border-dashed my-auto">
                <div className="spinner-border text-primary mb-3" role="status"></div>
                <p className="text-muted mb-0">Wyszukiwanie i pobieranie druków z archiwum Sejmu...</p>
              </div>
            ) : docError ? (
              <div className="alert alert-danger d-flex align-items-center gap-2 p-4 rounded-3 mb-0 border border-danger my-auto">
                <AlertCircle size={20} />
                <span>{docError}</span>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center p-5 bg-body rounded-3 border border-secondary border-dashed my-auto">
                <FileText size={36} className="text-muted mb-2" />
                <p className="text-muted mb-0 fs-5">Nie znaleziono powiązanych druków w formacie PDF dla tego głosowania.</p>
              </div>
            ) : (
              <div className="d-flex flex-column flex-grow-1">
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 bg-body p-2 rounded-top border border-secondary border-bottom-0 flex-shrink-0">
                  <ul className="nav nav-pills gap-2">
                    {documents.map((doc, index) => {
                      const safeName = doc.filename.replace(/\.docx?$/i, '.pdf');
                      return (
                        <li className="nav-item" key={doc.id}>
                          <button
                            className={`nav-link d-flex align-items-center gap-2 py-2 px-3 fw-medium ${index === activeDocIndex ? 'active bg-info text-dark shadow-sm' : 'text-light'}`}
                            onClick={() => setActiveDocIndex(index)}
                          >
                            <FileText size={16} />
                            <span>{safeName}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  {documents[activeDocIndex] && (
                    <a
                      href={`/api/bills/documents/${documents[activeDocIndex].id}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline-info d-flex align-items-center gap-2 px-3 py-2 fw-bold shadow-sm"
                    >
                      <Download size={16} />
                      <span>Pobierz PDF</span>
                    </a>
                  )}
                </div>

                <div className="border border-secondary rounded-bottom overflow-hidden bg-white flex-grow-1 d-flex flex-column">
                  <DocViewer
                    key={activeDocIndex}
                    documents={[docViewerDocs[activeDocIndex]]}
                    pluginRenderers={DocViewerRenderers}
                    style={{ height: "100%", minHeight: "75vh", flexGrow: 1 }}
                    config={{
                      header: {
                        disableHeader: true,
                        disableFileName: true,
                        retainURLParams: false
                      },
                      pdfZoom: {
                        defaultZoom: 0.6,
                        zoomJump: 0.1
                      }
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VotingDetailsView;
