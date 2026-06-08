import React, { useState } from 'react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import './AuthPage.css';

const AuthPage = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);

  const toggleMode = () => {
    setIsLogin(!isLogin);
  };

  return (
    <div className={`auth-container ${!isLogin ? 'active' : ''}`}>
      <div className="panel-left">
        {isLogin ? (
          <div className="welcome-panel">
            <h1>Hello, Welcome!</h1>
            <p>Sign in to access your StockKu dashboard and manage your inventory.</p>
            <button className="switch-btn" onClick={toggleMode}>Register</button>
          </div>
        ) : (
          <div className="welcome-panel">
            <h1>Create Account</h1>
            <p>Join StockKu to start managing your inventory efficiently.</p>
            <button className="switch-btn" onClick={toggleMode}>Sign In</button>
          </div>
        )}
      </div>
      <div className="panel-right">
        {isLogin ? (
          <LoginForm onSwitch={toggleMode} onLogin={onLogin} />
        ) : (
          <RegisterForm onSwitch={toggleMode} onLogin={onLogin} />
        )}
      </div>
    </div>
  );
};

export default AuthPage;