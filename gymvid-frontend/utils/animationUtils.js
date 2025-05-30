import { Animated, Easing, Dimensions } from 'react-native';

// Standard animation timings and easing curves
export const ANIMATION_CONFIG = {
  fade: {
    duration: 400,
    easing: Easing.bezier(0.2, 0.65, 0.4, 0.9),
  },
  slide: {
    duration: 350,
    easing: Easing.bezier(0.17, 0.67, 0.34, 0.99),
  },
  spring: {
    tension: 50,
    friction: 7,
    useNativeDriver: true,
  },
  micro: {
    duration: 150,
    easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
  },
  button: {
    pressDown: {
      duration: 100,
      scale: 0.97,
      opacity: 0.85,
    },
    pressUp: {
      duration: 120,
    },
  },
  // New optimized screen transitions
  screenTransition: {
    fadeOut: {
      duration: 120,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
    },
    fadeIn: {
      duration: 200,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
      delay: 100, // Add delay to ensure previous screen is gone
    }
  }
};

// Create standard initial animation values
export const createAnimationValues = () => {
  return {
    fadeAnim: new Animated.Value(0),
    slideAnim: new Animated.Value(30),
    logoAnim: new Animated.Value(0.9),
    formOpacity: new Animated.Value(0),
    socialOpacity: new Animated.Value(0),
    footerOpacity: new Animated.Value(0),
  };
};

// Standard entrance animations sequence
export const runEntranceAnimations = (animations, callback) => {
  const {
    fadeAnim,
    slideAnim,
    logoAnim,
    formOpacity,
    socialOpacity,
    footerOpacity,
  } = animations;

  const sequence = Animated.stagger(80, [
    // Fade in the entire view first
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: ANIMATION_CONFIG.fade.duration,
      easing: ANIMATION_CONFIG.fade.easing,
      useNativeDriver: true,
    }),
    
    // Animate logo
    Animated.spring(logoAnim, {
      toValue: 1,
      ...ANIMATION_CONFIG.spring,
    }),
    
    // Slide in content from bottom
    Animated.spring(slideAnim, {
      toValue: 0,
      ...ANIMATION_CONFIG.spring,
    }),
    
    // Fade in form
    Animated.timing(formOpacity, {
      toValue: 1,
      duration: ANIMATION_CONFIG.fade.duration - 100,
      easing: ANIMATION_CONFIG.fade.easing,
      useNativeDriver: true,
    }),
    
    // Fade in social buttons
    Animated.timing(socialOpacity, {
      toValue: 1,
      duration: ANIMATION_CONFIG.fade.duration - 100, 
      easing: ANIMATION_CONFIG.fade.easing,
      useNativeDriver: true,
    }),
    
    // Fade in footer
    Animated.timing(footerOpacity, {
      toValue: 1,
      duration: ANIMATION_CONFIG.fade.duration - 100,
      easing: ANIMATION_CONFIG.fade.easing,
      useNativeDriver: true,
    }),
  ]);
  
  sequence.start(callback);
  
  return sequence;
};

// Reset animation values to initial state
export const resetAnimations = (animations) => {
  const {
    fadeAnim,
    slideAnim,
    logoAnim,
    formOpacity,
    socialOpacity,
    footerOpacity,
  } = animations;
  
  fadeAnim.setValue(0);
  slideAnim.setValue(30);
  logoAnim.setValue(0.9);
  formOpacity.setValue(0);
  socialOpacity?.setValue(0);
  footerOpacity?.setValue(0);
};

// Exit animations - direction can be 'left', 'right', or 'down'
export const runExitAnimations = (animations, direction = 'left', callback) => {
  const { fadeAnim, slideAnim } = animations;
  
  let slideValue = -30; // default is left
  if (direction === 'right') slideValue = 30;
  if (direction === 'down') slideValue = 50;
  
  Animated.parallel([
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: ANIMATION_CONFIG.screenTransition.fadeOut.duration,
      easing: ANIMATION_CONFIG.screenTransition.fadeOut.easing,
      useNativeDriver: true,
    }),
    Animated.timing(slideAnim, {
      toValue: slideValue,
      duration: ANIMATION_CONFIG.slide.duration,
      easing: ANIMATION_CONFIG.slide.easing,
      useNativeDriver: true,
    }),
  ]).start(callback);
};

// Micro-interactions for buttons and inputs
export const animateButtonPress = (scaleAnim, opacityAnim, isDown) => {
  // Cancel any ongoing animations first
  scaleAnim.stopAnimation();
  opacityAnim.stopAnimation();
  
  // Use separate animations instead of parallel for better handling
  Animated.timing(scaleAnim, {
    toValue: isDown ? ANIMATION_CONFIG.button.pressDown.scale : 1,
    duration: isDown ? 
      ANIMATION_CONFIG.button.pressDown.duration : 
      ANIMATION_CONFIG.button.pressUp.duration,
    easing: ANIMATION_CONFIG.micro.easing,
    useNativeDriver: true,
  }).start();
  
  Animated.timing(opacityAnim, {
    toValue: isDown ? ANIMATION_CONFIG.button.pressDown.opacity : 1,
    duration: isDown ? 
      ANIMATION_CONFIG.button.pressDown.duration : 
      ANIMATION_CONFIG.button.pressUp.duration,
    easing: ANIMATION_CONFIG.micro.easing,
    useNativeDriver: true,
  }).start();
};

// Animate input focus
export const animateInputFocus = (scaleAnim, focused) => {
  Animated.spring(scaleAnim, {
    toValue: focused ? 1.02 : 1,
    friction: 4,
    tension: 40,
    useNativeDriver: true,
  }).start();
};

// Subtle gradient background for auth screens
export const GRADIENT_COLORS = {
  white: '#FFFFFF',
  lightBlue: '#F8FAFF'
};

// Status bar styling
export const STATUS_BAR_STYLE = {
  barStyle: 'dark-content',
  backgroundColor: '#FFFFFF',
  translucent: true,
};

// Screen transition specs for navigation
export const SCREEN_TRANSITION_SPECS = {
  open: {
    animation: 'timing',
    config: {
      duration: 280,
      easing: Easing.bezier(0.42, 0.0, 0.58, 1.0), // Improved easing curve
    },
  },
  close: {
    animation: 'timing',
    config: {
      duration: 230,
      easing: Easing.bezier(0.42, 0.0, 0.58, 1.0), // Improved easing curve
    },
  },
  // Add specific back transition specs for better backward navigation
  back: {
    animation: 'timing',
    config: {
      duration: 250,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1.0), // Smoother curve for back navigation
    },
  },
};

// Toast notification styling
export const TOAST_STYLES = {
  success: {
    backgroundColor: '#4CD964',
    textColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  error: {
    backgroundColor: '#FF3B30',
    textColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  info: {
    backgroundColor: '#007AFF',
    textColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  }
};

// Safer alternative to Animated.multiply
export const configureAnimations = (animations) => {
  // Take all animated values and register clean listeners
  const { fadeAnim, slideAnim } = animations;
  
  // Create derived value for bottom container animations
  const bottomSlideAnim = new Animated.Value(0);
  
  // Set up a clean listener
  const slideAnimListener = slideAnim.addListener(({ value }) => {
    bottomSlideAnim.setValue(value * 0.3);
  });
  
  // Return the derived animations and cleanup function
  return {
    derivedAnimations: {
      bottomSlideAnim
    },
    cleanup: () => {
      slideAnim.removeListener(slideAnimListener);
    }
  };
};

// Optimized entrance animation sequence - premium app feel with proper timing
export const runWorldClassEntranceAnimation = ({ 
  fadeAnim, 
  titleAnim = null, 
  slideAnim = null, 
  elementsAnim = [], 
  onComplete = null 
}) => {
  // Reset all animations first to prevent any double bouncing
  fadeAnim.setValue(0);
  titleAnim?.setValue(0); // Start at 0 position and animate opacity instead
  slideAnim?.setValue(0); // Start at 0 position and animate opacity instead
  elementsAnim.forEach(anim => anim.setValue(0));
  
  // Staggered sequential animation approach for flawless entry
  
  // First, fade in the entire container - quick and clean
  Animated.timing(fadeAnim, {
    toValue: 1,
    duration: 250,
    delay: 10, // Minimal delay for stability
    easing: Easing.bezier(0.33, 0, 0.67, 1), // Cubic easing in/out - balanced
    useNativeDriver: true,
  }).start();
  
  // Sequence the elements with perfectly tuned timing
  setTimeout(() => {
    // Animate all content with precise timing
    
    // Title animation without vertical movement (prevents double bouncing)
    if (titleAnim) {
      Animated.timing(titleAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.bezier(0.33, 0, 0.67, 1), // Cubic easing in/out
        useNativeDriver: true,
      }).start();
    }
    
    // Content animations
    if (elementsAnim.length > 0) {
      // Stagger elements with short delays between each
      elementsAnim.forEach((anim, index) => {
        setTimeout(() => {
          Animated.timing(anim, {
            toValue: 1,
            duration: 300,
            easing: Easing.bezier(0.16, 1, 0.3, 1), // Exponential out - premium feel
            useNativeDriver: true,
          }).start(index === elementsAnim.length - 1 ? onComplete : undefined);
        }, 70 * (index + 1)); // Stagger by 70ms per element
      });
    } else if (onComplete) {
      setTimeout(onComplete, 400);
    }
  }, 100);
}; 