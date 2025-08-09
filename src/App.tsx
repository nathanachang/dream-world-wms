import React, { useState, useEffect } from 'react';
import { Amplify, Auth } from 'aws-amplify';
import WMSInterface from './components/WMSInterface';
import LoginPage from './components/LoginPage';

// --- START: AWS Amplify Configuration ---
Amplify.configure({
  Auth: {
    region: 'us-east-1',
    userPoolId: 'us-east-1_yNYSZwwOb',
    userPoolWebClientId: '6ocitqn0f4plno0a998fv3shs4',
  },
});
// --- END: AWS Amplify Configuration ---

const App = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isAuthenticating, setIsAuthenticating] = useState(true);

    useEffect(() => {
        const checkSession = async () => {
            try {
                await Auth.currentSession();
                setIsAuthenticated(true);
            } catch (e) {
                // No user session found
            }
            setIsAuthenticating(false);
        };
        checkSession();
    }, []);

    const handleLogin = () => setIsAuthenticated(true);
    const handleLogout = async () => {
        try {
            await Auth.signOut();
            setIsAuthenticated(false);
        } catch (error) {
            console.error('Error signing out: ', error);
        }
    };

    if (isAuthenticating) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    return (
        <div>
            {isAuthenticated ? <WMSInterface onLogout={handleLogout} /> : <LoginPage onLogin={handleLogin} />}
        </div>
    );
};

export default App;
