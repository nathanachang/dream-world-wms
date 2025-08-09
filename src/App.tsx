import React, { useState, useEffect } from 'react';
import { Amplify } from 'aws-amplify';
import { getCurrentUser, signOut } from 'aws-amplify/auth';
import WMSInterface from './components/WMSInterface';
import LoginPage from './components/LoginPage';

// --- START: AWS Amplify Configuration ---
Amplify.configure({
    Auth: {
        Cognito: {
            userPoolId: 'us-east-1_yNYSZwwOb',
            userPoolClientId: '6ocitqn0f4plno0a998fv3shs4', 
        }        
    }
});
// --- END: AWS Amplify Configuration ---

const App = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isAuthenticating, setIsAuthenticating] = useState(true);

    useEffect(() => {
        const checkSession = async () => {
            try {
                await getCurrentUser()
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
            await signOut();
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
