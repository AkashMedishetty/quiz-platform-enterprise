import React, { useState, useEffect, useRef } from 'react';
import { LandingPage } from './components/LandingPage';
import { ParticipantLogin } from './components/ParticipantLogin';
import { ParticipantQuiz } from './components/ParticipantQuiz';
import { ParticipantQuizOptimized } from './components/ParticipantQuizOptimized';
import { HostDashboard } from './components/HostDashboard';
import { HostDashboardOptimized } from './components/HostDashboardOptimized';
import { BigScreenDisplay } from './components/BigScreenDisplay';
import { BigScreenDisplayOptimized } from './components/BigScreenDisplayOptimized';
import { LiveQuizDashboard } from './components/LiveQuizDashboard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useQuizTemplates } from './hooks/useQuizTemplates';
import { supabase } from './lib/supabase';
import { v4 as uuidv4 } from 'uuid';


// Simple host authentication function
const requireHostAuth = (sessionId: string): boolean => {
  const hostAuth = sessionStorage.getItem('host_auth');
  const lastHostSession = sessionStorage.getItem('last_host_session');
  
  // If no auth or different session, require password
  if (!hostAuth || lastHostSession !== sessionId) {
    const hostPassword = prompt('🔐 HOST ACCESS REQUIRED\nEnter password to continue:');
    if (hostPassword !== 'purplehat2024') {
      alert('❌ INVALID PASSWORD\nAccess denied. Redirecting to home.');
      window.location.href = '/';
      return false;
    }
    // Save auth for this session only
    sessionStorage.setItem('host_auth', 'true');
    sessionStorage.setItem('last_host_session', sessionId);
  }
  return true;
};

type AppState = 
  | { type: 'landing' }
  | { type: 'participant-login'; directSessionId?: string }
  | { type: 'participant-quiz'; sessionId: string; participantId: string; participantName: string; participantMobile: string }
  | { type: 'host-dashboard'; sessionId: string; displayCode: string; hostId: string }
  | { type: 'live-quiz-dashboard'; hostId: string }
  | { type: 'big-screen'; accessCode: string };

// Participant session storage keys
const PARTICIPANT_SESSION_KEY = 'participant_session';
const PARTICIPANT_STATE_KEY = 'participant_state';

interface ParticipantSession {
  sessionId: string;
  participantId: string;
  participantName: string;
  participantMobile: string;
  participantInstitute: string;
  accessCode: string;
  timestamp: number;
}

function App() {
  const [appState, setAppState] = useState<AppState>({ type: 'landing' });
  const { createSessionFromTemplate, generateReadableSessionId } = useQuizTemplates('');
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Prevent app reinitialization on state changes
  const stateRef = useRef(appState);
  stateRef.current = appState;

  // Check URL for direct quiz join on app load (with stability check)
  useEffect(() => {
    if (!isInitialized || appState.type !== 'landing') return; // Wait for initialization and only on landing
    
    const urlParams = new URLSearchParams(window.location.search);
    const joinSessionId = urlParams.get('join');
    
    if (joinSessionId) {
      // Auto-open participant login with pre-filled session
      console.log('🔗 [APP] Direct join detected:', joinSessionId);
      setAppState({ type: 'participant-login', directSessionId: joinSessionId });
    }
  }, [isInitialized]); // Only depend on isInitialized, not appState.type

  // Save participant session to localStorage
  const saveParticipantSession = (session: ParticipantSession) => {
    try {
      localStorage.setItem(PARTICIPANT_SESSION_KEY, JSON.stringify(session));
      console.log('💾 [SESSION] Participant session saved:', session);
    } catch (error) {
      console.error('Failed to save participant session:', error);
    }
  };

  // Load participant session from localStorage
  const loadParticipantSession = (): ParticipantSession | null => {
    try {
      const saved = localStorage.getItem(PARTICIPANT_SESSION_KEY);
      if (saved) {
        const session = JSON.parse(saved);
        // Check if session is less than 24 hours old
        if (Date.now() - session.timestamp < 24 * 60 * 60 * 1000) {
          console.log('💾 [SESSION] Participant session loaded:', session);
          return session;
        } else {
          console.log('💾 [SESSION] Participant session expired, clearing');
          localStorage.removeItem(PARTICIPANT_SESSION_KEY);
        }
      }
    } catch (error) {
      console.error('Failed to load participant session:', error);
    }
    return null;
  };

  // Clear participant session
  const clearParticipantSession = () => {
    localStorage.removeItem(PARTICIPANT_SESSION_KEY);
    localStorage.removeItem(PARTICIPANT_STATE_KEY);
    console.log('💾 [SESSION] Participant session cleared');
  };

  // Handle client-side routing - ONLY RUN ONCE with lock
  useEffect(() => {
    const initializeApp = async () => {
      if (isInitialized) return; // Prevent multiple initializations
      
      // Additional lock to prevent double initialization
      const initLock = sessionStorage.getItem('app_initializing');
      if (initLock) return;
      
      sessionStorage.setItem('app_initializing', 'true');
      console.log('🔄 [APP] One-time initialization starting...');
    
    const path = window.location.pathname;
    const search = window.location.search;
    const hash = window.location.hash;
    
    console.log('🔍 [APP] Initializing routing - Path:', path, 'Search:', search);
    
    // Check for big screen routing first - FIXED to handle both patterns
    if (path.startsWith('/big-screen/')) {
      const accessCode = path.split('/big-screen/')[1];
      console.log('🎮 [APP] Big screen code detected from path:', accessCode);
      console.log('🎮 [APP] Full path was:', path);
      if (accessCode && accessCode.trim()) {
        console.log('✅ [APP] Setting big screen state with code:', accessCode);
        setAppState({ type: 'big-screen', accessCode });
        setIsInitialized(true);
        sessionStorage.removeItem('app_initializing');
        return;
      } else {
        console.error('❌ [APP] Big screen path found but no valid access code');
      }
    }
    
    // Check URL parameters
    const urlParams = new URLSearchParams(search);
    
    // Check for participant join with access code
    const participantCode = urlParams.get('participant');
    if (participantCode) {
      console.log('👥 [APP] Participant join code detected:', participantCode);
      setAppState({ type: 'participant-login', directSessionId: participantCode });
      setIsInitialized(true);
      sessionStorage.removeItem('app_initializing');
      return;
    }
    
    // Check for big screen access code (for ?code= pattern)
    const accessCodeParam = urlParams.get('code');
    if (accessCodeParam) {
      console.log('🎮 [APP] Big screen code detected in params:', accessCodeParam);
      setAppState({ type: 'big-screen', accessCode: accessCodeParam });
      setIsInitialized(true);
      sessionStorage.removeItem('app_initializing');
      return;
    }

    // FIXED: Check for big screen routing using display code pattern
    const displayCodeParam = urlParams.get('display');
    if (displayCodeParam) {
      console.log('🎮 [APP] Big screen display code detected:', displayCodeParam);
      setAppState({ type: 'big-screen', accessCode: displayCodeParam });
      setIsInitialized(true);
      sessionStorage.removeItem('app_initializing');
      return;
    }

    // Check for existing participant session on page load
    const savedSession = loadParticipantSession();
    if (savedSession) {
      console.log('💾 [APP] Restoring participant session:', savedSession);
      
      // Validate session data and verify participant still exists in database
      if (savedSession.sessionId && savedSession.participantId && savedSession.participantName && savedSession.participantMobile) {
        try {
          // Verify the participant still exists in the database
          const { data: participant, error } = await supabase
            .from('quiz_participants')
            .select('*')
            .eq('id', savedSession.participantId)
            .single();

          if (!error && participant) {
            console.log('✅ [APP] Participant verified, restoring session');
            // Update last_seen to show participant is active
            await supabase
              .from('quiz_participants')
              .update({ last_seen: new Date().toISOString() })
              .eq('id', savedSession.participantId);

            setAppState({
              type: 'participant-quiz',
              sessionId: savedSession.sessionId,
              participantId: savedSession.participantId,
              participantName: savedSession.participantName,
              participantMobile: savedSession.participantMobile
            });
            setIsInitialized(true);
            return;
          } else {
            console.warn('💾 [APP] Participant no longer exists in database, clearing session');
            clearParticipantSession();
          }
        } catch (dbError) {
          console.error('💾 [APP] Error verifying participant, clearing session:', dbError);
          clearParticipantSession();
        }
      } else {
        console.warn('💾 [APP] Invalid session data, clearing:', savedSession);
        clearParticipantSession();
      }
    }
    
    // Handle /host/sessionId URLs
    if (path.startsWith('/host/')) {
      const sessionId = path.split('/host/')[1];
      if (sessionId) {
        console.log('🔗 [APP] Host URL detected:', sessionId);
        // Check authentication
        const hostAuth = sessionStorage.getItem('host_authenticated');
        if (!hostAuth) {
          const hostPassword = prompt('🔐 HOST ACCESS REQUIRED\nEnter password to continue:');
          if (hostPassword !== 'purplehat2024') {
            alert('❌ INVALID PASSWORD\nRedirecting to home.');
            window.location.href = '/';
            return;
          }
          sessionStorage.setItem('host_authenticated', 'true');
        }
        
        const hostId = uuidv4();
        setAppState({ 
          type: 'host-dashboard', 
          sessionId, 
          displayCode: 'LOADING...',
          hostId 
        });
        setIsInitialized(true);
        
        // Clear initialization lock
        sessionStorage.removeItem('app_initializing');
        return;
      }
    }
    
    // Default to landing page
      console.log('🏠 [APP] Defaulting to landing page');
      setAppState({ type: 'landing' });
      setIsInitialized(true);
      
      // Clear initialization lock
      sessionStorage.removeItem('app_initializing');
    };

    initializeApp();
  }, []); // Empty dependency array - run only once
  
  // Prevent re-initialization on app state changes
  useEffect(() => {
    if (!isInitialized) return;
    console.log('🔍 [APP] State changed to:', appState.type);
    // Update URL without causing re-initialization
    if (appState.type === 'host-dashboard' && 'sessionId' in appState) {
      const newUrl = `/host/${appState.sessionId}`;
      if (window.location.pathname !== newUrl) {
        window.history.pushState({}, '', newUrl);
      }
    } else if (appState.type === 'landing') {
      if (window.location.pathname !== '/') {
        window.history.pushState({}, '', '/');
      }
    }
  }, [appState, isInitialized]);

  const handleSelectRole = (role: 'host' | 'participant') => {
    if (role === 'host') {
      // SINGLE PASSWORD CHECK - authenticate ONCE for entire host session
      const hostAuth = sessionStorage.getItem('host_authenticated');
      
      if (!hostAuth) {
        const hostPassword = prompt('🔐 HOST ACCESS REQUIRED\nEnter password to continue:');
        if (hostPassword !== 'purplehat2024') {
          alert('❌ INVALID PASSWORD\nAccess denied.');
          return;
        }
        // Save authentication for entire session
        sessionStorage.setItem('host_authenticated', 'true');
      }
      
      const hostId = uuidv4();
      setAppState({ type: 'live-quiz-dashboard', hostId });
    } else {
      // Participants get direct access - NO PASSWORD
      setAppState({ type: 'participant-login' });
    }
  };

  const handleParticipantJoin = async (name: string, sessionId: string, mobile: string, institute: string) => {
    try {
      // Check if session exists and get session info
      const { data: session, error: sessionError } = await supabase
        .from('quiz_sessions')
        .select('*')
        .eq('access_code', sessionId)
        .single();

      if (sessionError || !session) {
        throw new Error('Session not found. Please check the session code.');
      }

      // Check if participant with this name and mobile already exists
      const { data: existingParticipants, error: participantError } = await supabase
        .from('quiz_participants')
        .select('*')
        .eq('quiz_session_id', session.id)
        .eq('name', name)
        .eq('mobile', mobile)
        .eq('institute', institute);

      const existingParticipant = existingParticipants?.[0];

      let participantId: string;

      if (existingParticipant) {
        // Participant exists, use existing ID
        participantId = existingParticipant.id;
        
        // Update last_seen
        await supabase
          .from('quiz_participants')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', participantId);
      } else {
        // Check if name is already taken by someone else
        const { data: nameCheck } = await supabase
          .from('quiz_participants')
          .select('*')
          .eq('quiz_session_id', session.id)
          .eq('name', name);

        const nameTakenByOther = nameCheck?.find(p => p.mobile !== mobile);

        if (nameTakenByOther) {
          throw new Error('This name is already taken by another participant. Please choose a different name.');
        }

        // Create new participant
        const avatarColors = [
          'bg-gradient-to-r from-blue-400 to-purple-400',
          'bg-gradient-to-r from-green-400 to-blue-400',
          'bg-gradient-to-r from-purple-400 to-pink-400',
          'bg-gradient-to-r from-yellow-400 to-orange-400',
          'bg-gradient-to-r from-red-400 to-pink-400',
          'bg-gradient-to-r from-indigo-400 to-purple-400',
        ];

        const { data: newParticipant, error: createError } = await supabase
          .from('quiz_participants')
          .insert({
            quiz_session_id: session.id,
            name: name,
            mobile: mobile,
            institute: institute,
            avatar_color: avatarColors[Math.floor(Math.random() * avatarColors.length)],
          })
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        participantId = newParticipant.id;
      }

      // Save participant session for persistence
      saveParticipantSession({
        sessionId: session.id,
        participantId,
        participantName: name,
        participantMobile: mobile,
        participantInstitute: institute,
        accessCode: sessionId,
        timestamp: Date.now()
      });
      setAppState({ 
        type: 'participant-quiz', 
        sessionId: session.id, 
        participantId, 
        participantName: name,
        participantMobile: mobile
      });
    } catch (error) {
      console.error('Failed to join quiz:', error);
      throw error;
    }
  };

  const handleCreateNewQuiz = async () => {
    try {
      const hostId = uuidv4();
      const displayCode = generateReadableSessionId();
      
      // Create new quiz session
      const { data: session, error } = await supabase
        .from('quiz_sessions')
        .insert({
          title: 'New Quiz',
          description: 'Interactive quiz powered by Purplehat Events',
          host_id: hostId,
          access_code: displayCode,
          settings: {
            title: 'New Quiz',
            description: 'Interactive quiz powered by Purplehat Events',
            defaultTimeLimit: 30,
            pointsPerQuestion: 100,
            speedBonus: true,
            streakBonus: true,
            allowLateJoining: true,
            shuffleQuestions: false,
          },
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Authentication already done in handleSelectRole - NO DUPLICATE CHECK
      
      setAppState({ 
        type: 'host-dashboard', 
        sessionId: session.id, 
        displayCode,
        hostId 
      });
    } catch (error) {
      console.error('Failed to create quiz:', error);
      alert('Failed to create quiz. Please try again.');
    }
  };

  const handleSelectQuiz = (quizId: string, accessCode: string) => {
    // Authentication already done in handleSelectRole - NO DUPLICATE CHECK
    
    // Extract hostId from the quiz or generate a new one
    const hostId = uuidv4(); // In a real app, this would come from authentication
    setAppState({ 
      type: 'host-dashboard', 
      sessionId: quizId, 
      displayCode: accessCode,
      hostId 
    });
  };

  const handleCreateSessionFromTemplate = async (sessionId: string) => {
    // This would be called from template manager
    // For now, just navigate to the session
    const hostId = uuidv4();
    
    // Get the session info to get the access code
    const { data: session } = await supabase
      .from('quiz_sessions')
      .select('access_code')
      .eq('id', sessionId)
      .single();

    if (session) {
      // Authentication already done in handleSelectRole - NO DUPLICATE CHECK
      
      setAppState({ 
        type: 'host-dashboard', 
        sessionId, 
        displayCode: session.access_code,
        hostId 
      });
    }
  };

  const handleBackToHome = () => {
    // Clear participant session when going back to home
    clearParticipantSession();
    setAppState({ type: 'landing' });
  };

  const handleBackToLiveDashboard = (hostId: string) => {
    setAppState({ type: 'live-quiz-dashboard', hostId });
  };

  const handleParticipantBack = () => {
    // Clear session and go to landing
    clearParticipantSession();
    setAppState({ type: 'landing' });
  };
  return (
    <ErrorBoundary>
      {(() => {
        switch (appState.type) {
          case 'landing':
            return <LandingPage onSelectRole={handleSelectRole} />;
          
          case 'participant-login':
            return (
              <ParticipantLogin 
                onJoin={handleParticipantJoin}
                onBack={handleBackToHome}
                directSessionId={appState.directSessionId}
              />
            );
          
          case 'participant-quiz':
            return (
              <ParticipantQuizOptimized 
                sessionId={appState.sessionId}
                participantId={appState.participantId}
                participantName={appState.participantName}
                participantMobile={appState.participantMobile}
                onBack={handleParticipantBack}
              />
            );
          
          case 'host-dashboard':
            return (
              <HostDashboardOptimized 
                sessionId={appState.sessionId}
                displayCode={appState.displayCode}
                hostId={appState.hostId}
                onBack={() => handleBackToLiveDashboard(appState.hostId)}
              />
            );
          
          case 'live-quiz-dashboard':
            return (
              <LiveQuizDashboard 
                onSelectQuiz={handleSelectQuiz}
                onCreateNew={handleCreateNewQuiz}
                onBack={handleBackToHome}
              />
            );
          
          case 'big-screen':
            return (
              <BigScreenDisplayOptimized 
                accessCode={appState.accessCode}
              />
            );
          
          default:
            return <LandingPage onSelectRole={handleSelectRole} />;
        }
      })()}
    </ErrorBoundary>
  );
}

export default App;