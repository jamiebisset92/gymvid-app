import React, { createContext, useContext, useRef, useState, useEffect } from 'react';
import { Animated, View, Keyboard, Platform } from 'react-native';
import PremiumToast, { DURATIONS, TOAST_TYPES } from './PremiumToast';

// Create Context
const ToastContext = createContext(null);

// Create Provider
export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null);
  const toastQueue = useRef([]);
  const [isShowingToast, setIsShowingToast] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Listen for keyboard events
  useEffect(() => {
    const keyboardShowListener = Platform.OS === 'ios' 
      ? Keyboard.addListener('keyboardWillShow', (e) => {
          setKeyboardVisible(true);
          setKeyboardHeight(e.endCoordinates.height);
        })
      : Keyboard.addListener('keyboardDidShow', (e) => {
          setKeyboardVisible(true);
          setKeyboardHeight(e.endCoordinates.height);
        });

    const keyboardHideListener = Platform.OS === 'ios'
      ? Keyboard.addListener('keyboardWillHide', () => {
          setKeyboardVisible(false);
          setKeyboardHeight(0);
        })
      : Keyboard.addListener('keyboardDidHide', () => {
          setKeyboardVisible(false);
          setKeyboardHeight(0);
        });

    return () => {
      keyboardShowListener.remove();
      keyboardHideListener.remove();
    };
  }, []);

  // Show next toast from queue
  const showNextToast = () => {
    if (toastQueue.current.length === 0) {
      setIsShowingToast(false);
      return;
    }

    const nextToast = toastQueue.current.shift();
    setToast(nextToast);
    setIsShowingToast(true);
  };

  // Handle toast close
  const handleClose = () => {
    setToast(null);
    
    // Small delay before showing next toast
    setTimeout(() => {
      showNextToast();
    }, 300);
  };

  // Add toast to queue
  const showToast = (message, options = {}) => {
    const toastConfig = {
      message,
      type: options.type || 'INFO',
      duration: options.duration || DURATIONS.MEDIUM,
      showIcon: options.showIcon !== undefined ? options.showIcon : true,
      allowDismiss: options.allowDismiss !== undefined ? options.allowDismiss : true,
      onPress: options.onPress || null,
      position: options.position || 'bottom', // 'top', 'bottom', or 'keyboard-aware'
    };

    toastQueue.current.push(toastConfig);

    if (!isShowingToast) {
      showNextToast();
    }
  };

  // Define toast helper functions
  const toast_helpers = {
    success: (message, options = {}) => showToast(message, { ...options, type: 'SUCCESS' }),
    error: (message, options = {}) => showToast(message, { ...options, type: 'ERROR', position: 'keyboard-aware' }),
    info: (message, options = {}) => showToast(message, { ...options, type: 'INFO' }),
    warning: (message, options = {}) => showToast(message, { ...options, type: 'WARNING' }),
  };

  return (
    <ToastContext.Provider value={toast_helpers}>
      {children}
      
      {toast && (
        <PremiumToast
          {...toast}
          onClose={handleClose}
          keyboardHeight={keyboardHeight}
          keyboardVisible={keyboardVisible}
        />
      )}
    </ToastContext.Provider>
  );
};

// Create hook to use toast
export const useToast = () => {
  const context = useContext(ToastContext);
  
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  
  return context;
}; 