import { useState, useEffect } from 'react';
import { Keyboard, Platform } from 'react-native';

export const useKeyboardVisibility = () => {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const keyboardShowListener = Platform.OS === 'ios' 
      ? Keyboard.addListener('keyboardWillShow', (e) => {
          setIsKeyboardVisible(true);
          setKeyboardHeight(e.endCoordinates.height);
        })
      : Keyboard.addListener('keyboardDidShow', (e) => {
          setIsKeyboardVisible(true);
          setKeyboardHeight(e.endCoordinates.height);
        });

    const keyboardHideListener = Platform.OS === 'ios'
      ? Keyboard.addListener('keyboardWillHide', () => {
          setIsKeyboardVisible(false);
          setKeyboardHeight(0);
        })
      : Keyboard.addListener('keyboardDidHide', () => {
          setIsKeyboardVisible(false);
          setKeyboardHeight(0);
        });

    return () => {
      keyboardShowListener.remove();
      keyboardHideListener.remove();
    };
  }, []);

  return { isKeyboardVisible, keyboardHeight };
}; 