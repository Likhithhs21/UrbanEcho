import React, { useState, useEffect } from 'react';
import './Action.css';

const Action = () => {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('pending');
  const [assigning, setAssigning] = useState(new Set());
  const [markingDone, setMarkingDone] = useState(new Set());
  const [verifying, setVerifying] = useState(new Set());

  const loadProblems = React.useCallback(async () => {
    setLoading(true);
    try {
      console.log('🚀 Loading problems for NGO actions...');
      const token = localStorage.getItem('token');

      if (!token) {
        fetchProblems();
      } else {
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/problems`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to load problems: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Problems loaded for NGO:', data.length);

        // Get locally modified problems from localStorage
        const localModifications = JSON.parse(localStorage.getItem('problemModifications') || '{}');

        // Apply local modifications to server data
        const modifiedData = data.map(problem => {
          if (localModifications[problem._id]) {
            console.log(`🔄 Applying local modification for problem ${problem._id}:`, localModifications[problem._id]);
            return { ...problem, ...localModifications[problem._id] };
          }
          return problem;
        });

        setProblems(modifiedData);
      }
    } catch (err) {
      console.error('❌ Failed to load problems:', err);
      setError('Failed to load problems. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProblems();
  }, []);

  const fetchProblems = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/problems/all`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch problems');
      }

      const data = await response.json();
      console.log('📋 Fetched problems:', data.length);

      // Apply local modifications from localStorage
      const localModifications = JSON.parse(localStorage.getItem('problemModifications') || '{}');
      const modifiedProblems = data.map(problem => {
        if (localModifications[problem._id]) {
          return { ...problem, ...localModifications[problem._id] };
        }
        return problem;
      });

      setProblems(modifiedProblems);
      console.log('📊 Problems loaded with local modifications:', modifiedProblems.length);
    } catch (err) {
      console.error('❌ Failed to fetch problems:', err);
      setError('Failed to load problems. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignStaff = async (problemId) => {
    console.log('🚀 Assigning problem:', problemId);

    if (assigning.has(problemId)) return;

    setAssigning(prev => new Set(prev).add(problemId));

    try {
      // Update local state immediately - this is what moves the problem to assigned section
      setProblems(prev => {
        const updatedProblems = prev.map(problem =>
          problem._id === problemId
            ? { ...problem, status: 'assigned' }
            : problem
        );
        console.log('✅ Problem moved to assigned section');
        return updatedProblems;
      });

      // Save local modification to localStorage for persistence
      const localModifications = JSON.parse(localStorage.getItem('problemModifications') || '{}');
      localModifications[problemId] = { status: 'assigned' };
      localStorage.setItem('problemModifications', JSON.stringify(localModifications));
      console.log('💾 Saved local modification for problem:', problemId);

      // Optional: Try to update server in background
      const token = localStorage.getItem('token');
      if (token) {
        fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/problems/${problemId}/assign`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }).catch(err => console.log('Server update failed:', err.message));
      }

    } catch (err) {
      console.error('Error:', err);
    } finally {
      setAssigning(prev => {
        const newSet = new Set(prev);
        newSet.delete(problemId);
        return newSet;
      });
    }
  };

  const handleVerify = async (problemId) => {
    console.log('🚀 Verifying problem:', problemId);

    if (verifying.has(problemId)) {
      console.log('⏳ Already verifying, preventing multiple clicks');
      return;
    }

    setVerifying(prev => new Set(prev).add(problemId));
    console.log('⏳ Added to verifying set, current verifying:', Array.from(verifying));

    try {
      // Create file input element
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment'; // Use camera on mobile devices

      console.log('📸 File input created, waiting for user selection...');

      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) {
          console.log('❌ No file selected');
          setVerifying(prev => {
            const newSet = new Set(prev);
            newSet.delete(problemId);
            return newSet;
          });
          return;
        }

        console.log('📸 Photo selected:', file.name, 'Size:', file.size, 'Type:', file.type);

        // Validate file type
        if (!file.type.startsWith('image/')) {
          alert('Please select an image file only');
          setVerifying(prev => {
            const newSet = new Set(prev);
            newSet.delete(problemId);
            return newSet;
          });
          return;
        }

        // Validate file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
          alert('Please select an image smaller than 5MB');
          setVerifying(prev => {
            const newSet = new Set(prev);
            newSet.delete(problemId);
            return newSet;
          });
          return;
        }

        console.log('✅ File validation passed, uploading...');

        // Create FormData for file upload
        const formData = new FormData();
        formData.append('verificationImage', file);

        console.log('📦 FormData created with field name: verificationImage');
        console.log('📦 FormData entries:', Array.from(formData.entries()));

        const token = localStorage.getItem('token');
        if (!token) {
          alert('Please log in to verify problems');
          setVerifying(prev => {
            const newSet = new Set(prev);
            newSet.delete(problemId);
            return newSet;
          });
          return;
        }

        try {
          console.log('🔗 Uploading verification image to server...');
          const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/problems/${problemId}/verify`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
              // Don't set Content-Type when sending FormData - browser will set it with boundary
            },
            body: formData
          });

          console.log('📡 Server response status:', response.status);

          if (!response.ok) {
            let errorMessage = `Verification failed: ${response.status}`;
            try {
              const errorData = await response.json();
              if (errorData.error) {
                errorMessage = errorData.error;
              }
            } catch (parseError) {
              // If we can't parse the error response, use the status text
              errorMessage = `Verification failed: ${response.status} ${response.statusText}`;
            }
            console.error('❌ Server error:', errorMessage);
            throw new Error(errorMessage);
          }

          const result = await response.json();
          console.log('✅ Problem verified successfully:', result);

          // Update local state immediately
          setProblems(prev => {
            const updatedProblems = prev.map(problem =>
              problem._id === problemId
                ? { ...problem, status: 'verified' }
                : problem
            );
            console.log('✅ Problem moved to verified section');
            return updatedProblems;
          });

          // Save local modification to localStorage for persistence
          const localModifications = JSON.parse(localStorage.getItem('problemModifications') || '{}');
          localModifications[problemId] = { status: 'verified' };
          localStorage.setItem('problemModifications', JSON.stringify(localModifications));
          console.log('💾 Saved local modification for problem:', problemId);

          alert('Problem verified successfully!');

        } catch (err) {
          console.error('❌ Verification failed:', err);
          alert(`Failed to verify problem: ${err.message}`);
        } finally {
          setVerifying(prev => {
            const newSet = new Set(prev);
            newSet.delete(problemId);
            return newSet;
          });
        }
      };

      // Trigger file selection dialog
      console.log('🖱️ Triggering file selection dialog...');
      input.click();

    } catch (err) {
      console.error('❌ Error in handleVerify:', err);
      alert('Error occurred while trying to verify problem');
      setVerifying(prev => {
        const newSet = new Set(prev);
        newSet.delete(problemId);
        return newSet;
      });
    }
  };

  const handleMarkAsDone = async (problemId) => {
    console.log('🖱️ Mark as Done button clicked for problem:', problemId);
    console.log('🔍 Current markingDone set:', Array.from(markingDone));

    if (markingDone.has(problemId)) {
      console.log('⏳ Already processing this problem, ignoring click');
      return;
    }

    console.log('✅ Starting mark as done process...');
    setMarkingDone(prev => {
      const newSet = new Set(prev).add(problemId);
      console.log('📊 Updated markingDone set:', Array.from(newSet));
      return newSet;
    });

    try {
      const token = localStorage.getItem('token');
      console.log('🔑 Token present:', !!token);

      // Check current problem status before making API call
      const currentProblem = problems.find(p => p._id === problemId);
      console.log('📋 Current problem status:', currentProblem?.status);

      // Check localStorage modifications
      const localStorageModifications = JSON.parse(localStorage.getItem('problemModifications') || '{}');
      console.log('💾 LocalStorage modifications:', localStorageModifications);
      console.log('💾 Modification for this problem:', localStorageModifications[problemId]);

      // For verified problems, just submit to government (mark as done)
      // No need to verify again since they are already verified
      console.log('📡 Sending request to mark as done...');
      const submitResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/problems/${problemId}/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Server response status:', submitResponse.status);

      if (!submitResponse.ok) {
        let errorMessage = 'Failed to mark as done';
        try {
          const errorData = await submitResponse.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (parseError) {
          // If we can't parse the error response, use the status text
          errorMessage = `Failed to mark as done: ${submitResponse.status} ${submitResponse.statusText}`;
        }
        console.error('❌ Submit error:', errorMessage);
        throw new Error(errorMessage);
      }

      const updatedProblem = await submitResponse.json();
      console.log('✅ Problem marked as done:', updatedProblem);
      console.log('📋 Updated problem status:', updatedProblem.status);

      // Update local state immediately for better UX
      setProblems(prev => {
        const updatedProblems = prev.map(problem =>
          problem._id === problemId
            ? { ...problem, status: 'done' }
            : problem
        );
        console.log('📊 Updated problems count after marking as done:', {
          total: updatedProblems.length,
          pending: updatedProblems.filter(p => p.status === 'pending').length,
          assigned: updatedProblems.filter(p => p.status === 'assigned').length,
          verified: updatedProblems.filter(p => p.status === 'verified').length,
          done: updatedProblems.filter(p => p.status === 'done').length
        });
        return updatedProblems;
      });

      // Save local modification to localStorage for persistence
      const localModifications = JSON.parse(localStorage.getItem('problemModifications') || '{}');
      localModifications[problemId] = { status: 'done' };
      localStorage.setItem('problemModifications', JSON.stringify(localModifications));
      console.log('💾 Saved local modification for problem:', problemId);

      // Then fetch updated problems from server
      loadProblems();
    } catch (err) {
      console.error('❌ Failed to mark as done:', err);
      alert(`Failed to mark as done: ${err.message}`);
    } finally {
      console.log('🧹 Cleaning up markingDone set');
      setMarkingDone(prev => {
        const newSet = new Set(prev);
        newSet.delete(problemId);
        console.log('📊 Final markingDone set:', Array.from(newSet));
        return newSet;
      });
    }
  };

  const getStatusBadge = (problem) => {
    switch(problem.status) {
      case 'assigned':
        return <span className="status-badge assigned">👥 Assigned to Staff</span>;
      case 'verified':
        return <span className="status-badge verified">✅ Verified</span>;
      case 'sent_to_government':
        return <span className="status-badge sent">📤 Sent to Government</span>;
      case 'done':
        return <span className="status-badge done">🏆 Done</span>;
      case 'pending':
      default:
        return <span className="status-badge pending">⏳ Pending</span>;
    }
  };

  if (loading) {
    return (
      <div className="action-page">
        <div className="action-container">
          <div className="loading-message">Loading NGO actions...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="action-page">
        <div className="action-container">
          <div className="error-message">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="action-page">
      <div className="action-container">
        <div className="action-header">
          <h1 className="action-title">NGO Action Center</h1>
          <p className="action-subtitle">Manage community problems and coordinate with government</p>
        </div>

        <div className="action-content">
          <div className="action-filters">
            <button
              className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
              onClick={() => {
                console.log('🔄 Switching to pending filter');
                setFilter('pending');
              }}
            >
              Pending ({problems.filter(p => p.status === 'pending').length})
            </button>
            <button
              className={`filter-btn ${filter === 'assigned' ? 'active' : ''}`}
              onClick={() => {
                console.log('🔄 Switching to assigned filter');
                setFilter('assigned');
              }}
            >
              Assigned ({problems.filter(p => p.status === 'assigned').length})
            </button>
            <button
              className={`filter-btn ${filter === 'verified' ? 'active' : ''}`}
              onClick={() => {
                console.log('🔄 Switching to verified filter');
                setFilter('verified');
              }}
            >
              Verified ({problems.filter(p => p.status === 'verified').length})
            </button>
            <button
              className={`filter-btn ${filter === 'done' ? 'active' : ''}`}
              onClick={() => {
                console.log('🔄 Switching to done filter');
                setFilter('done');
              }}
            >
              Done ({problems.filter(p => p.status === 'done').length})
            </button>
          </div>

          <div className="problems-section">
            {problems.filter(problem => problem.status === filter).length === 0 ? (
              <div className="no-problems">
                <p>No problems found in this category.</p>
              </div>
            ) : (
              <div className="problems-grid">
                {problems.filter(problem => problem.status === filter).map((problem) => (
                  <div key={problem._id} className="problem-card">
                    {problem.image && (
                      <div className="problem-image">
                        <img src={`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}${problem.image}`} alt={problem.title} />
                      </div>
                    )}

                    <div className="problem-content">
                      <div className="problem-header">
                        <h3 className="problem-title">{problem.title}</h3>
                        <div className="problem-location">📍 {problem.location}</div>
                      </div>

                      <p className="problem-description">{problem.description}</p>

                      <div className="problem-footer">
                        <div className="problem-meta">
                          <span className="reporter">Reported by: {problem.reporter?.username || 'Unknown'}</span>
                          <span className="date">Date: {new Date(problem.createdAt).toLocaleDateString()}</span>
                        </div>

                        <div className="problem-status-section">
                          {getStatusBadge(problem)}

                          <div className="action-buttons">
                            {problem.status === 'pending' && (
                              <button
                                className={`assign-staff-btn ${assigning.has(problem._id) ? 'loading' : ''}`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('🖱️ Assign Staff button clicked for problem:', problem._id);
                                  handleAssignStaff(problem._id);
                                }}
                                disabled={assigning.has(problem._id)}
                                style={{ pointerEvents: assigning.has(problem._id) ? 'none' : 'auto', zIndex: 10 }}
                              >
                                {assigning.has(problem._id) ? '⏳ Assigning...' : '👥 Assign Staff'}
                              </button>
                            )}

                            {problem.status === 'assigned' && (
                              <button
                                className={`verify-btn ${verifying.has(problem._id) ? 'loading' : ''}`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('🖱️ Verify button clicked for problem:', problem._id);
                                  handleVerify(problem._id);
                                }}
                                disabled={verifying.has(problem._id)}
                                style={{
                                  pointerEvents: verifying.has(problem._id) ? 'none' : 'auto',
                                  cursor: verifying.has(problem._id) ? 'not-allowed' : 'pointer',
                                  zIndex: 10
                                }}
                              >
                                {verifying.has(problem._id) ? '⏳ Verifying...' : '📸 Verify'}
                              </button>
                            )}

                            {problem.status === 'verified' && (
                              <button
                                className={`mark-done-btn ${markingDone.has(problem._id) ? 'loading' : ''}`}
                                onClick={() => handleMarkAsDone(problem._id)}
                                disabled={markingDone.has(problem._id)}
                              >
                                {markingDone.has(problem._id) ? '⏳ Processing...' : '✅ Mark as Done'}
                              </button>
                            )}

                            {problem.status === 'sent_to_government' && (
                              <span className="sent-text">📤 Sent to Government</span>
                            )}

                            {problem.status === 'done' && (
                              <span className="completed-text">✅ Completed</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Action;
