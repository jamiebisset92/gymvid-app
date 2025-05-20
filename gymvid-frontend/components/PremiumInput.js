import React, { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { 
  View, 
  TextInput, 
  StyleSheet, 
  Animated, 
  TouchableWithoutFeedback
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { animateInputFocus } from '../utils/animationUtils';
import colors from '../config/colors';

const PremiumInput = forwardRef(({
  icon,
  placeholder,
  secureTextEntry = false,
  value,
  onChangeText,
  keyboardType = 'default',
  autoCapitalize = 'none',
  error = '',
  onSubmitEditing,
  returnKeyType,
  autoFocus = false,
  style,
  inputStyle,
  onFocus: externalOnFocus,
  onBlur: externalOnBlur,
  preventAnimation = false,
  ...props
}, ref) => {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const inputScale = useRef(new Animated.Value(1)).current;
  const inputRef = useRef(null);
  
  // Forward the ref to access the TextInput methods
  useImperativeHandle(ref, () => ({
    focus: () => {
      setFocused(true);
      inputRef.current?.focus();
    },
    blur: () => {
      setFocused(false);
      inputRef.current?.blur();
    },
    clear: () => inputRef.current?.clear(),
    isFocused: () => inputRef.current?.isFocused(),
  }));
  
  const handleFocus = () => {
    setFocused(true);
    if (!preventAnimation) {
      animateInputFocus(inputScale, true);
    } else {
      inputScale.setValue(1.02);
    }
    if (externalOnFocus) externalOnFocus();
  };
  
  const handleBlur = () => {
    setFocused(false);
    if (!preventAnimation) {
      animateInputFocus(inputScale, false);
    } else {
      inputScale.setValue(1);
    }
    if (externalOnBlur) externalOnBlur();
  };
  
  const handleContainerPress = () => {
    inputRef.current?.focus();
  };
  
  return (
    <TouchableWithoutFeedback onPress={handleContainerPress}>
      <Animated.View 
        style={[
          styles.container,
          focused && styles.containerFocused,
          error ? styles.containerError : null,
          {
            transform: [{ scale: inputScale }],
          },
          style,
        ]}
      >
        {icon && (
          <Ionicons 
            name={icon} 
            size={20} 
            color={focused ? colors.primary : colors.gray} 
            style={styles.icon} 
          />
        )}
        
        <TextInput
          ref={inputRef}
          style={[styles.input, inputStyle]}
          placeholder={placeholder}
          placeholderTextColor={colors.gray}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType}
          autoFocus={autoFocus}
          selectionColor={colors.primary}
          {...props}
        />
        
        {secureTextEntry && (
          <TouchableWithoutFeedback onPress={() => setShowPassword(!showPassword)}>
            <View style={styles.passwordToggle}>
              <Ionicons 
                name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
                size={20} 
                color={colors.gray}
              />
            </View>
          </TouchableWithoutFeedback>
        )}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    height: 56,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.lightGray,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    position: 'relative',
    marginVertical: 6, // Consistent vertical spacing
  },
  containerFocused: {
    borderColor: colors.primary,
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  containerError: {
    borderColor: '#FF3B30',
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.darkGray,
    height: '100%',
    paddingVertical: 0,
  },
  passwordToggle: {
    padding: 8,
    marginRight: -8,
  },
});

// Add display name for easier debugging
PremiumInput.displayName = 'PremiumInput';

export default PremiumInput; 