import { useEffect, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { initializeDataCollection } from '@/scripts/data-collection';
import { usePendingMatches } from '@/hooks/usePendingMatches';
import { PendingMatchesIndicator } from '@/components/PendingMatchesIndicator';
import { VALIDATION } from '@/constants';
import '@/styles/data-collection.scss';

/**
 * Data Collection page component
 * Memoized to prevent unnecessary re-renders
 */
const DataCollection = memo(() => {
  const navigate = useNavigate();
  const { pendingCount, isRetrying, handleRetry } = usePendingMatches();

  useEffect(() => {
    // Initialize the data collection logic
    const cleanup = initializeDataCollection();
    
    // Return cleanup function to remove event listeners on unmount
    return cleanup;
  }, []);

  const handleBack = useCallback(() => {
    navigate('/');
  }, [navigate]);

  return (
    <>
      <div className="header">
        <PendingMatchesIndicator
          pendingCount={pendingCount}
          isRetrying={isRetrying}
          onRetry={handleRetry}
        />
        <div className="header-main">
          <div className="logo">
            <img src="/logos/192-pwa.png" alt="2338 logo" height={100} width={100} loading="eager" />
          </div>
          <div className="analytics">
            <a href="https://data.gearitforward.com/" className="analytics-button">ANALYTICS</a>
          </div>
        </div>
      </div>

      <main className="page data-collection-page">
        <form className="data-collection-form" id="data-collection-form">
          <div className="content-wrapper">

            <div className="form-field">
              <input 
                id="match-number" 
                name="matchNumber" 
                type="number" 
                min={VALIDATION.MIN_MATCH_NUMBER}
                max={VALIDATION.MAX_MATCH_NUMBER}
                autoComplete="off"
                aria-label="Match number (0-999)"
                aria-required="true"
              />
              <label htmlFor="match-number">Match Number</label>
            </div>

            <div id="team-number-container">
              <div className="team-number-loader" id="schedule-loader" style={{ display: 'none' }}>
                <div className="textbox-placeholder">Team Number</div>
                <div className="spin-loader"></div>
              </div>

              <div className="form-field" id="team-number-dropdown-container" style={{ display: 'none' }}>
                <select 
                  id="team-number-dropdown" 
                  name="teamNumberDropdown"
                  aria-label="Select team number from match schedule"
                  aria-required="true"
                >
                  <option value="">Select Team</option>
                </select>
                <label htmlFor="team-number-dropdown">Team Number</label>
              </div>

              <div className="form-field" id="team-number-manual-container">
                <input 
                  id="team-number" 
                  name="teamNumber" 
                  type="number"
                  autoComplete="off"
                  aria-label="Team number to scout"
                  aria-required="true"
                />
                <label htmlFor="team-number">Team Number</label>
              </div>
            </div>

            <div className="alliance-section" id="alliance-section">
              <div className="toggle-button-group" role="group" aria-label="Alliance color selection">
                <button 
                  type="button" 
                  className="alliance-toggle red" 
                  data-value="red"
                  aria-label="Select red alliance"
                  role="radio"
                  aria-checked="false"
                >
                  RED ALLIANCE
                </button>
                <button 
                  type="button" 
                  className="alliance-toggle blue" 
                  data-value="blue"
                  aria-label="Select blue alliance"
                  role="radio"
                  aria-checked="false"
                >
                  BLUE ALLIANCE
                </button>
              </div>
            </div>

            <h2 className="section-title">Auto</h2>

            <div className="trench-container">
              <div className="trench-buttons">
                <button type="button" className="trench-button left-trench">
                  RED TRENCH
                </button>
                <span className="counter" id="left-counter">0</span>
                <span className="counter" id="right-counter">0</span>
                <button type="button" className="trench-button right-trench">
                  BLUE TRENCH
                </button>
              </div>
              <div className="trench-decrements">
                <button type="button" className="trench-decrement left-decrement">
                  −
                </button>
                <button type="button" className="trench-decrement right-decrement">
                  −
                </button>
              </div>
            </div>

            <div className="trench-container">
              <div className="trench-buttons">
                <button type="button" className="trench-button left-bump">
                  RED BUMP
                </button>
                <span className="counter" id="left-bump-counter">0</span>
                <span className="counter" id="right-bump-counter">0</span>
                <button type="button" className="trench-button right-bump">
                  BLUE BUMP
                </button>
              </div>
              <div className="trench-decrements">
                <button type="button" className="trench-decrement left-bump-decrement">
                  −
                </button>
                <button type="button" className="trench-decrement right-bump-decrement">
                  −
                </button>
              </div>
            </div>

            <div id="previous-auto-cycle-section" className="previous-cycle-section" style={{ display: 'none', backgroundColor: '#001b2f', borderRadius: '8px'}}>
              <h3 className="objective-label">Previous Auto Cycle</h3>
                <div className="cycle-count" id="previous-auto-cycle-count">Auto Cycle: 0</div>
              
              <h4 className="sub-label">Accuracy</h4>
              <div className="accuracy-button-group">
                <button type="button" className="accuracy-button-previous-auto" data-value="0">0%</button>
                <button type="button" className="accuracy-button-previous-auto" data-value="25">25%</button>
                <button type="button" className="accuracy-button-previous-auto" data-value="50">50%</button>
                <button type="button" className="accuracy-button-previous-auto" data-value="75">75%</button>
                <button type="button" className="accuracy-button-previous-auto" data-value="95">95%</button>
                <button type="button" className="accuracy-button-previous-auto" data-value="100">100%</button>
              </div>
              
              <h4 className="sub-label estimate-size-label">Estimated Size</h4>
              <div className="form-field estimate-size-field">
                <select id="estimate-size-previous-auto" name="estimateSizePreviousAuto">
                  <option value="">Select Range</option>
                  <option value="1-10">1-10</option>
                  <option value="11-25">11-25</option>
                  <option value="26+">26+</option>
                </select>
                <label htmlFor="estimate-size-previous-auto" style={{ backgroundColor: '#001b2f'}}>Estimate Size</label>
              </div>
            </div>

            <h3 className="objective-label" id="auto-current-cycle-label">Current Auto Cycle</h3>

            <h4 className="sub-label">Accuracy</h4>
            <div className="accuracy-button-group" role="group" aria-labelledby="auto-accuracy-label">
              <button type="button" className="accuracy-button" data-value="0" aria-label="0 percent accuracy">0%</button>
              <button type="button" className="accuracy-button" data-value="25" aria-label="25 percent accuracy">25%</button>
              <button type="button" className="accuracy-button" data-value="50" aria-label="50 percent accuracy">50%</button>
              <button type="button" className="accuracy-button" data-value="75" aria-label="75 percent accuracy">75%</button>
              <button type="button" className="accuracy-button" data-value="95" aria-label="95 percent accuracy">95%</button>
              <button type="button" className="accuracy-button" data-value="100" aria-label="100 percent accuracy">100%</button>
            </div>

            <h4 className="sub-label estimate-size-label">Estimated Size</h4>
            <div className="form-field estimate-size-field">
              <select id="estimate-size-auto" name="estimateSizeAuto">
                <option value="">Select Range</option>
                <option value="1-10">1-10</option>
                <option value="11-25">11-25</option>
                <option value="26+">26+</option>
              </select>
              <label htmlFor="estimate-size-auto">Estimate Size</label>
            </div>

            <div className="cycle-button-area">
              <button type="button" className="cycle-button" id="auto-cycle-button">
                CYCLE
              </button>
              <div className="cycle-count" id="auto-cycle-count">Auto Cycles: 0</div>
            </div>

            <h3 className="objective-label" id="auto-climb-label">Climb</h3>
            <div className="toggle-button-group" role="group" aria-labelledby="auto-climb-label">
              <button 
                type="button" 
                className="toggle-button selected" 
                data-value="no"
                role="radio"
                aria-checked="true"
                aria-label="Robot did not climb in autonomous"
              >
                No
              </button>
              <button 
                type="button" 
                className="toggle-button" 
                data-value="yes"
                role="radio"
                aria-checked="false"
                aria-label="Robot climbed in autonomous"
              >
                Yes
              </button>
            </div>

            <h2 className="section-title">Teleop</h2>

            <div id="previous-cycle-section" className="previous-cycle-section" style={{ display: 'none', backgroundColor: '#001b2f', borderRadius: '8px'}}>
              <h3 className="objective-label">Previous Cycle</h3>
                <div className="cycle-count" id="previous-cycle-count">Cycle: 0</div>
              
              <h4 className="sub-label">Accuracy</h4>
              <div className="accuracy-button-group">
                <button type="button" className="accuracy-button-previous" data-value="0">0%</button>
                <button type="button" className="accuracy-button-previous" data-value="25">25%</button>
                <button type="button" className="accuracy-button-previous" data-value="50">50%</button>
                <button type="button" className="accuracy-button-previous" data-value="75">75%</button>
                <button type="button" className="accuracy-button-previous" data-value="95">95%</button>
                <button type="button" className="accuracy-button-previous" data-value="100">100%</button>
              </div>
              
              <h4 className="sub-label estimate-size-label">Estimated Size</h4>
              <div className="form-field estimate-size-field">
                <select id="estimate-size-previous" name="estimateSizePrevious">
                  <option value="">Select Range</option>
                  <option value="1-10">1-10</option>
                  <option value="11-25">11-25</option>
                  <option value="26+">26+</option>
                </select>
                <label htmlFor="estimate-size-previous" style={{ backgroundColor: '#001b2f'}}>Estimate Size</label>
              </div>
            </div>

            <h3 className="objective-label" id="current-cycle-label">Current Teleop Cycle</h3>
            
            <h4 className="sub-label">Accuracy</h4>
            <div className="accuracy-button-group">
              <button type="button" className="accuracy-button-teleop" data-value="0">0%</button>
              <button type="button" className="accuracy-button-teleop" data-value="25">25%</button>
              <button type="button" className="accuracy-button-teleop" data-value="50">50%</button>
              <button type="button" className="accuracy-button-teleop" data-value="75">75%</button>
              <button type="button" className="accuracy-button-teleop" data-value="95">95%</button>
              <button type="button" className="accuracy-button-teleop" data-value="100">100%</button>
            </div>
            
            <h4 className="sub-label estimate-size-label">Estimated Size</h4>
            <div className="form-field estimate-size-field">
              <select id="estimate-size" name="estimateSize">
                <option value="">Select Range</option>
                <option value="1-10">1-10</option>
                <option value="11-25">11-25</option>
                <option value="26+">26+</option>
              </select>
              <label htmlFor="estimate-size">Estimate Size</label>
            </div>
            <div className="cycle-button-area">
              <button type="button" className="cycle-button" id="cycle-button">
                CYCLE
              </button>
              <div className="cycle-count" id="cycle-count">Cycles: 0</div>
            </div>
            <h3 className="objective-label">Climb</h3>
            <div className="toggle-button-group climb-button-group">
              <button type="button" className="toggle-button-teleop selected" data-value="none">
                None
              </button>
              <button type="button" className="toggle-button-teleop" data-value="l1">
                L1
              </button>
              <button type="button" className="toggle-button-teleop" data-value="l2">
                L2
              </button>
              <button type="button" className="toggle-button-teleop" data-value="l3">
                L3
              </button>
            </div>

            <div className="action-area">
              <button 
                type="button" 
                className="back-button" 
                onClick={handleBack}
                aria-label="Go back to login page"
              >
                Back
              </button>
              <button 
                type="submit" 
                className="submit-button"
                aria-label="Submit match data"
              >
                Submit
              </button>
            </div>
          </div>
        </form>
      </main>
    </>
  );
});

DataCollection.displayName = 'DataCollection';

export default DataCollection;
