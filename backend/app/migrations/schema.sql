/**
 * PostgreSQL Schema for CivicTechSejm Votings Aggregation System
 * 
 * Struktura bazy danych do przechowywania przetworzonych danych głosowań
 * z podziałem na posiedzenia, dni, głosowania i wyniki klubów
 * 
 * Usage:
 *   psql -U postgres -d civictechsejm < schema.sql
 */

-- ============= ENUMS =============

CREATE TYPE voting_decision AS ENUM ('YES', 'NO', 'ABSTAIN', 'MIXED');


-- ============= PROCEEDINGS TABLE =============
/** 
 * Posiedzenie (sesja) Sejmu
 * 
 * Jedna sesja parlamentarna, może zawierać wiele dni głosowań
 */

CREATE TABLE proceedings (
    id SERIAL PRIMARY KEY,
    term INTEGER NOT NULL,
    proceeding_id VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uk_proceedings_term_id UNIQUE (term, proceeding_id)
);

CREATE INDEX idx_proceedings_term ON proceedings(term);
CREATE INDEX idx_proceedings_date ON proceedings(date);


-- ============= VOTING_DAYS TABLE =============
/**
 * Dzień z głosowaniami
 * 
 * Dzień w ramach posiedzenia, zawiera listę głosowań
 */

CREATE TABLE voting_days (
    id SERIAL PRIMARY KEY,
    proceeding_id INTEGER NOT NULL REFERENCES proceedings(id) ON DELETE CASCADE,
    date DATE NOT NULL
);

CREATE UNIQUE INDEX uk_voting_days_proceeding_date ON voting_days(proceeding_id, date);
CREATE INDEX idx_voting_days_proceeding ON voting_days(proceeding_id);
CREATE INDEX idx_voting_days_date ON voting_days(date);


-- ============= VOTINGS TABLE =============
/**
 * Jedno głosowanie (voting)
 * 
 * Dane o pojedynczym głosowaniu:
 * - wyniki główne (tak, nie, wstrzymuję się)
 * - statystyki (frekwencja, kworum)
 * - metadane (temat, tytuł)
 */

CREATE TABLE votings (
    id SERIAL PRIMARY KEY,
    day_id INTEGER NOT NULL REFERENCES voting_days(id) ON DELETE CASCADE,
    voting_number INTEGER NOT NULL,
    sitting VARCHAR(50) NOT NULL,
    
    -- Metadane
    title VARCHAR(500),
    description VARCHAR(2000),
    topic VARCHAR(200),
    
    -- Wyniki
    passed BOOLEAN NOT NULL,
    yes_count INTEGER NOT NULL DEFAULT 0,
    no_count INTEGER NOT NULL DEFAULT 0,
    abstain_count INTEGER NOT NULL DEFAULT 0,
    not_voted INTEGER NOT NULL DEFAULT 0,
    
    -- Statystyki
    total_votes INTEGER NOT NULL,
    attendance_percent FLOAT NOT NULL,
    quorum_required INTEGER NOT NULL DEFAULT 231,
    
    -- Raw API data
    raw_api_data JSONB,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX uk_votings_day_number ON votings(day_id, voting_number);
CREATE INDEX idx_votings_day ON votings(day_id);
CREATE INDEX idx_votings_sitting_number ON votings(sitting, voting_number);


-- ============= CLUB_VOTING_RESULTS TABLE =============
/**
 * Wynik głosowania dla klubu
 * 
 * Dane o tym, jak klub głosował na konkretne głosowanie:
 * - decyzja klubu (YES, NO, ABSTAIN, MIXED)
 * - statystyki (ile tak, ile nie, ile wstrzymuję się)
 * - lista głosów posłów
 */

CREATE TABLE club_voting_results (
    id SERIAL PRIMARY KEY,
    voting_id INTEGER NOT NULL REFERENCES votings(id) ON DELETE CASCADE,
    club_id VARCHAR(50) NOT NULL,
    
    -- Decyzja klubu
    decision voting_decision NOT NULL,
    
    -- Statystyki klubu
    yes_count INTEGER NOT NULL DEFAULT 0,
    no_count INTEGER NOT NULL DEFAULT 0,
    abstain_count INTEGER NOT NULL DEFAULT 0,
    not_voted_count INTEGER NOT NULL DEFAULT 0,
    
    -- Obliczone wartości
    party_members_total INTEGER NOT NULL,
    participation_percent FLOAT NOT NULL,
    
    -- Szczegóły głosów posłów (raw)
    raw_members_votes JSONB,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX uk_club_voting ON club_voting_results(voting_id, club_id);
CREATE INDEX idx_club_voting_club_id ON club_voting_results(club_id);
CREATE INDEX idx_club_voting_voting ON club_voting_results(voting_id);


-- ============= VIEWS (Optional) =============

/**
 * Widok: Głosowania z historią zmian
 * Przydatny do śledzenia zmian w danych
 */
CREATE VIEW votings_summary AS
SELECT 
    p.term,
    p.proceeding_id,
    vd.date,
    v.voting_number,
    v.sitting,
    v.title,
    v.passed,
    v.yes_count,
    v.no_count,
    v.abstain_count,
    v.attendance_percent,
    COUNT(DISTINCT cvr.club_id) as clubs_voted,
    v.created_at
FROM votings v
JOIN voting_days vd ON v.day_id = vd.id
JOIN proceedings p ON vd.proceeding_id = p.id
LEFT JOIN club_voting_results cvr ON v.id = cvr.voting_id
GROUP BY p.id, v.id, vd.id;


/**
 * Widok: Statystyki klubów
 * Podsumowanie głosów każdego klubu
 */
CREATE VIEW club_voting_summary AS
SELECT 
    cvr.club_id,
    COUNT(*) as total_votings,
    SUM(CASE WHEN cvr.decision = 'YES' THEN 1 ELSE 0 END) as yes_decisions,
    SUM(CASE WHEN cvr.decision = 'NO' THEN 1 ELSE 0 END) as no_decisions,
    SUM(CASE WHEN cvr.decision = 'ABSTAIN' THEN 1 ELSE 0 END) as abstain_decisions,
    SUM(CASE WHEN cvr.decision = 'MIXED' THEN 1 ELSE 0 END) as mixed_decisions,
    ROUND(AVG(cvr.participation_percent), 2) as avg_participation
FROM club_voting_results cvr
GROUP BY cvr.club_id;