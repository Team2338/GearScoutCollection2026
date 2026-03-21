import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { IUser } from '@/model/Models';
import { useUser } from '@/context/UserContext';
import { usePendingMatches } from '@/hooks/usePendingMatches';
import { PendingMatchesIndicator } from '@/components/PendingMatchesIndicator';
import { STORAGE_KEYS, VALIDATION, API } from '@/constants';
import { sanitizeInput, sanitizeEventCode } from '@/utils/sanitization';
import { saveToLocalStorage } from '@/utils/localStorage';
import { saveToSessionStorage } from '@/utils/sessionStorage';
import { showSuccess, showError } from '@/utils/notifications';
import gearscoutService from '@/services/gearscout-services';
import '@/styles/login.scss';

/**
 * Login page component
 */
const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser } = useUser();
  const version = import.meta.env.VITE_APP_VERSION || '2026.2';

  const [teamNumber, setTeamNumber] = useState('');
  const [scouterName, setScouterName] = useState('');
  const [eventCode, setEventCode] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [tbaCode, setTbaCode] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const { pendingCount, isRetrying, handleRetry } = usePendingMatches();

  useEffect(() => {
    // Handle URL parameters and storage
    const initialTeamNumber = searchParams.get('team');
    const initialEventCode = searchParams.get('event');
    const initialSecretCode = searchParams.get('secret');
    const initialTbaCode = searchParams.get('tba');

    // Set team number from URL or storage
    if (initialTeamNumber) {
      const teamNum = parseInt(initialTeamNumber, 10);
      if (!isNaN(teamNum) && teamNum >= VALIDATION.MIN_TEAM_NUMBER && teamNum <= VALIDATION.MAX_TEAM_NUMBER) {
        setTeamNumber(initialTeamNumber);
        saveToLocalStorage(STORAGE_KEYS.TEAM_NUMBER, initialTeamNumber);
      }
    } else {
      setTeamNumber(localStorage.getItem(STORAGE_KEYS.TEAM_NUMBER) || '');
    }

    // Set scouter name from storage
    setScouterName(localStorage.getItem(STORAGE_KEYS.SCOUTER_NAME) || '');

    // Set event code from URL or storage
    if (initialEventCode && initialEventCode.length <= VALIDATION.MAX_EVENT_CODE_LENGTH) {
      setEventCode(initialEventCode);
      saveToLocalStorage(STORAGE_KEYS.EVENT_CODE, initialEventCode);
    } else {
      setEventCode(localStorage.getItem(STORAGE_KEYS.EVENT_CODE) || '');
    }

    // Set secret code from URL or storage
    if (initialSecretCode && initialSecretCode.length <= VALIDATION.MAX_SECRET_CODE_LENGTH) {
      setSecretCode(initialSecretCode);
      saveToSessionStorage(STORAGE_KEYS.SECRET_CODE, initialSecretCode);
    } else {
      setSecretCode(sessionStorage.getItem(STORAGE_KEYS.SECRET_CODE) || '');
    }

    // Set TBA code from URL or storage
    if (initialTbaCode && initialTbaCode.length <= VALIDATION.MAX_TBA_CODE_LENGTH) {
      setTbaCode(initialTbaCode);
      saveToSessionStorage(STORAGE_KEYS.TBA_CODE, initialTbaCode);
    } else {
      setTbaCode(sessionStorage.getItem(STORAGE_KEYS.TBA_CODE) || '');
    }

    // Mark initial load as complete - allow validation to proceed
    setIsInitialLoad(false);
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
        showSuccess('Schedule loaded successfully!');
      } catch (error) {
        if (error instanceof Error) {
          console.error('[Login] Failed to get schedule:', error.message);
          showError(`Failed to load schedule: ${error.message}`);
          return;
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
            onChange={(e) => { 
              setIsInitialLoad(false); 
              const newValue = e.target.value;
              setTbaCode(newValue);
              // Clear cached schedule if TBA code is erased
              if (newValue.trim() === '') {
                sessionStorage.removeItem(STORAGE_KEYS.SCHEDULE);
              }
            }}
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
};

export default Login;
