import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import DocViewer, { DocViewerRenderers } from '@cyntler/react-doc-viewer';
import '@cyntler/react-doc-viewer/dist/index.css';
import './VotingDetails.css';

const VotingDetails = () => {
  const { id } = useParams();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeDocIndex, setActiveDocIndex] = useState(0);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const response = await fetch(`/api/votings/${id}/documents`);
        if (!response.ok) {
          throw new Error('Błąd podczas pobierania dokumentów głosowania.');
        }
        const data = await response.json();
        setDocuments(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [id]);

  if (loading) {
    return (
      <div className="voting-details-loading">
        <div className="spinner"></div>
        <h3>Ładowanie dokumentów głosowania...</h3>
      </div>
    );
  }

  if (error) {
    return (
      <div className="voting-details-error">
        <Link to={-1} className="back-link">&larr; Wróć</Link>
        <h3>Błąd</h3>
        <p>{error}</p>
      </div>
    );
  }

  const docViewerDocs = documents.map(doc => ({
    uri: `/api/bills/documents/${doc.id}/download`,
    fileName: doc.filename
  }));

  return (
    <div className="voting-details-container">
      <div className="details-header">
        <Link to={-1} className="back-link">&larr; Wróć do głosowań</Link>
        <h2>Szczegóły Głosowania</h2>
        <p className="details-subtitle">W przyszłości pojawią się tu szczegółowe statystyki oraz wizualizacje głosów.</p>
      </div>

      <div className="documents-section">
        <h3>Najważniejsze dokumenty (Druki)</h3>
        {documents.length === 0 ? (
          <p className="no-docs">Nie znaleziono powiązanych druków dla tego głosowania.</p>
        ) : (
          <div className="document-viewer-layout">
            <div className="document-tabs">
              {documents.map((doc, index) => (
                <button
                  key={doc.id}
                  className={`doc-tab ${index === activeDocIndex ? 'active' : ''}`}
                  onClick={() => setActiveDocIndex(index)}
                >
                  {doc.filename}
                </button>
              ))}
            </div>
            
            <div className="document-viewer-wrapper">
              <DocViewer 
                documents={[docViewerDocs[activeDocIndex]]} 
                pluginRenderers={DocViewerRenderers}
                style={{ height: "600px", borderRadius: "8px", border: "1px solid #ccc" }}
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
  );
};

export default VotingDetails;
