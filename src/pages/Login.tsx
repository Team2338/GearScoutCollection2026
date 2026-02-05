import React, { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { IUser } from '../model/Models';
import { getPendingMatches, submitAllPendingMatches } from '../services/matchStorage';
import '../styles/login.scss';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const version = import.meta.env.VITE_APP_VERSION || '2026.0.1';

  const [teamNumber, setTeamNumber] = useState('');
  const [scouterName, setScouterName] = useState('');
  const [eventCode, setEventCode] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [tbaCode, setTbaCode] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    // Handle URL parameters
    const initialTeamNumber = searchParams.get('team');
    const initialEventCode = searchParams.get('event');
    const initialSecretCode = searchParams.get('secret');
    const initialTbaCode = searchParams.get('tba');

    if (initialTeamNumber || initialEventCode || initialSecretCode || initialTbaCode) {
      if (initialTeamNumber) {
        localStorage.setItem('teamNumber', initialTeamNumber);
      }
      if (initialEventCode) {
        localStorage.setItem('eventCode', initialEventCode);
      }
      if (initialSecretCode) {
        sessionStorage.setItem('secretCode', initialSecretCode);
      }
      if (initialTbaCode) {
        sessionStorage.setItem('tbaCode', initialTbaCode);
      }
      window.location.replace('/');
      return;
    }

    // Load from storage
    setTeamNumber(localStorage.getItem('teamNumber') || '');
    setScouterName(localStorage.getItem('scouterName') || '');
    setEventCode(localStorage.getItem('eventCode') || '');
    setSecretCode(sessionStorage.getItem('secretCode') || '');
    setTbaCode(sessionStorage.getItem('tbaCode') || '');
  }, [searchParams]);

  useEffect(() => {
    const valid = Boolean(
      teamNumber.trim() &&
      scouterName.trim() &&
      eventCode.trim() &&
      secretCode.trim()
    );
    setIsValid(valid);
  }, [teamNumber, scouterName, eventCode, secretCode]);

  useEffect(() => {
    // Update pending matches count
    const updatePendingCount = () => {
      const userDataStr = sessionStorage.getItem('currentUser');
      if (userDataStr) {
        try {
          const userData = JSON.parse(userDataStr) as IUser;
          const pending = getPendingMatches(userData);
          setPendingCount(pending.length);
        } catch (error) {
          console.error('Error reading pending matches:', error);
        }
      }
    };

    updatePendingCount();
    // Check periodically for updates
    const interval = setInterval(updatePendingCount, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRetryFailedMatches = async () => {
    const userDataStr = sessionStorage.getItem('currentUser');
    if (!userDataStr) return;

    setIsRetrying(true);
    try {
      const userData = JSON.parse(userDataStr) as IUser;
      await submitAllPendingMatches(userData);
      const pending = getPendingMatches(userData);
      setPendingCount(pending.length);
    } catch (error) {
      console.error('Error retrying submission:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    
    if (!isValid) {
      return;
    }

    localStorage.setItem('teamNumber', teamNumber.trim());
    localStorage.setItem('scouterName', scouterName.trim());
    localStorage.setItem('eventCode', eventCode.trim());
    sessionStorage.setItem('secretCode', secretCode.trim());
    sessionStorage.setItem('tbaCode', tbaCode.trim());

    const user: IUser = {
      teamNumber: teamNumber.trim(),
      scouterName: scouterName.trim(),
      eventCode: eventCode.trim(),
      secretCode: secretCode.trim()
    };

    sessionStorage.setItem('currentUser', JSON.stringify(user));

    if (tbaCode.trim().length > 0) {
      try {
        const currentYear = new Date().getFullYear();
        const response = await fetch(`/api/schedule?year=${currentYear}&tbaCode=${encodeURIComponent(tbaCode.trim())}`);
        if (!response.ok) {
          console.error('Failed to get schedule: HTTP status', response.status, response.statusText);
        } else {
          const schedule = await response.json();
          sessionStorage.setItem('schedule', JSON.stringify(schedule));
        }
      } catch (error) {
        console.error('Failed to get schedule', error);
      }
    }

    navigate('/data-collection');
  };

  return (
    <main className="page login-page">
      <div className="title">
        <div className="app-name">GearScout</div>
        <div className="version">v{version}</div>
      </div>
      {pendingCount > 0 && (
        <div className="pending-matches-indicator">
          <span className="pending-matches-count">{pendingCount}</span> pending
          <button 
            type="button" 
            className="retry-submit-button" 
            onClick={handleRetryFailedMatches}
            disabled={isRetrying}
            style={{ opacity: isRetrying ? 0.5 : 1 }}
          >
            ↻
          </button>
        </div>
      )}
      <form className="login-form" id="login-form" aria-labelledby="login-form-header" onSubmit={handleSubmit}>
        <h1 id="login-form-header">Sign in</h1>
        
        <div className={`form-field with-prefix ${teamNumber ? 'has-value' : ''}`}>
          <input
            id="team-number-input"
            name="teamNumber"
            type="number"
            min="0"
            max="99999"
            autoComplete="off"
            required
            value={teamNumber}
            onChange={(e) => setTeamNumber(e.target.value)}
          />
          <span className="input-prefix">#</span>
          <label htmlFor="team-number-input">Team number</label>
        </div>

        <div className={`form-field ${scouterName ? 'has-value' : ''}`}>
          <input
            id="scouter-name-input"
            name="scouterName"
            type="text"
            maxLength={32}
            autoComplete="off"
            required
            value={scouterName}
            onChange={(e) => setScouterName(e.target.value)}
          />
          <label htmlFor="scouter-name-input">Scouter name</label>
        </div>

        <div className={`form-field ${eventCode ? 'has-value' : ''}`}>
          <input
            id="event-code-input"
            name="eventCode"
            type="text"
            maxLength={32}
            autoComplete="off"
            required
            value={eventCode}
            onChange={(e) => setEventCode(e.target.value)}
          />
          <label htmlFor="event-code-input">Event code</label>
        </div>

        <div className={`form-field ${secretCode ? 'has-value' : ''}`}>
          <input
            id="secret-code-input"
            name="secretCode"
            type="text"
            maxLength={32}
            autoComplete="off"
            required
            value={secretCode}
            onChange={(e) => setSecretCode(e.target.value)}
          />
          <label htmlFor="secret-code-input">Secret code</label>
        </div>

        <div className={`form-field ${tbaCode ? 'has-value' : ''}`}>
          <input
            id="tba-code-input"
            name="tbaCode"
            type="text"
            maxLength={6}
            autoComplete="off"
            value={tbaCode}
            onChange={(e) => setTbaCode(e.target.value)}
          />
          <label htmlFor="tba-code-input">TBA code (optional)</label>
          <div className="helper-text">The Blue Alliance event ID</div>
        </div>

        <button id="login-submit-button" type="submit" disabled={!isValid}>
          Submit
        </button>
      </form>
    </main>
  );
};

export default Login;
