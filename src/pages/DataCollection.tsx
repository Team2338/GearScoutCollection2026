import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { initializeDataCollection } from '@/scripts/data-collection';
import { getPendingMatches, submitAllPendingMatches } from '@/services/matchStorage';
import type { IUser } from '@/model/Models';
import '@/styles/data-collection.scss';

const DataCollection: React.FC = () => {
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    // Initialize the data collection logic
    initializeDataCollection();
  }, []);

  useEffect(() => {
    // Update pending matches count periodically
    const updatePendingCount = () => {
      const userDataStr = sessionStorage.getItem('currentUser');
      if (!userDataStr) {
        return;
      }

      try {
        const userData = JSON.parse(userDataStr) as IUser;
        const pending = getPendingMatches(userData);
        setPendingCount(pending.length);
      } catch (error) {
        if (error instanceof Error) {
          console.warn('[Pending Matches] Error reading:', error.message);
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
    if (!userDataStr) {
      return;
    }

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

  const handleBack = () => {
    navigate('/');
  };

  return (
    <>
      <div className="header">
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
        <div className="header-main">
          <div className="logo">
            <img src="/logo.png" alt="2338 logo" height={100} width={100} loading="eager" />
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
                min="0" 
                max="999"
                autoComplete="off"
              />
              <label htmlFor="match-number">Match Number</label>
            </div>

            <div id="team-number-container">
              <div className="team-number-loader" id="schedule-loader" style={{ display: 'none' }}>
                <div className="textbox-placeholder">Team Number</div>
                <div className="spin-loader"></div>
              </div>

              <div className="form-field" id="team-number-dropdown-container" style={{ display: 'none' }}>
                <select id="team-number-dropdown" name="teamNumberDropdown">
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
                />
                <label htmlFor="team-number">Team Number</label>
              </div>
            </div>

            <div className="alliance-section" id="alliance-section">
              <div className="toggle-button-group">
                <button type="button" className="alliance-toggle red" data-value="red">
                  RED ALLIANCE
                </button>
                <button type="button" className="alliance-toggle blue" data-value="blue">
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

            <h3 className="objective-label">Accuracy</h3>
            <div className="accuracy-button-group">
              <button type="button" className="accuracy-button" data-value="0">0%</button>
              <button type="button" className="accuracy-button" data-value="25">25%</button>
              <button type="button" className="accuracy-button" data-value="50">50%</button>
              <button type="button" className="accuracy-button" data-value="75">75%</button>
              <button type="button" className="accuracy-button" data-value="95">95%</button>
              <button type="button" className="accuracy-button" data-value="100">100%</button>
            </div>

            <h3 className="objective-label">Estimated Size</h3>
            <div className="form-field estimate-size-field">
              <select id="estimate-size-auto" name="estimateSizeAuto">
                <option value="">Select Range</option>
                <option value="1-10">1-10</option>
                <option value="11-25">11-25</option>
                <option value="26+">26+</option>
              </select>
              <label htmlFor="estimate-size-auto">Estimate Size</label>
            </div>

            <h3 className="objective-label">Climb</h3>
            <div className="toggle-button-group">
              <button type="button" className="toggle-button selected" data-value="no">
                No
              </button>
              <button type="button" className="toggle-button" data-value="yes">
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

            <h3 className="objective-label" id="current-cycle-label">Current Cycle</h3>
            
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
            <div className="toggle-button-group">
              <button type="button" className="toggle-button-teleop selected" data-value="no">
                No
              </button>
              <button type="button" className="toggle-button-teleop" data-value="yes">
                Yes
              </button>
            </div>

            <div className="action-area">
              <button type="button" className="back-button" onClick={handleBack}>
                Back
              </button>
              <button type="submit" className="submit-button">
                Submit
              </button>
            </div>
          </div>
        </form>
      </main>
    </>
  );
};

export default DataCollection;
