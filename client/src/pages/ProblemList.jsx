import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchProblems, upvoteProblem } from '../utils/api';
import './ProblemList.css';

const ProblemList = () => {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userVotes, setUserVotes] = useState(new Set()); // Track which problems user has voted on
  const location = useLocation();
  //const navigate = useNavigate(); //

  // Check if we should show only user's problems
  const urlParams = new URLSearchParams(location.search);
  const userOnly = urlParams.get('userOnly') === 'true';
  const isVotePage = location.pathname === '/vote';

  // Determine context based on user type and route
  const getPageContext = () => {
    const userType = localStorage.getItem('userType');

    if (userType === 'volunteer') {
      if (isVotePage) {
        return { mode: 'vote', title: 'Vote on Community Problems', desc: 'Help prioritize community issues by voting' };
      } else if (userOnly) {
        return { mode: 'user-problems', title: 'My Reported Problems', desc: 'View and manage problems you\'ve reported' };
      } else {
        return { mode: 'volunteer-list', title: 'Community Problem Reports', desc: 'Help us prioritize issues by voting' };
      }
    } else if (userType === 'ngo') {
      return { mode: 'ngo-list', title: 'Problems List (Sorted by Votes)', desc: 'View community problems sorted by highest votes first' };
    }

    return { mode: 'default', title: 'Community Problem Reports', desc: 'View community problems' };
  };

  const pageContext = getPageContext();
  const canVote = localStorage.getItem('userType') === 'volunteer' && isVotePage;

  // Initialize user votes when component mounts or problems change
  useEffect(() => {
    const initializeUserVotes = () => {
      const currentUserId = localStorage.getItem('userId');
      console.log('🔍 Initializing user votes for userId:', currentUserId);
      if (currentUserId && problems.length > 0) {
        const votes = new Set();
        problems.forEach(problem => {
          if (problem.upvotes && problem.upvotes.includes(currentUserId)) {
            votes.add(problem._id);
          }
        });
        console.log('📋 User votes initialized:', Array.from(votes));
        setUserVotes(votes);
      }
    };

    initializeUserVotes();
  }, [problems]); // Add problems to dependency array
const loadProblems = async () => {
    setError('');
    setLoading(true);
    try {
      console.log('🚀 Loading problems from API...');
      console.log('👤 Current user type:', localStorage.getItem('userType'));
      console.log('🔐 Current token:', localStorage.getItem('token') ? 'present' : 'missing');

      const currentUserId = localStorage.getItem('userId');

      let problemsData;
      if (userOnly && currentUserId) {
        // Fetch only current user's problems
        console.log('📋 Fetching user-specific problems for userId:', currentUserId);
        problemsData = await fetchProblems(currentUserId);
        console.log('✅ User-specific problems loaded:', problemsData?.length || 0);
      } else {
        // Fetch all problems (for vote page or general problem list)
        console.log('📋 Fetching all problems...');
        problemsData = await fetchProblems();
        console.log('✅ All problems loaded:', problemsData?.length || 0);
      }

      let filtered = problemsData ? [...problemsData] : [];
      console.log('📊 Raw problems data:', filtered.length);

      // Sort problems by highest votes first (especially important for vote page)
      const sorted = filtered.sort((a, b) => (b.votesCount || 0) - (a.votesCount || 0));
      console.log('📊 Sorted problems by votes:', sorted.length);

      setProblems(sorted);

      console.log('📊 Problems loaded:', sorted.length);
      console.log('🔐 Current userId in localStorage:', currentUserId);
    } catch (err) {
      console.error('❌ Failed to fetch problems:', err);
      console.error('❌ Error details:', err.response?.data || err.message);
      setError('Failed to fetch problems. Please try again later.');
      setProblems([]); // Ensure problems is empty on error
    } finally {
      console.log('🏁 Loading finished, setting loading to false');
      setLoading(false);
    }
  };

  const handleUpvote = async (id) => {
    console.log('🔥 UPVOTE BUTTON CLICKED for problem ID:', id);
    console.log('Current userId in localStorage:', localStorage.getItem('userId'));
    const token = localStorage.getItem('token');
    const currentUserId = localStorage.getItem('userId');

    if (!token) {
      console.log('❌ No token found - user not logged in');
      alert('You must be logged in to vote!');
      return;
    }

    if (!currentUserId) {
      console.log('❌ No userId found - user ID not stored');
      alert('User ID not found. Please log in again.');
      return;
    }

    try {
      console.log('🚀 Making API call to upvote problem:', id);
      const result = await upvoteProblem(id);
      console.log('✅ Upvote API call successful:', result);

      // Update local vote state based on server response
      if (result.action === 'added' || result.action === 'removed') {
        setUserVotes(prev => {
          const newVotes = new Set(prev);
          if (result.hasVoted) {
            newVotes.add(id); // User now has voted
            console.log('➕ Vote added locally');
          } else {
            newVotes.delete(id); // User vote removed
            console.log('🗑️ Vote removed locally');
          }
          return newVotes;
        });

        // Update the specific problem's vote count locally for immediate feedback
        setProblems(prev => prev.map(problem => {
          if (problem._id === id) {
            const newCount = result.votesCount;
            console.log('📊 Vote count updated:', problem.votesCount, '→', newCount);
            return {
              ...problem,
              votesCount: newCount
            };
          }
          return problem;
        }));

        console.log('✨ Upvote process completed successfully');
      }

    } catch (err) {
      console.error('❌ Upvote failed:', err.response?.data?.error || err.message);
      console.error('❌ Full error object:', err);
      alert(err.response?.data?.error || 'Vote failed. Please try again.');
    }
  };

  useEffect(() => {
    loadProblems();
  }, [loadProblems]);

  if (loading) return (
    <div className="problemlist-container">
      <div className="loading-message">Loading problems...</div>
    </div>
  );

  if (error) return (
    <div className="problemlist-container">
      <div className="error-message">{error}</div>
    </div>
  );

  // Debug: Log current state
  console.log('🔍 ProblemList Debug:', {
    problemsCount: problems.length,
    loading,
    error,
    isVotePage,
    userOnly,
    location: location.pathname,
    userId: localStorage.getItem('userId'),
    token: localStorage.getItem('token') ? 'present' : 'missing'
  });

  return (
    <div className="problemlist-container">
      <div className="problemlist-content">
        <div className="problemlist-header">
          <h1 className="problemlist-title">
            {pageContext.title}
          </h1>
          <p className="problemlist-subtitle">
            {pageContext.desc}
          </p>
        </div>

        {problems.length === 0 ? (
          <div className="no-problems">
            <p>
              {pageContext.mode === 'vote'
                ? "No problems available for voting at the moment. Be the first to report an issue!"
                : pageContext.mode === 'user-problems'
                ? "You haven't reported any problems yet. Start making a difference in your community!"
                : pageContext.mode === 'ngo-list'
                ? "No problems have been reported yet. Check back later for community issues."
                : "No problems reported yet. Be the first to report an issue in your community!"
              }
            </p>
          </div>
        ) : (
          <div className="problems-grid">
            {problems.map((problem, index) => {
              console.log(`🔍 Rendering problem ${index + 1}:`, {
                id: problem._id,
                title: problem.title,
                votesCount: problem.votesCount,
                hasVoted: userVotes.has(problem._id)
              });

              return (
                <div key={problem._id} className="problem-card">
                  {problem.image && (
                    <div className="problem-image">
                      <img src={problem.image} alt={problem.title} />
                    </div>
                  )}
                  <div className="problem-header">
                    <h3 className="problem-title">{problem.title}</h3>
                    <div className="problem-location">📍 {problem.location}</div>
                  </div>

                  <p className="problem-description">{problem.description}</p>

                  <div className="problem-footer">
                    {problem.reporter && (
                      <div className="problem-reporter">Reported by: {problem.reporter.username}</div>
                    )}
                    <div className="problem-footer-right">
                      <span className={`problem-status status-${problem.category?.toLowerCase() || 'pending'}`}>
                        {problem.category || 'Pending'}
                      </span>
                      <div className={`problem-votes ${isVotePage ? 'vote-page-highlight' : ''}`}>
                        {canVote ? (
                          <button
                            className="upvote-btn"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log('🖱️ Button clicked for problem:', problem._id);
                              handleUpvote(problem._id);
                            }}
                            title="Upvote this problem"
                            type="button"
                            style={{ pointerEvents: 'auto', zIndex: 10 }}
                          >
                            <span className="vote-icon">👍</span>
                            <span className="vote-count">{problem.votesCount || 0}</span>
                          </button>
                        ) : (
                          <div className="vote-display">
                            <span className="vote-icon">👍</span>
                            <span className="vote-count">{problem.votesCount || 0}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProblemList;
