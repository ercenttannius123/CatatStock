import React, { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'https://catatstock-production.up.railway.app/';

const LoginForm = ({ onSwitch, onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    try {
      const preEmail = sessionStorage.getItem('preRegEmail')
      if (preEmail) setEmail(preEmail)
    } catch (e) {}
  }, [])

  const validate = () => {
    const newErrors = {};
    if (!email) newErrors.email = 'Email is required';
    if (!password || password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      (async () => {
        try {
          const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });
          const data = await res.json();
          if (!res.ok) {
            setErrors(prev => ({ ...prev, submit: data.error || 'Login failed' }));
            return;
          }
          if (data.token) localStorage.setItem('authToken', data.token);
          if (data.id) {
            const userObj = { id: data.id };
            if (data.email) userObj.email = data.email;
            if (data.name) userObj.name = data.name;
            if (data.username) userObj.username = data.username;

            // try to populate name from sessionStorage (pre-registered) if missing
            if (!userObj.name) {
              const preName = sessionStorage.getItem('preRegName')
              if (preName) {
                userObj.name = preName
                try { sessionStorage.removeItem('preRegName'); sessionStorage.removeItem('preRegEmail') } catch (e) {}
              }
            }

            // if still missing name, call /me with token to fetch authoritative user data from DB
            if (!userObj.name && data.token) {
              try {
                const meRes = await fetch(`${API_URL}/me`, {
                  headers: { 'Authorization': `Bearer ${data.token}` }
                })
                if (meRes.ok) {
                  const meData = await meRes.json()
                  if (meData.name) userObj.name = meData.name
                }
              } catch (e) {}
            }

            // fallback to local-part of email as username
            if (!userObj.name && !userObj.username && email) {
              userObj.username = email.includes('@') ? email.split('@')[0] : email
            }

            try { localStorage.setItem('authUser', JSON.stringify(userObj)) } catch (e) {}
            onLogin(userObj);
          } else {
            onLogin(undefined);
          }
        } catch (err) {
          setErrors(prev => ({ ...prev, submit: 'Network error' }));
        }
      })();
    }
  };

  return (
    <div className="form-container">
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <input
            type="email"
            placeholder="Email / Username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {errors.email && <span className="error">{errors.email}</span>}
        </div>
        <div className="input-group">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {errors.password && <span className="error">{errors.password}</span>}
        </div>
        <button type="submit" className="submit-btn">Login</button>
        {errors.submit && <span className="error">{errors.submit}</span>}
      </form>
      
    </div>
  );
};

export default LoginForm;
