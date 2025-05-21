import React, { createContext, useState, useCallback } from 'react';

// Define onboarding steps for consistent progress tracking
export const ONBOARDING_SCREENS = {
  Name: 0,
  Gender: 1,
  DateOfBirth: 2,
  WeightPreference: 3,
  BodyWeight: 4,
  Country: 5,
  Username: 6,
};

export const TOTAL_ONBOARDING_STEPS = Object.keys(ONBOARDING_SCREENS).length;

// Create a context for sharing onboarding progress data
export const OnboardingContext = createContext(null);

// Provider component for onboarding progress
export const OnboardingProvider = ({ children, initialScreen = 'Login' }) => {
  // Check if we're starting directly in onboarding mode
  const startingInOnboarding = Object.keys(ONBOARDING_SCREENS).includes(initialScreen);
  
  // Get initial progress value based on starting screen
  const getInitialProgress = () => {
    // If it's a recognized onboarding screen, set appropriate progress
    if (Object.keys(ONBOARDING_SCREENS).includes(initialScreen)) {
      return ONBOARDING_SCREENS[initialScreen];
    }
    return 0; // Default to 0 for non-onboarding screens
  };
  
  // Create progress state
  const [progress, setProgress] = useState({
    current: getInitialProgress(),
    total: TOTAL_ONBOARDING_STEPS, // Total number of onboarding steps
    isOnboarding: startingInOnboarding, // Only true for onboarding screens
    currentScreen: startingInOnboarding ? initialScreen : ''
  });
  
  // Memoized updateProgress function to avoid recreating on every render
  const updateProgress = useCallback((screenName) => {
    console.log("[ONBOARDING] Updating progress for screen:", screenName);
    if (Object.keys(ONBOARDING_SCREENS).includes(screenName)) {
      setProgress(prev => {
        // Only update if the screen name has actually changed
        if (prev.currentScreen !== screenName) {
          console.log("[ONBOARDING] Progress updated to screen:", screenName, 
                    "index:", ONBOARDING_SCREENS[screenName]);
          return {
            ...prev,
            currentScreen: screenName,
            current: ONBOARDING_SCREENS[screenName],
            isOnboarding: true
          };
        }
        return prev;
      });
    }
  }, []);
  
  // Update initial progress when initial screen changes
  React.useEffect(() => {
    if (Object.keys(ONBOARDING_SCREENS).includes(initialScreen)) {
      console.log("[ONBOARDING] Setting initial progress for screen:", initialScreen);
      setProgress(prev => ({
        ...prev,
        current: ONBOARDING_SCREENS[initialScreen],
        isOnboarding: true,
        currentScreen: initialScreen
      }));
    }
  }, [initialScreen]); // Only run when initialScreen changes
  
  return (
    <OnboardingContext.Provider value={{ progress, setProgress, updateProgress }}>
      {children}
    </OnboardingContext.Provider>
  );
}; 