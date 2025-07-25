// Simple URL router for quiz application
export interface RouteParams {
  [key: string]: string;
}

export interface ParsedRoute {
  path: string;
  params: RouteParams;
  query: RouteParams;
  hash: string;
}

/**
 * Parses the current URL and extracts route information
 */
export const parseCurrentRoute = (): ParsedRoute => {
  const url = new URL(window.location.href);
  
  return {
    path: url.pathname,
    params: extractPathParams(url.pathname),
    query: Object.fromEntries(url.searchParams.entries()),
    hash: url.hash.slice(1), // Remove the # character
  };
};

/**
 * Extracts parameters from URL path
 */
export const extractPathParams = (pathname: string): RouteParams => {
  const params: RouteParams = {};
  const segments = pathname.split('/').filter(Boolean);
  
  // Handle common patterns
  if (segments[0] === 'host' && segments[1]) {
    params.sessionId = segments[1];
  }
  
  if (segments[0] === 'big-screen' && segments[1]) {
    params.accessCode = segments[1];
  }
  
  return params;
};

/**
 * Navigates to a new route
 */
export const navigateTo = (path: string, query?: RouteParams, replace: boolean = false): void => {
  const url = new URL(window.location.origin + path);
  
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  
  if (replace) {
    window.history.replaceState(null, '', url.toString());
  } else {
    window.history.pushState(null, '', url.toString());
  }
  
  // Trigger a custom event to notify components of route change
  window.dispatchEvent(new PopStateEvent('popstate'));
};

/**
 * Builds a URL with query parameters
 */
export const buildUrl = (path: string, query?: RouteParams, hash?: string): string => {
  const url = new URL(window.location.origin + path);
  
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  
  if (hash) {
    url.hash = hash;
  }
  
  return url.toString();
};

/**
 * Gets a query parameter value
 */
export const getQueryParam = (key: string): string | null => {
  const url = new URL(window.location.href);
  return url.searchParams.get(key);
};

/**
 * Sets a query parameter
 */
export const setQueryParam = (key: string, value: string, replace: boolean = false): void => {
  const url = new URL(window.location.href);
  url.searchParams.set(key, value);
  
  if (replace) {
    window.history.replaceState(null, '', url.toString());
  } else {
    window.history.pushState(null, '', url.toString());
  }
};

/**
 * Removes a query parameter
 */
export const removeQueryParam = (key: string, replace: boolean = false): void => {
  const url = new URL(window.location.href);
  url.searchParams.delete(key);
  
  if (replace) {
    window.history.replaceState(null, '', url.toString());
  } else {
    window.history.pushState(null, '', url.toString());
  }
};

/**
 * Checks if current route matches a pattern
 */
export const matchesRoute = (pattern: string): boolean => {
  const currentPath = window.location.pathname;
  
  // Simple pattern matching (supports wildcards)
  const regexPattern = pattern
    .replace(/\*/g, '.*')
    .replace(/:\w+/g, '[^/]+'); // :param becomes [^/]+
  
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(currentPath);
};

/**
 * Route definitions for the application
 */
export const ROUTES = {
  HOME: '/',
  HOST: '/host/:sessionId',
  BIG_SCREEN: '/big-screen/:accessCode',
  PARTICIPANT_JOIN: '/?join=:sessionId',
  PARTICIPANT_CODE: '/?code=:accessCode',
  PARTICIPANT_DISPLAY: '/?display=:displayCode',
} as const;

/**
 * Route helpers for common navigation patterns
 */
export const RouteHelpers = {
  goHome: () => navigateTo('/'),
  
  goToHost: (sessionId: string) => navigateTo(`/host/${sessionId}`),
  
  goToBigScreen: (accessCode: string) => navigateTo(`/big-screen/${accessCode}`),
  
  goToParticipantJoin: (sessionId: string) => navigateTo('/', { join: sessionId }),
  
  goToParticipantCode: (accessCode: string) => navigateTo('/', { code: accessCode }),
  
  goToParticipantDisplay: (displayCode: string) => navigateTo('/', { display: displayCode }),
};

/**
 * Hook for listening to route changes
 */
export const useRouteChange = (callback: (route: ParsedRoute) => void): (() => void) => {
  const handleRouteChange = () => {
    callback(parseCurrentRoute());
  };
  
  window.addEventListener('popstate', handleRouteChange);
  
  return () => {
    window.removeEventListener('popstate', handleRouteChange);
  };
};

/**
 * Validates URL parameters
 */
export const validateRouteParams = (params: RouteParams): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Validate session ID format (UUID-like)
  if (params.sessionId && !/^[a-f0-9-]{36}$/i.test(params.sessionId)) {
    errors.push('Invalid session ID format');
  }
  
  // Validate access code format (alphanumeric, 4-20 chars)
  if (params.accessCode && !/^[A-Z0-9]{4,20}$/i.test(params.accessCode)) {
    errors.push('Invalid access code format');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Gets the current route type
 */
export const getCurrentRouteType = (): string => {
  const { path, query } = parseCurrentRoute();
  
  if (path.startsWith('/host/')) return 'host';
  if (path.startsWith('/big-screen/')) return 'big-screen';
  if (query.join) return 'participant-join';
  if (query.code) return 'participant-code';
  if (query.display) return 'participant-display';
  
  return 'home';
};

/**
 * Creates a shareable URL for participants
 */
export const createShareableUrl = (sessionId?: string, accessCode?: string): string => {
  if (sessionId) {
    return buildUrl('/', { join: sessionId });
  }
  if (accessCode) {
    return buildUrl('/', { code: accessCode });
  }
  return window.location.origin;
};

/**
 * Handles browser back/forward navigation
 */
export const setupNavigationHandler = (onNavigate: (route: ParsedRoute) => void): (() => void) => {
  const handlePopState = () => {
    onNavigate(parseCurrentRoute());
  };
  
  window.addEventListener('popstate', handlePopState);
  
  return () => {
    window.removeEventListener('popstate', handlePopState);
  };
}; 