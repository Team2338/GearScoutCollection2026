import { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { IUser } from '@/model/Models';
import { useUser } from '@/context/UserContext';
import { usePendingMatches } from '@/hooks/usePendingMatches';
import { PendingMatchesIndicator } from '@/components/PendingMatchesIndicator';
import { STORAGE_KEYS, VALIDATION, API } from '@/constants';
import { sanitizeInput, sanitizeEventCode } from '@/utils/sanitization';
import { saveToLocalStorage } from '@/utils/localStorage';
import { saveToSessionStorage } from '@/utils/sessionStorage';
import gearscoutService from '@/services/gearscout-services';
import '@/styles/login.scss';

/**
 * Login page component
 * Memoized to prevent unnecessary re-renders
 */
const Login = memo(() => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser } = useUser();
  const version = import.meta.env.VITE_APP_VERSION || '2026.0.1';

  const [teamNumber, setTeamNumber] = useState('');
  const [scouterName, setScouterName] = useState('');
  const [eventCode, setEventCode] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [tbaCode, setTbaCode] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const { pendingCount, isRetrying, handleRetry } = usePendingMatches();

  useEffect(() => {
    // Handle URL parameters
    const initialTeamNumber = searchParams.get('team');
    const initialEventCode = searchParams.get('event');
    const initialSecretCode = searchParams.get('secret');
    const initialTbaCode = searchParams.get('tba');

    if (initialTeamNumber || initialEventCode || initialSecretCode || initialTbaCode) {
      if (initialTeamNumber) {
        const teamNum = parseInt(initialTeamNumber, 10);
        if (!isNaN(teamNum) && teamNum >= VALIDATION.MIN_TEAM_NUMBER && teamNum <= VALIDATION.MAX_TEAM_NUMBER) {
          saveToLocalStorage(STORAGE_KEYS.TEAM_NUMBER, initialTeamNumber);
        }
      }
      if (initialEventCode && initialEventCode.length <= VALIDATION.MAX_EVENT_CODE_LENGTH) {
        saveToLocalStorage(STORAGE_KEYS.EVENT_CODE, initialEventCode);
      }
      if (initialSecretCode && initialSecretCode.length <= VALIDATION.MAX_SECRET_CODE_LENGTH) {
        saveToSessionStorage(STORAGE_KEYS.SECRET_CODE, initialSecretCode);
      }
      if (initialTbaCode && initialTbaCode.length <= VALIDATION.MAX_TBA_CODE_LENGTH) {
        saveToSessionStorage(STORAGE_KEYS.TBA_CODE, initialTbaCode);
      }
      window.location.replace('/');
      return;
    }

    // Load only team number and scouter name from storage
    // Note: eventCode is saved to localStorage for app functionality but is not auto-filled
    // per user requirements to keep the login form clean and require explicit entry each time
    setTeamNumber(localStorage.getItem(STORAGE_KEYS.TEAM_NUMBER) || '');
    setScouterName(localStorage.getItem(STORAGE_KEYS.SCOUTER_NAME) || '');
    // Don't auto-fill eventCode, secretCode, or tbaCode
    // Keep isInitialLoad true until user interacts with form
  }, [searchParams]);

  useEffect(() => {
    // Validate form whenever required fields change
    // Ensure button stays disabled during initial load
    if (isInitialLoad) {
      setIsValid(false);
      return;
    }
    
    const valid = Boolean(
      teamNumber.trim() &&
      scouterName.trim() &&
      eventCode.trim() &&
      secretCode.trim()
    );
    setIsValid(valid);
  }, [teamNumber, scouterName, eventCode, secretCode, isInitialLoad]);

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();

    if (!isValid) {
      return;
    }

    // Sanitize inputs before saving
    const sanitizedTeamNumber = sanitizeInput(teamNumber);
    const sanitizedScouterName = sanitizeInput(scouterName);
    const sanitizedEventCode = sanitizeEventCode(eventCode);
    const sanitizedSecretCode = sanitizeInput(secretCode);
    const sanitizedTbaCode = sanitizeInput(tbaCode);

    // Save form data to storage
    saveToLocalStorage(STORAGE_KEYS.TEAM_NUMBER, sanitizedTeamNumber);
    saveToLocalStorage(STORAGE_KEYS.SCOUTER_NAME, sanitizedScouterName);
    saveToLocalStorage(STORAGE_KEYS.EVENT_CODE, sanitizedEventCode);
    saveToSessionStorage(STORAGE_KEYS.SECRET_CODE, sanitizedSecretCode);
    saveToSessionStorage(STORAGE_KEYS.TBA_CODE, sanitizedTbaCode);

    // Create user object
    const user: IUser = {
      teamNumber: sanitizedTeamNumber,
      scouterName: sanitizedScouterName,
      eventCode: sanitizedEventCode,
      secretCode: sanitizedSecretCode
    };

    saveToSessionStorage(STORAGE_KEYS.CURRENT_USER, user);
    
    // Update user context to mark as authenticated
    setUser(user);

    // Fetch schedule if TBA code is provided
    if (sanitizedTbaCode.length > 0) {
      try {
        const response = await gearscoutService.getEventSchedule(API.CURRENT_GAME_YEAR, sanitizedTbaCode);
        saveToSessionStorage(STORAGE_KEYS.SCHEDULE, response.data);
      } catch (error) {
        if (error instanceof Error) {
          console.error('[Login] Failed to get schedule:', error.message);
        }
      }
    }

    navigate('/data-collection');
  }, [isValid, teamNumber, scouterName, eventCode, secretCode, tbaCode, navigate, setUser]);

  return (
    <main className="page login-page">
      <PendingMatchesIndicator
        pendingCount={pendingCount}
        isRetrying={isRetrying}
        onRetry={handleRetry}
      />
      <div className="title">
        <div className="app-name">GearScout</div>
        <div className="version">v{version}</div>
      </div>
      <form className="login-form" id="login-form" aria-labelledby="login-form-header" onSubmit={handleSubmit}>
        <h1 id="login-form-header">Sign in</h1>
        
        <div className={`form-field with-prefix ${teamNumber ? 'has-value' : ''}`}>
          <input
            id="team-number-input"
            name="teamNumber"
            type="number"
            min={VALIDATION.MIN_TEAM_NUMBER}
            max={VALIDATION.MAX_TEAM_NUMBER}
            autoComplete="off"
            required
            value={teamNumber}
            onChange={(e) => { setIsInitialLoad(false); setTeamNumber(e.target.value); }}
            aria-label="Team number"
            aria-required="true"
            aria-invalid={!teamNumber && isValid === false ? "true" : "false"}
          />
          <span className="input-prefix" aria-hidden="true">#</span>
          <label htmlFor="team-number-input">Team number</label>
        </div>

        <div className={`form-field ${scouterName ? 'has-value' : ''}`}>
          <input
            id="scouter-name-input"
            name="scouterName"
            type="text"
            maxLength={VALIDATION.MAX_SCOUTER_NAME_LENGTH}
            autoComplete="off"
            required
            value={scouterName}
            onChange={(e) => { setIsInitialLoad(false); setScouterName(e.target.value); }}
            aria-label="Your name or identifier for scouting"
            aria-required="true"
          />
          <label htmlFor="scouter-name-input">Scouter name</label>
        </div>

        <div className={`form-field ${eventCode ? 'has-value' : ''}`}>
          <input
            id="event-code-input"
            name="eventCode"
            type="text"
            maxLength={VALIDATION.MAX_EVENT_CODE_LENGTH}
            autoComplete="off"
            required
            value={eventCode}
            onChange={(e) => { setIsInitialLoad(false); setEventCode(e.target.value); }}
            aria-label="FRC event code (e.g., 2026arc)"
            aria-required="true"
          />
          <label htmlFor="event-code-input">Event code</label>
        </div>

        <div className={`form-field ${secretCode ? 'has-value' : ''}`}>
          <input
            id="secret-code-input"
            name="secretCode"
            type="text"
            maxLength={VALIDATION.MAX_SECRET_CODE_LENGTH}
            autoComplete="off"
            required
            value={secretCode}
            onChange={(e) => { setIsInitialLoad(false); setSecretCode(e.target.value); }}
            aria-label="Authentication secret code from team lead"
            aria-required="true"
          />
          <label htmlFor="secret-code-input">Secret code</label>
        </div>

        <div className={`form-field ${tbaCode ? 'has-value' : ''}`}>
          <input
            id="tba-code-input"
            name="tbaCode"
            type="text"
            maxLength={VALIDATION.MAX_TBA_CODE_LENGTH}
            autoComplete="off"
            value={tbaCode}
            onChange={(e) => { setIsInitialLoad(false); setTbaCode(e.target.value); }}
            aria-label="The Blue Alliance API key (optional)"
            aria-describedby="tba-helper-text"
          />
          <label htmlFor="tba-code-input">TBA code (optional)</label>
          <div id="tba-helper-text" className="helper-text">The Blue Alliance event ID</div>
        </div>

        <button 
          id="login-submit-button" 
          type="submit" 
          disabled={!isValid}
          aria-label={isValid ? "Submit and proceed to data collection" : "Complete all required fields to submit"}
        >
          Submit
        </button>
      </form>
    </main>
  );
});

Login.displayName = 'Login';

export default Login;
