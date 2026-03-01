// src/pages/Login.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const { session } = useAuth();
  const navigate = useNavigate();

  // If the user is already logged in, redirect them to the dashboard
  useEffect(() => {
    if (session) {
      navigate('/'); 
    }
  }, [session, navigate]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
        // 1. Register the user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            }
          }
        });

        if (authError) throw authError;

        // 2. Automatically assign the 'Retail' role in our profiles table
        if (authData?.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([
              { id: authData.user.id, role: 'Retail' }
            ]);
            
          if (profileError) {
            console.error('Error assigning Retail role:', profileError);
          }
          
          // Note: Later, when we migrate your entities to Supabase, 
          // we will also automatically create a "Company" record here!
        }

        setMessage("Registration successful! You can now sign in.");
        setIsSignUp(false); // Switch back to login view
        setPassword(''); // Clear password
      } else {
        // Handle standard login
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg border border-slate-100">
        <h1 className="mb-2 text-2xl font-bold text-center text-slate-800">
          Tricore Medical Supply
        </h1>
        <p className="mb-6 text-sm text-center text-slate-500">
          {isSignUp ? 'Create your retail account' : 'Sign in to your account'}
        </p>
        
        {error && (
          <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-600 border border-red-200">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 rounded bg-green-50 p-3 text-sm text-green-700 border border-green-200">
            {message}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {/* Only show Full Name field if we are signing up */}
          {isSignUp && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required={isSignUp}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isLoading 
              ? (isSignUp ? 'Creating account...' : 'Signing in...') 
              : (isSignUp ? 'Sign Up' : 'Sign In')}
          </button>
        </form>

        {/* Toggle between Sign In and Sign Up */}
        <div className="mt-6 text-center text-sm text-slate-600">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
              setMessage(null);
            }}
            className="font-medium text-blue-600 hover:text-blue-500 focus:outline-none"
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
}