import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Rewards.css';

const Rewards = () => {
  const [activeTab, setActiveTab] = useState('rewards');
  const [civicCard, setCivicCard] = useState(null);
  const [transactions, setTransactions] = useState([]);
  //const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newBadges, setNewBadges] = useState([]);
  const [rewards, setRewards] = useState([]);

  const token = localStorage.getItem('token');

  useEffect(() => {
    if (token) {
      fetchDashboardData();
    }
  }, [token]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      if (!token) {
        setError('Authentication required');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      const [cardRes, transRes, rewardsRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/rewards/civic-card`, { headers }),
        axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/rewards/transactions?limit=10`, { headers }),
        axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/rewards/rewards`)
      ]);

      const rewardsList = Array.isArray(rewardsRes?.data?.rewards) ? rewardsRes.data.rewards : [];
      console.log('📊 Rewards data received:', rewardsList.length, 'rewards');

      setCivicCard(cardRes.data);
      setTransactions(transRes.data.transactions || []);
      setRewards(rewardsList);
      
      // Show new badges notification
      if (cardRes.data.newBadges && cardRes.data.newBadges.length > 0) {
        setNewBadges(cardRes.data.newBadges);
        setTimeout(() => setNewBadges([]), 5000); // Hide after 5 seconds
      }

      console.log('✅ State updated with', rewardsList.length, 'rewards');
      console.log('💳 Civic card data:', cardRes.data);
      console.log('💰 Balance from server:', cardRes.data?.balance);
    } catch (err) {
      console.error('Error fetching rewards data:', err);
      if (err.response?.status === 404) {
        setError('Rewards system not available. Please restart the server.');
      } else if (err.response?.status === 401) {
        setError('Authentication required. Please log in again.');
      } else {
        setError('Failed to load rewards data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemReward = async (rewardId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Authentication required');
        return;
      }

      console.log('🎫 REDEEMING REWARD:', rewardId);
      console.log('💰 Current balance:', civicCard?.balance);
      console.log('🏷️ Civic card exists:', !!civicCard);

      const response = await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/rewards/redeem/${rewardId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Show redemption success with voucher details
      const { redemptionCode, reward, newBalance, transactionId } = response.data;
      showRedemptionSuccess(redemptionCode);

      // Optimistically update UI: balance, vouchers, rewards, and switch tab
      if (typeof newBalance === 'number') {
        setCivicCard(prev => prev ? {
          ...prev,
          balance: newBalance,
          totalSpent: (prev.totalSpent || 0) + (reward?.coinsSpent || 0)
        } : prev);
      }

      // Remove redeemed reward from the list
      setRewards(prev => prev.filter(r => r._id !== rewardId));

      // Add optimistic transaction entry and switch to transactions tab
      if (reward?.coinsSpent) {
        setTransactions(prev => [
          {
            type: 'spent',
            amount: reward.coinsSpent,
            description: `Redeemed: ${reward.name}`,
            createdAt: new Date().toISOString(),
            _id: transactionId || Math.random().toString(36).slice(2)
          },
          ...prev
        ]);
      }

      setActiveTab('transactions');
    } catch (err) {
      console.error('❌ Error redeeming reward:', err);
      if (err.response?.status === 400) {
        alert(err.response.data.error || 'Cannot redeem this reward');
      } else {
        alert('Failed to redeem reward. Please try again.');
      }
    }
  };

  const showRedemptionSuccess = (redemptionData) => {
    const voucherWindow = window.open('', '_blank', 'width=400,height=600');
    voucherWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Digital Voucher</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
          }
          .voucher {
            background: white;
            color: #333;
            border-radius: 15px;
            padding: 30px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          }
          .code-section {
            margin: 20px 0;
            border: 2px solid #10b981;
            border-radius: 10px;
            padding: 20px;
            background: #f0f9ff;
          }
          .code {
            font-family: monospace;
            font-size: 18px;
            font-weight: bold;
            color: #10b981;
            margin: 10px 0;
          }
          .expires {
            color: #666;
            font-size: 14px;
            margin-top: 20px;
          }
          .instructions {
            background: #f0f9ff;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            color: #0369a1;
          }
        </style>
      </head>
      <body>
        <div class="voucher">
          <h2>🎉 Digital Voucher</h2>
          <h3>${redemptionData.reward.name}</h3>
          <div class="code-section">
            <div class="code">Code: ${redemptionData.code}</div>
          </div>
          <div class="instructions">
            <strong>How to use:</strong><br>
            Show this code to the merchant<br>
            <strong>${redemptionData.code}</strong>
          </div>
          <div class="expires">
            Valid until: ${new Date(redemptionData.expiresAt).toLocaleDateString()}
          </div>
        </div>
      </body>
      </html>
    `);
  };

 /* const handleVoucherRedemption = async (voucherCode) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Authentication required');
        return;
      }

      console.log('🎫 REDEEMING VOUCHER:', voucherCode);

      // Show voucher details in a popup
      showVoucherDetails(voucherCode);

      // Refresh data after voucher redemption
      fetchDashboardData();
    } catch (err) {
      console.error('❌ Error redeeming voucher:', err);
      alert('Failed to redeem voucher. Please try again.');
    }
  };  */

  const showVoucherDetails = (voucherCode) => {
    const voucherWindow = window.open('', '_blank', 'width=400,height=600');
    voucherWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Voucher Details</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
          }
          .voucher {
            background: white;
            color: #333;
            border-radius: 15px;
            padding: 30px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          }
          .code {
            font-family: monospace;
            font-size: 18px;
            font-weight: bold;
            color: #10b981;
            margin: 10px 0;
          }
        </style>
      </head>
      <body>
        <div class="voucher">
          <h2>🎫 Voucher Redeemed</h2>
          <p>Your voucher code <span class="code">${voucherCode}</span> has been used!</p>
        </div>
      </body>
      </html>
    `);
  };
  if (loading) {
    return (
      <div className="rewards-page">
        <div className="loading-message">Loading rewards...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rewards-page">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="rewards-page">
      {/* New Badge Notifications */}
      {newBadges.length > 0 && (
        <div className="badge-notification">
          <div className="badge-notification-content">
            <h3>🎉 New Badge Earned!</h3>
            {newBadges.map((badge, index) => (
              <div key={index} className="new-badge-item">
                <span className="badge-icon-large">{badge.icon}</span>
                <div className="badge-details">
                  <div className="badge-name">{badge.name}</div>
                  <div className="badge-description">{badge.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="rewards-container">
        <div className="rewards-header">
          <h1>Echo Rewards</h1>
          <p>Earn and redeem civic coins for your community contributions</p>
        </div>

        <div className="rewards-tabs">
          <button
            className={`tab-btn ${activeTab === 'rewards' ? 'active' : ''}`}
            onClick={() => {
              console.log('🖱️ Available Rewards tab clicked');
              setActiveTab('rewards');
            }}
          >
            Available Rewards
          </button>
          <button
            className={`tab-btn ${activeTab === 'card' ? 'active' : ''}`}
            onClick={() => {
              console.log('🖱️ My Echo Card tab clicked');
              setActiveTab('card');
            }}
          >
            My Echo Card
          </button>
          <button
            className={`tab-btn ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => {
              console.log('🖱️ Transactions tab clicked');
              setActiveTab('transactions');
            }}
          >
            Transactions
          </button>
          
        </div>

        <div className="rewards-content">
          {activeTab === 'card' && (
            <div className="civic-card-section">
              {civicCard ? (
                <div className="civic-card">
                  <div className="card-header">
                    <div className="card-brand">
                      <h3>Echo Card</h3>
                      <div className="user-info">
                        <div className="username">{civicCard.user?.username || 'User'}</div>
                        <div className="user-role">{civicCard.user?.userType === 'volunteer' ? 'Community Volunteer' : 'NGO'}</div>
                      </div>
                    </div>
                    <div className="card-number">#{civicCard.cardNumber}</div>
                  </div>

                  <div className="card-balance-section">
                    <div className="balance-display">
                      <div className="balance-amount">₹{civicCard.balance}</div>
                      <div className="balance-label">Civic Coins</div>
                    </div>
                  </div>

                  <div className="card-progress-section">
                    <div className="member-tier-row">
                      <div className="member-since">
                        <div className="member-label">Member Since</div>
                        <div className="member-value">
                          {(() => {
                            const registrationDate = localStorage.getItem('registrationDate');
                            return registrationDate
                              ? new Date(registrationDate).toLocaleDateString('en-US', {
                                  month: 'short',
                                  year: 'numeric'
                                })
                              : new Date().toLocaleDateString('en-US', {
                                  month: 'short',
                                  year: 'numeric'
                                });
                          })()}
                        </div>
                      </div>

                      {civicCard && civicCard.problemsReported > 0 && (() => {
                        // Calculate current tier based on problems reported
                        const getCurrentTier = (problemsCount) => {
                          if (problemsCount >= 50) return { name: 'Eco Master', color: '#FFD700' };
                          if (problemsCount >= 30) return { name: 'Eco Hero', color: '#C0C0C0' };
                          if (problemsCount >= 20) return { name: 'Diamond', color: '#B9F2FF' };
                          if (problemsCount >= 15) return { name: 'Platinum', color: '#E5E4E2' };
                          if (problemsCount >= 10) return { name: 'Gold', color: '#FFD700' };
                          if (problemsCount >= 5) return { name: 'Silver', color: '#C0C0C0' };
                          return { name: 'Bronze', color: '#CD7F32' };
                        };

                        const currentTier = getCurrentTier(civicCard.problemsReported);

                        return (
                          <div className="current-tier-badge-horizontal">
                            <div className="tier-badge-horizontal" style={{ borderColor: currentTier.color }}>
                              <span className="tier-text-horizontal" style={{ color: currentTier.color }}>
                                {currentTier.name}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="no-card">
                  <p>You don't have a civic card yet. Civic cards are automatically created when you earn your first coins.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'rewards' && (
            <div className="rewards-section">
              <div className="rewards-header-info">
                <h2>Available Rewards</h2>
                <p className="rewards-count">Showing {rewards.length} rewards</p>
              </div>
              <div className="rewards-grid">
                {rewards.map(reward => (
                  <div key={reward._id} className="reward-card">
                    <div className="reward-header">
                      <h4>{reward.name}</h4>
                      <div className={`coin-cost ${civicCard?.balance >= reward.coinCost ? 'affordable' : 'expensive'}`}>
                        {reward.coinCost} coins
                      </div>
                    </div>
                    <p className="reward-description">{reward.description}</p>
                    <div className="reward-details">
                      <div className="merchant">🏪 {reward.merchant}</div>
                      <div className="location">📍 {reward.merchantLocation}</div>
                      <div className="category">🏷️ {reward.category}</div>
                    </div>
                    <div className="reward-footer">
                      <div className="availability">
                        {reward.maxRedemptions === null
                          ? '♾️ Unlimited'
                          : `${reward.availableRedemptions || 0} left`
                        }
                      </div>
                      <button
                        type="button"
                        className={`redeem-btn ${civicCard && civicCard.balance >= reward.coinCost ? 'enabled' : 'disabled'}`}
                        style={{ pointerEvents: 'auto' }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('🖱️ Redeem button clicked for reward:', reward.name);
                          console.log('💰 Current balance:', civicCard?.balance);
                          console.log('💰 Required cost:', reward.coinCost);
                          console.log('✅ Can afford?', civicCard && civicCard.balance >= reward.coinCost);
                          if (civicCard && civicCard.balance >= reward.coinCost) {
                            handleRedeemReward(reward._id);
                          } else {
                            console.log('❌ Cannot redeem - insufficient balance or no civic card');
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            if (civicCard && civicCard.balance >= reward.coinCost) {
                              handleRedeemReward(reward._id);
                            }
                          }
                        }}
                      >
                        {civicCard && civicCard.balance >= reward.coinCost ? 'Redeem' : 'Insufficient Coins'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {rewards.length === 0 && (
                <div className="no-rewards">
                  <p>No rewards available at the moment.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="transactions-section">
              <div className="rewards-header-info">
                <h2>Recent Transactions</h2>
                <p className="rewards-count">Last {transactions.length} activities</p>
              </div>
              {transactions.length > 0 ? (
                <div className="transactions-list">
                  {transactions.map((t, idx) => (
                    <div key={idx} className="transaction-item">
                      <div className="transaction-icon">{t.type === 'spent' ? '💸' : '💰'}</div>
                      <div className="transaction-details">
                        <div className="transaction-description">{t.description || 'Transaction'}</div>
                        <div className="transaction-date">{new Date(t.createdAt || Date.now()).toLocaleString()}</div>
                      </div>
                      <div className={`transaction-amount ${t.type}`}>
                        {t.type === 'spent' ? '-' : '+'}{t.amount}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-transactions">No recent activity yet.</div>
              )}
            </div>
          )}

          
        </div>
      </div>
    </div>
  );
};

export default Rewards;
