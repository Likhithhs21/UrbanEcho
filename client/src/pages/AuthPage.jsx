import React, { useState } from 'react';
//import { useNavigate } from 'react-router-dom';
import './AuthPage.css';
import axios from 'axios';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleForm = () => {
    setForm({ username: '', password: '' });
    setError('');
    setIsLogin(!isLogin);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      const url = isLogin
        ? 'http://localhost:5001/api/auth/login'
        : 'http://localhost:5001/api/auth/register';

      const payload = {
        username: form.username,
        password: form.password,
        userType: 'volunteer' // Changed from 'role' to 'userType' to match backend
      };

      const res = await axios.post(url, payload);

      if (isLogin) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('userType', res.data.userType);
        localStorage.setItem('username', res.data.username);
        // Redirect after successful login
        window.location.href = '/home';
      } else {
        // Registration successful - switch to login mode with same credentials
        setIsLogin(true);
        // Don't clear form - keep the credentials for immediate login
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>UrbanEcho</h1>
            <h2>{isLogin ? 'Sign In' : 'Sign Up'}</h2>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>

            <button type="submit" disabled={loading}>
              {loading ? (isLogin ? 'Signing In...' : 'Creating Account...') : (isLogin ? 'Sign In' : 'Sign Up')}
            </button>
          </form>

          {error && <p className="error">{error}</p>}

          <div className="auth-footer">
            <button type="button" onClick={toggleForm}>
              {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
