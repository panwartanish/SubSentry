import React, { useState, useEffect, FormEvent } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { projectId, publicAnonKey } from './utils/supabase/info.tsx';
import { createClient } from './utils/supabase/client.tsx';
import './App.css';

// API Configuration
const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-b0eb9ae0`;

// Initialize Supabase client
const supabase = createClient();

interface User {
  name: string;
  email: string;
  preferredCurrency: string;
}

interface Subscription {
  id: string;
  name: string;
  cost: number;
  renewalDate: string;
  category: string;
  currency: string;
}

interface Category {
  name: string;
  color: string;
  icon: string;
}

interface Currency {
  code: string;
  symbol: string;
  rate: number; // Rate to USD
}

const CATEGORIES: Category[] = [
  { name: 'Entertainment', color: '#EF4444', icon: '🎬' },
  { name: 'Productivity', color: '#3B82F6', icon: '💼' },
  { name: 'Health', color: '#10B981', icon: '❤️' },
  { name: 'Education', color: '#8B5CF6', icon: '📚' },
  { name: 'Utilities', color: '#F59E0B', icon: '⚡' },
  { name: 'Other', color: '#6B7280', icon: '📦' }
];

const CURRENCIES: Currency[] = [
  { code: 'USD', symbol: '$', rate: 1 },
  { code: 'EUR', symbol: '€', rate: 0.92 },
  { code: 'GBP', symbol: '£', rate: 0.79 },
  { code: 'JPY', symbol: '¥', rate: 149.50 },
  { code: 'CAD', symbol: 'C$', rate: 1.36 },
  { code: 'AUD', symbol: 'A$', rate: 1.53 },
  { code: 'INR', symbol: '₹', rate: 83.12 }
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [accessToken, setAccessToken] = useState<string>('');
  
  // Auth form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authError, setAuthError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState('');
  
  // Add subscription form state
  const [subName, setSubName] = useState('');
  const [subCost, setSubCost] = useState('');
  const [subRenewalDate, setSubRenewalDate] = useState('');
  const [subCategory, setSubCategory] = useState('Entertainment');
  const [subCurrency, setSubCurrency] = useState('USD');
  
  // Filter and view state
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeView, setActiveView] = useState<'dashboard' | 'analytics'>('dashboard');
  const [renewalAlerts, setRenewalAlerts] = useState<Subscription[]>([]);
  const [showAlerts, setShowAlerts] = useState(true);
  
  // Loading and connection state
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  // Check backend connection and restore session
  useEffect(() => {
    const checkConnectionAndLoadData = async () => {
      setIsLoading(true);
      
      // Check backend connection
      try {
        const healthResponse = await fetch(`${API_BASE_URL}/health`, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        });
        
        if (healthResponse.ok) {
          setIsConnected(true);
        }
      } catch (error) {
        console.error('Backend connection error:', error);
        setIsConnected(false);
      }
      
      // Try to restore existing session
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.access_token) {
          // Verify session with backend
          const verifyResponse = await fetch(`${API_BASE_URL}/auth/verify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`
            },
            body: JSON.stringify({ access_token: session.access_token })
          });
          
          if (verifyResponse.ok) {
            const { user: userData } = await verifyResponse.json();
            setUser(userData);
            setAccessToken(session.access_token);
            
            // Fetch subscriptions
            const subsResponse = await fetch(`${API_BASE_URL}/subscriptions/${userData.email}`, {
              headers: {
                'Authorization': `Bearer ${publicAnonKey}`
              }
            });
            
            if (subsResponse.ok) {
              const { subscriptions: subsData } = await subsResponse.json();
              setSubscriptions(subsData || []);
            }
          }
        }
      } catch (error) {
        console.error('Error restoring session:', error);
      }
      
      setIsLoading(false);
    };
    
    checkConnectionAndLoadData();
  }, []);

  // Check for renewal alerts
  useEffect(() => {
    if (subscriptions.length > 0) {
      const today = new Date();
      const alerts = subscriptions.filter(sub => {
        const renewalDate = new Date(sub.renewalDate);
        const daysUntilRenewal = Math.ceil((renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilRenewal >= 0 && daysUntilRenewal <= 7;
      });
      setRenewalAlerts(alerts);
    }
  }, [subscriptions]);

  // Currency conversion
  const convertCurrency = (amount: number, fromCurrency: string, toCurrency: string): number => {
    const fromRate = CURRENCIES.find(c => c.code === fromCurrency)?.rate || 1;
    const toRate = CURRENCIES.find(c => c.code === toCurrency)?.rate || 1;
    const usdAmount = amount / fromRate;
    return usdAmount * toRate;
  };

  // Handle login
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthLoading(true);
    
    if (loginEmail && loginPassword) {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            email: loginEmail,
            password: loginPassword
          })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          setUser(data.user);
          setAccessToken(data.access_token);
          
          // Fetch user's subscriptions
          const subsResponse = await fetch(`${API_BASE_URL}/subscriptions/${loginEmail}`, {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`
            }
          });
          
          if (subsResponse.ok) {
            const { subscriptions: subsData } = await subsResponse.json();
            setSubscriptions(subsData || []);
          }
          
          // Clear form
          setLoginEmail('');
          setLoginPassword('');
        } else {
          setAuthError(data.error || 'Login failed. Please check your credentials.');
          setIsAuthLoading(false);
        }
      } catch (error) {
        console.error('Error during login:', error);
        setAuthError('Connection error. Please check your internet connection.');
        setIsAuthLoading(false);
      }
    } else {
      setIsAuthLoading(false);
    }
  };
  
  // Handle signup
  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthLoading(true);
    
    if (signupName && signupEmail && signupPassword) {
      if (signupPassword.length < 6) {
        setAuthError('Password must be at least 6 characters long');
        setIsAuthLoading(false);
        return;
      }
      
      try {
        const response = await fetch(`${API_BASE_URL}/auth/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            name: signupName,
            email: signupEmail,
            password: signupPassword
          })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          // Auto-login after signup
          const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`
            },
            body: JSON.stringify({
              email: signupEmail,
              password: signupPassword
            })
          });
          
          const loginData = await loginResponse.json();
          
          if (loginResponse.ok) {
            setUser(loginData.user);
            setAccessToken(loginData.access_token);
            setSubscriptions([]);
            
            // Clear form
            setSignupName('');
            setSignupEmail('');
            setSignupPassword('');
          }
        } else {
          setAuthError(data.error || 'Signup failed. Please try again.');
        }
      } catch (error) {
        console.error('Error during signup:', error);
        setAuthError('Connection error. Please check your internet connection.');
      }
    }
    
    setIsAuthLoading(false);
  };
  
  // Handle Google Sign-In
  const handleGoogleSignIn = async () => {
    try {
      setAuthError('');
      setIsAuthLoading(true);
      
      // Sign in with Google using Supabase Auth
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google'
      });
      
      if (error) {
        console.error('Google sign-in error:', error);
        setAuthError(`Google sign-in failed: ${error.message}`);
        setIsAuthLoading(false);
      }
      // If successful, user will be redirected to Google and back
    } catch (error) {
      console.error('Error during Google sign-in:', error);
      setAuthError('Failed to initiate Google sign-in. Please try again.');
      setIsAuthLoading(false);
    }
  };
  
  // Listen for auth state changes (for OAuth redirect)
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        try {
          // Send access token to backend
          const response = await fetch(`${API_BASE_URL}/auth/google`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`
            },
            body: JSON.stringify({ access_token: session.access_token })
          });
          
          if (response.ok) {
            const { user: userData } = await response.json();
            setUser(userData);
            setAccessToken(session.access_token);
            
            // Fetch subscriptions
            const subsResponse = await fetch(`${API_BASE_URL}/subscriptions/${userData.email}`, {
              headers: {
                'Authorization': `Bearer ${publicAnonKey}`
              }
            });
            
            if (subsResponse.ok) {
              const { subscriptions: subsData } = await subsResponse.json();
              setSubscriptions(subsData || []);
            }
          }
        } catch (error) {
          console.error('Error handling OAuth callback:', error);
        }
      }
    });
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Handle logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSubscriptions([]);
    setAccessToken('');
    setLoginEmail('');
    setLoginPassword('');
    setSignupName('');
    setSignupEmail('');
    setSignupPassword('');
  };

  // Handle password reset request
  const handlePasswordReset = async (e: FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess(false);
    
    if (!resetEmail) {
      setResetError('Please enter your email address');
      return;
    }
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: window.location.origin,
      });
      
      if (error) {
        setResetError('Failed to send reset email. Please try again.');
        console.error('Password reset error:', error);
      } else {
        setResetSuccess(true);
        setResetEmail('');
      }
    } catch (error) {
      console.error('Password reset error:', error);
      setResetError('An error occurred. Please try again.');
    }
  };

  // Handle add subscription
  const handleAddSubscription = async (e: FormEvent) => {
    e.preventDefault();
    
    if (subName && subCost && subRenewalDate && user) {
      try {
        const response = await fetch(`${API_BASE_URL}/subscriptions/${user.email}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            name: subName,
            cost: parseFloat(subCost),
            renewalDate: subRenewalDate,
            category: subCategory,
            currency: subCurrency
          })
        });
        
        if (response.ok) {
          const { subscriptions: updatedSubscriptions } = await response.json();
          setSubscriptions(updatedSubscriptions);
          
          // Reset form
          setSubName('');
          setSubCost('');
          setSubRenewalDate('');
          setSubCategory('Entertainment');
          setSubCurrency('USD');
        } else {
          console.error('Failed to add subscription');
          alert('Failed to add subscription. Please try again.');
        }
      } catch (error) {
        console.error('Error adding subscription:', error);
        alert('Connection error. Please check your internet connection.');
      }
    }
  };

  // Handle delete subscription
  const handleDeleteSubscription = async (id: string) => {
    if (!user) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/subscriptions/${user.email}/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });
      
      if (response.ok) {
        const { subscriptions: updatedSubscriptions } = await response.json();
        setSubscriptions(updatedSubscriptions);
      } else {
        console.error('Failed to delete subscription');
        alert('Failed to delete subscription. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting subscription:', error);
      alert('Connection error. Please check your internet connection.');
    }
  };

  // Export to CSV
  const exportToCSV = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/export/${user.email}?format=csv`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });
      
      if (response.ok) {
        const csvContent = await response.text();
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `subscriptions-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        console.error('Failed to export CSV');
        alert('Failed to export data. Please try again.');
      }
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Connection error. Please check your internet connection.');
    }
  };

  // Export to PDF (simple text-based PDF)
  const exportToPDF = () => {
    const preferredCurrency = user?.preferredCurrency || 'USD';
    const currencySymbol = CURRENCIES.find(c => c.code === preferredCurrency)?.symbol || '$';
    
    let pdfContent = `SUBSENTRY - SUBSCRIPTION REPORT\n`;
    pdfContent += `Generated: ${new Date().toLocaleDateString()}\n`;
    pdfContent += `User: ${user?.name}\n\n`;
    pdfContent += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    CATEGORIES.forEach(category => {
      const categorySubs = subscriptions.filter(s => s.category === category.name);
      if (categorySubs.length > 0) {
        pdfContent += `${category.icon} ${category.name.toUpperCase()}\n`;
        pdfContent += `${'─'.repeat(40)}\n`;
        categorySubs.forEach(sub => {
          const convertedCost = convertCurrency(sub.cost, sub.currency, preferredCurrency);
          pdfContent += `  • ${sub.name}\n`;
          pdfContent += `    ${currencySymbol}${convertedCost.toFixed(2)}/mo - Renews: ${new Date(sub.renewalDate).toLocaleDateString()}\n\n`;
        });
      }
    });
    
    const totalCost = subscriptions.reduce((total, sub) => {
      return total + convertCurrency(sub.cost, sub.currency, preferredCurrency);
    }, 0);
    
    pdfContent += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    pdfContent += `TOTAL MONTHLY COST: ${currencySymbol}${totalCost.toFixed(2)}\n`;
    pdfContent += `TOTAL SUBSCRIPTIONS: ${subscriptions.length}\n`;
    
    const blob = new Blob([pdfContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscription-report-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
  };

  // Get filtered subscriptions
  const filteredSubscriptions = selectedCategory === 'All'
    ? subscriptions
    : subscriptions.filter(sub => sub.category === selectedCategory);

  // Calculate total monthly cost in preferred currency
  const totalMonthlyCost = subscriptions.reduce((total, sub) => {
    const convertedCost = convertCurrency(sub.cost, sub.currency, user?.preferredCurrency || 'USD');
    return total + convertedCost;
  }, 0);

  // Analytics data
  const getCategoryData = () => {
    const categoryTotals: { [key: string]: number } = {};
    const preferredCurrency = user?.preferredCurrency || 'USD';
    
    subscriptions.forEach(sub => {
      const convertedCost = convertCurrency(sub.cost, sub.currency, preferredCurrency);
      categoryTotals[sub.category] = (categoryTotals[sub.category] || 0) + convertedCost;
    });
    
    return CATEGORIES.map(cat => ({
      name: cat.name,
      value: categoryTotals[cat.name] || 0,
      color: cat.color
    })).filter(item => item.value > 0);
  };

  // Monthly trend data (simulated with current month and projections)
  const getMonthlyTrendData = () => {
    const currentDate = new Date();
    const months = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate);
      date.setMonth(date.getMonth() - i);
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      
      // Simulate variation (in real app, this would be historical data)
      const variation = 0.85 + (Math.random() * 0.3);
      const cost = totalMonthlyCost * variation;
      
      months.push({
        month: monthName,
        cost: parseFloat(cost.toFixed(2))
      });
    }
    
    return months;
  };

  // Year-over-year comparison (simulated)
  const getYearOverYearData = () => {
    const currentYear = new Date().getFullYear();
    return [
      { year: (currentYear - 1).toString(), cost: totalMonthlyCost * 0.75 },
      { year: currentYear.toString(), cost: totalMonthlyCost }
    ];
  };

  const preferredCurrency = user?.preferredCurrency || 'USD';
  const currencySymbol = CURRENCIES.find(c => c.code === preferredCurrency)?.symbol || '$';

  // Loading screen
  if (isLoading) {
    return (
      <div className="app">
        <div className="loading-container">
          <div className="loading-spinner">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h2>Loading SubSentry...</h2>
          <p>Connecting to secure cloud storage</p>
        </div>
      </div>
    );
  }

  // If not logged in, show login/signup screen
  if (!user) {
    // Show forgot password modal
    if (showForgotPassword) {
      return (
        <div className="app">
          <div className="login-container">
            <div className="login-card">
              <div className="logo-section">
                <div className="logo-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                    <path d="M2 17l10 5 10-5"/>
                    <path d="M2 12l10 5 10-5"/>
                  </svg>
                </div>
                <h1 className="app-title">Reset Password</h1>
                <p className="app-tagline">Enter your email to receive a reset link</p>
              </div>
              
              {resetError && (
                <div className="auth-error">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <span>{resetError}</span>
                </div>
              )}
              
              {resetSuccess && (
                <div className="auth-success">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  <span>Password reset email sent! Check your inbox.</span>
                </div>
              )}
              
              <form onSubmit={handlePasswordReset} className="login-form">
                <div className="form-group">
                  <label htmlFor="reset-email">Email Address</label>
                  <input
                    id="reset-email"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={resetSuccess}
                >
                  Send Reset Link
                </button>
                
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetEmail('');
                    setResetError('');
                    setResetSuccess(false);
                  }}
                >
                  Back to Login
                </button>
              </form>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="app">
        <div className="login-container">
          <div className="login-card">
            <div className="logo-section">
              <div className="logo-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <h1 className="app-title">SubSentry</h1>
              <p className="app-tagline">Your subscription guardian</p>
            </div>
            
            {/* Auth Mode Toggle */}
            <div className="auth-toggle">
              <button
                className={`auth-toggle-btn ${authMode === 'login' ? 'active' : ''}`}
                onClick={() => {
                  setAuthMode('login');
                  setAuthError('');
                }}
                type="button"
              >
                Login
              </button>
              <button
                className={`auth-toggle-btn ${authMode === 'signup' ? 'active' : ''}`}
                onClick={() => {
                  setAuthMode('signup');
                  setAuthError('');
                }}
                type="button"
              >
                Sign Up
              </button>
            </div>
            
            {authError && (
              <div className="auth-error">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>{authError}</span>
              </div>
            )}
            
            <form onSubmit={authMode === 'login' ? handleLogin : handleSignup} className="login-form">
              {authMode === 'signup' && (
                <div className="form-group">
                  <label htmlFor="name">Full Name</label>
                  <input
                    id="name"
                    type="text"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    placeholder="Enter your name"
                    required
                  />
                </div>
              )}
              
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  value={authMode === 'login' ? loginEmail : signupEmail}
                  onChange={(e) => authMode === 'login' ? setLoginEmail(e.target.value) : setSignupEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={authMode === 'login' ? loginPassword : signupPassword}
                  onChange={(e) => authMode === 'login' ? setLoginPassword(e.target.value) : setSignupPassword(e.target.value)}
                  placeholder={authMode === 'signup' ? 'Min. 6 characters' : 'Enter your password'}
                  required
                  minLength={authMode === 'signup' ? 6 : undefined}
                />
              </div>
              
              {authMode === 'login' && (
                <div className="login-extras">
                  <label className="remember-me">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span>Remember me</span>
                  </label>
                  <button
                    type="button"
                    className="forgot-password-link"
                    onClick={() => setShowForgotPassword(true)}
                  >
                    Forgot Password?
                  </button>
                </div>
              )}
              
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={isAuthLoading}
              >
                {isAuthLoading ? 'Please wait...' : (authMode === 'login' ? 'Login' : 'Sign Up')}
              </button>
              
              <p className="login-hint">
                {authMode === 'login' 
                  ? 'New to SubSentry? Click Sign Up above' 
                  : 'Already have an account? Click Login above'
                }
              </p>
              
              {/* Connection Status */}
              <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
                <div className="status-dot"></div>
                <span>{isConnected ? 'Connected to Cloud' : 'Offline Mode'}</span>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard view (when logged in)
  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <div className="logo-icon-small">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <h1 className="header-title">SubSentry</h1>
          </div>
          <div className="header-actions">
            {/* Connection Status Indicator */}
            <div className={`connection-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
              <div className="indicator-dot"></div>
              <span className="indicator-text">{isConnected ? 'Cloud Sync Active' : 'Offline'}</span>
            </div>
            
            <div className="currency-selector">
              <label htmlFor="currency">Currency:</label>
              <select
                id="currency"
                value={preferredCurrency}
                onChange={async (e) => {
                  const newCurrency = e.target.value;
                  try {
                    const response = await fetch(`${API_BASE_URL}/user/${user.email}/preferences`, {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${publicAnonKey}`
                      },
                      body: JSON.stringify({ preferredCurrency: newCurrency })
                    });
                    
                    if (response.ok) {
                      const { user: updatedUser } = await response.json();
                      setUser(updatedUser);
                    }
                  } catch (error) {
                    console.error('Error updating currency:', error);
                  }
                }}
              >
                {CURRENCIES.map(curr => (
                  <option key={curr.code} value={curr.code}>
                    {curr.symbol} {curr.code}
                  </option>
                ))}
              </select>
            </div>
            <button onClick={handleLogout} className="btn btn-secondary">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="welcome-section">
          <h2 className="welcome-title">Welcome, {user.name}!</h2>
          <p className="welcome-subtitle">Track and manage your subscriptions effortlessly</p>
        </div>

        {/* Renewal Alerts */}
        {renewalAlerts.length > 0 && showAlerts && (
          <div className="alerts-section">
            <div className="alert-banner">
              <div className="alert-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div className="alert-content">
                <h3 className="alert-title">Upcoming Renewals</h3>
                <div className="alert-list">
                  {renewalAlerts.map(sub => {
                    const daysUntil = Math.ceil((new Date(sub.renewalDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    const convertedCost = convertCurrency(sub.cost, sub.currency, preferredCurrency);
                    return (
                      <div key={sub.id} className="alert-item">
                        <span className="alert-name">{sub.name}</span>
                        <span className="alert-details">
                          {currencySymbol}{convertedCost.toFixed(2)} - Renews in {daysUntil} {daysUntil === 1 ? 'day' : 'days'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <button className="alert-close" onClick={() => setShowAlerts(false)}>×</button>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="view-tabs">
          <button
            className={`tab-button ${activeView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveView('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={`tab-button ${activeView === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveView('analytics')}
          >
            Analytics
          </button>
        </div>

        {activeView === 'dashboard' ? (
          <>
            <div className="dashboard-grid">
              {/* Total Monthly Cost Card */}
              <div className="cost-card">
                <div className="cost-card-header">
                  <div className="cost-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="1" x2="12" y2="23"/>
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                    </svg>
                  </div>
                  <h3>Total Monthly Cost</h3>
                </div>
                <div className="cost-amount">
                  {currencySymbol}{totalMonthlyCost.toFixed(2)}
                </div>
                <div className="cost-footer">
                  {subscriptions.length} active {subscriptions.length === 1 ? 'subscription' : 'subscriptions'}
                </div>
              </div>

              {/* Add Subscription Form */}
              <div className="card">
                <h3 className="card-title">Add New Subscription</h3>
                <form onSubmit={handleAddSubscription} className="subscription-form">
                  <div className="form-group">
                    <label htmlFor="sub-name">Service Name</label>
                    <input
                      id="sub-name"
                      type="text"
                      value={subName}
                      onChange={(e) => setSubName(e.target.value)}
                      placeholder="e.g., Netflix, Spotify"
                      required
                    />
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="sub-category">Category</label>
                      <select
                        id="sub-category"
                        value={subCategory}
                        onChange={(e) => setSubCategory(e.target.value)}
                      >
                        {CATEGORIES.map(cat => (
                          <option key={cat.name} value={cat.name}>
                            {cat.icon} {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="sub-currency">Currency</label>
                      <select
                        id="sub-currency"
                        value={subCurrency}
                        onChange={(e) => setSubCurrency(e.target.value)}
                      >
                        {CURRENCIES.map(curr => (
                          <option key={curr.code} value={curr.code}>
                            {curr.symbol} {curr.code}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="sub-cost">Monthly Cost</label>
                      <input
                        id="sub-cost"
                        type="number"
                        step="0.01"
                        min="0"
                        value={subCost}
                        onChange={(e) => setSubCost(e.target.value)}
                        placeholder="9.99"
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="sub-renewal">Renewal Date</label>
                      <input
                        id="sub-renewal"
                        type="date"
                        value={subRenewalDate}
                        onChange={(e) => setSubRenewalDate(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  
                  <button type="submit" className="btn btn-primary btn-full">
                    Add Subscription
                  </button>
                </form>
              </div>
            </div>

            {/* Category Filters */}
            <div className="filters-section">
              <div className="filters-header">
                <h3 className="section-title">Filter by Category</h3>
                <div className="export-buttons">
                  <button onClick={exportToCSV} className="btn btn-export">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Export CSV
                  </button>
                  <button onClick={exportToPDF} className="btn btn-export">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                      <polyline points="10 9 9 9 8 9"/>
                    </svg>
                    Export Report
                  </button>
                </div>
              </div>
              <div className="category-filters">
                <button
                  className={`filter-chip ${selectedCategory === 'All' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('All')}
                >
                  All ({subscriptions.length})
                </button>
                {CATEGORIES.map(cat => {
                  const count = subscriptions.filter(s => s.category === cat.name).length;
                  if (count === 0) return null;
                  return (
                    <button
                      key={cat.name}
                      className={`filter-chip ${selectedCategory === cat.name ? 'active' : ''}`}
                      style={{ 
                        backgroundColor: selectedCategory === cat.name ? cat.color : 'transparent',
                        borderColor: cat.color,
                        color: selectedCategory === cat.name ? 'white' : cat.color
                      }}
                      onClick={() => setSelectedCategory(cat.name)}
                    >
                      {cat.icon} {cat.name} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Subscriptions List */}
            <div className="subscriptions-section">
              <h3 className="section-title">
                {selectedCategory === 'All' ? 'All Subscriptions' : `${selectedCategory} Subscriptions`}
              </h3>
              
              {filteredSubscriptions.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                  </div>
                  <p className="empty-text">No subscriptions in this category</p>
                  <p className="empty-subtext">Add your first subscription above to get started</p>
                </div>
              ) : (
                <div className="subscriptions-list">
                  {filteredSubscriptions.map((sub) => {
                    const category = CATEGORIES.find(c => c.name === sub.category);
                    const convertedCost = convertCurrency(sub.cost, sub.currency, preferredCurrency);
                    const daysUntilRenewal = Math.ceil((new Date(sub.renewalDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    const isUpcoming = daysUntilRenewal >= 0 && daysUntilRenewal <= 7;
                    
                    // Calculate urgency level and progress
                    let urgencyLevel = 'safe';
                    let urgencyColor = '#10B981';
                    let urgencyText = 'Active';
                    const totalDays = 30; // Assume 30 days cycle for progress calculation
                    const progress = daysUntilRenewal <= 0 ? 0 : Math.min(100, (daysUntilRenewal / totalDays) * 100);
                    
                    if (daysUntilRenewal < 0) {
                      urgencyLevel = 'overdue';
                      urgencyColor = '#DC2626';
                      urgencyText = 'Overdue';
                    } else if (daysUntilRenewal <= 3) {
                      urgencyLevel = 'critical';
                      urgencyColor = '#DC2626';
                      urgencyText = 'Renewing Soon';
                    } else if (daysUntilRenewal <= 7) {
                      urgencyLevel = 'warning';
                      urgencyColor = '#F59E0B';
                      urgencyText = 'Upcoming';
                    } else if (daysUntilRenewal <= 14) {
                      urgencyLevel = 'info';
                      urgencyColor = '#3B82F6';
                      urgencyText = 'Active';
                    }
                    
                    return (
                      <div key={sub.id} className={`subscription-item modern ${urgencyLevel}`}>
                        <div className="subscription-main">
                          <div className="subscription-info">
                            <div className="subscription-header">
                              <h4 className="subscription-name">{sub.name}</h4>
                              <span 
                                className="category-badge" 
                                style={{ 
                                  backgroundColor: category?.color + '20',
                                  color: category?.color,
                                  borderColor: category?.color
                                }}
                              >
                                {category?.icon} {category?.name}
                              </span>
                            </div>
                            <div className="subscription-details">
                              <div className="cost-info">
                                <span className="subscription-cost">
                                  {currencySymbol}{convertedCost.toFixed(2)}
                                  <span className="cost-period">/month</span>
                                </span>
                                {sub.currency !== preferredCurrency && (
                                  <span className="original-currency">
                                    {CURRENCIES.find(c => c.code === sub.currency)?.symbol}{sub.cost.toFixed(2)} {sub.currency}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Modern Renewal Section */}
                          <div className="renewal-section">
                            <div className="renewal-header">
                              <div className="renewal-status" style={{ backgroundColor: urgencyColor + '15', color: urgencyColor }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="10"/>
                                  <polyline points="12 6 12 12 16 14"/>
                                </svg>
                                <span>{urgencyText}</span>
                              </div>
                            </div>
                            
                            <div className="renewal-details">
                              <div className="renewal-date-info">
                                <span className="renewal-label">Next Renewal</span>
                                <span className="renewal-date">
                                  {new Date(sub.renewalDate).toLocaleDateString('en-US', { 
                                    month: 'long', 
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </span>
                                <span className="renewal-countdown" style={{ color: urgencyColor }}>
                                  {daysUntilRenewal < 0 
                                    ? `${Math.abs(daysUntilRenewal)} days overdue`
                                    : daysUntilRenewal === 0
                                    ? 'Renews today'
                                    : daysUntilRenewal === 1
                                    ? 'Renews tomorrow'
                                    : `in ${daysUntilRenewal} days`
                                  }
                                </span>
                              </div>
                              
                              {/* Progress Bar */}
                              <div className="renewal-progress">
                                <div className="progress-bar">
                                  <div 
                                    className="progress-fill" 
                                    style={{ 
                                      width: `${100 - progress}%`,
                                      backgroundColor: urgencyColor 
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="subscription-actions">
                          <button
                            onClick={() => handleDeleteSubscription(sub.id)}
                            className="btn btn-danger-modern"
                            aria-label={`Delete ${sub.name}`}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="analytics-view">
            <h2 className="analytics-title">Spending Analytics</h2>
            
            {subscriptions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 3v18h18"/>
                    <path d="M18 17V9"/>
                    <path d="M13 17V5"/>
                    <path d="M8 17v-3"/>
                  </svg>
                </div>
                <p className="empty-text">No analytics data available</p>
                <p className="empty-subtext">Add subscriptions to see your spending analytics</p>
              </div>
            ) : (
              <>
                <div className="analytics-grid">
                  {/* Category Breakdown */}
                  <div className="analytics-card">
                    <h3 className="analytics-card-title">Spending by Category</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={getCategoryData()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {getCategoryData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `${currencySymbol}${value.toFixed(2)}`} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="category-legend">
                      {getCategoryData().map(item => (
                        <div key={item.name} className="legend-item">
                          <span className="legend-color" style={{ backgroundColor: item.color }}></span>
                          <span className="legend-name">{item.name}</span>
                          <span className="legend-value">{currencySymbol}{item.value.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Monthly Trend */}
                  <div className="analytics-card">
                    <h3 className="analytics-card-title">6-Month Spending Trend</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={getMonthlyTrendData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => `${currencySymbol}${value.toFixed(2)}`} />
                        <Legend />
                        <Line type="monotone" dataKey="cost" stroke="#10B981" strokeWidth={3} name="Monthly Cost" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="analytics-grid">
                  {/* Year-over-Year Comparison */}
                  <div className="analytics-card">
                    <h3 className="analytics-card-title">Year-over-Year Comparison</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={getYearOverYearData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="year" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => `${currencySymbol}${value.toFixed(2)}`} />
                        <Legend />
                        <Bar dataKey="cost" fill="#10B981" name="Annual Spending" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Statistics Summary */}
                  <div className="analytics-card">
                    <h3 className="analytics-card-title">Statistics Summary</h3>
                    <div className="stats-grid">
                      <div className="stat-item">
                        <div className="stat-label">Total Subscriptions</div>
                        <div className="stat-value">{subscriptions.length}</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-label">Monthly Cost</div>
                        <div className="stat-value">{currencySymbol}{totalMonthlyCost.toFixed(2)}</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-label">Annual Cost</div>
                        <div className="stat-value">{currencySymbol}{(totalMonthlyCost * 12).toFixed(2)}</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-label">Most Expensive</div>
                        <div className="stat-value">
                          {subscriptions.length > 0 ? CATEGORIES.find(c => c.name === getCategoryData().sort((a, b) => b.value - a.value)[0]?.name)?.icon + ' ' + getCategoryData().sort((a, b) => b.value - a.value)[0]?.name : 'N/A'}
                        </div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-label">Average per Subscription</div>
                        <div className="stat-value">
                          {currencySymbol}{subscriptions.length > 0 ? (totalMonthlyCost / subscriptions.length).toFixed(2) : '0.00'}
                        </div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-label">Upcoming Renewals</div>
                        <div className="stat-value">{renewalAlerts.length}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      <footer className="footer">
        <p>© 2024 SubSentry. Empowering budget-conscious professionals.</p>
      </footer>
    </div>
  );
}