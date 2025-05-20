import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../config/supabase';
import { supabaseAnonKey } from '../config/supabase';
import { supabaseUrl } from '../config/supabase';

const BIOMETRIC_KEY = 'BIOMETRIC_ENABLED';
const CREDENTIALS_KEY = 'USER_CREDENTIALS';

// Create a debug logging function that only logs in development
const debugLog = (...args) => {
  if (__DEV__) {
    console.log(...args);
  }
};

export const useAuth = () => {
  const [loading, setLoading] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    checkBiometricSupport();
    loadBiometricPreference();
  }, []);

  const checkBiometricSupport = async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    setBiometricSupported(compatible);
  };

  const loadBiometricPreference = async () => {
    const enabled = await SecureStore.getItemAsync(BIOMETRIC_KEY);
    setBiometricEnabled(enabled === 'true');
  };

  const toggleBiometric = async () => {
    const newState = !biometricEnabled;
    await SecureStore.setItemAsync(BIOMETRIC_KEY, String(newState));
    setBiometricEnabled(newState);
  };

  const saveCredentials = async (email, password) => {
    if (rememberMe) {
      await SecureStore.setItemAsync(CREDENTIALS_KEY, JSON.stringify({ email, password }));
    } else {
      await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
    }
  };

  const loadSavedCredentials = async () => {
    const credentials = await SecureStore.getItemAsync(CREDENTIALS_KEY);
    return credentials ? JSON.parse(credentials) : null;
  };

  const signIn = async (email, password, useBiometric = false) => {
    try {
      setLoading(true);

      if (useBiometric && biometricEnabled) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Authenticate to sign in',
          fallbackLabel: 'Use password instead',
        });

        if (!result.success) {
          throw new Error('Biometric authentication failed');
        }

        const savedCreds = await loadSavedCredentials();
        if (savedCreds) {
          email = savedCreds.email;
          password = savedCreds.password;
        }
      }

      const { user, session, error } = await supabase.auth.signIn({
        email,
        password,
      });

      if (error) throw error;

      if (rememberMe) {
        await saveCredentials(email, password);
      }

      return { user, session, error: null };
    } catch (error) {
      return { user: null, session: null, error };
    } finally {
      setLoading(false);
    }
  };

  const signInWithProvider = async (provider) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: 'gymvid://',
        },
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email, password) => {
    if (password.length < 6) {
      return { data: null, error: 'Password must be at least 6 characters long' };
    }

    try {
      setLoading(true);
      
      // Clear any existing session
      debugLog('Signing out any existing user before signup');
      await supabase.auth.signOut();
      
      console.log('Attempting to sign up with email:', email);
      
      // Use direct signUp method with email and password only for simplicity
      const response = await supabase.auth.signUp({
        email,
        password
      });
      
      // Log entire response
      console.log('Raw signup response:', JSON.stringify(response, null, 2));
      
      // Check for errors
      if (response.error) {
        console.error('Error during signup:', response.error);
        throw response.error;
      }
      
      // In Supabase v1, the response has a direct user property
      // The structure is: { data: { user: {...}, session: {...} }, error: null }
      let userId = null;
      
      // Check if we have a direct user object in the response
      if (response.user && response.user.id) {
        userId = response.user.id;
        console.log('Found userId directly in response.user:', userId);
      }
      // Check if we have a user object in the data property
      else if (response.data && response.data.user && response.data.user.id) {
        userId = response.data.user.id;
        console.log('Found userId in response.data.user:', userId);
      }
      // Check if we have a user object nested in session
      else if (response.data && response.data.session && response.data.session.user && response.data.session.user.id) {
        userId = response.data.session.user.id;
        console.log('Found userId in response.data.session.user:', userId);
      }
      
      if (!userId) {
        console.error('Signup succeeded but no user ID could be found in response');
        
        // For debugging - stringify the entire response
        const responseStr = JSON.stringify(response);
        console.log('Full response as string:', responseStr);
        
        // Try to extract UUID from the response string as last resort
        const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
        const matches = responseStr.match(uuidRegex);
        
        if (matches && matches.length > 0) {
          userId = matches[0];
          console.log('Extracted potential UUID from response string:', userId);
        } else {
          console.log('No UUID found in response string');
          return { data: null, error: 'Unable to get user ID for onboarding' };
        }
      }
      
      // Create a proper data structure to return
      const data = {
        user: {
          id: userId,
          email: email
        }
      };
      
      // Store user record in database immediately
      try {
        console.log('Creating initial user record with id:', userId);
        const { error: dbError } = await supabase
          .from('users')
          .upsert({
            id: userId,
            email: email,
            onboarding_complete: false
          });
          
        if (dbError) {
          console.error('Error creating initial user record:', dbError);
        } else {
          console.log('Successfully created initial user record');
        }
      } catch (dbError) {
        console.error('Exception during user record creation:', dbError);
      }
      
      console.log('Signup successful, returning user with ID:', userId);
      return { data, error: null };
    } catch (error) {
      console.error('Signup error:', error);
      let errorMsg = 'An error occurred. Please try again.';
      if (error && typeof error.message === 'string') {
        errorMsg = error.message;
      } else if (typeof error === 'string') {
        errorMsg = error;
      } else if (typeof error === 'object' && error !== null) {
        errorMsg = error.message || JSON.stringify(error);
      }
      return { data: null, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'gymvid://reset-password',
      });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async (newPassword) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (profile) => {
    try {
      setLoading(true);
      debugLog('updateProfile called with:', profile);
      
      // Use the current user session to ensure proper authentication
      const session = supabase.auth.session();
      const user = session?.user;
      
      if (!user) {
        console.error('No authenticated user found in updateProfile');
        throw new Error('No authenticated user found');
      }
      
      debugLog('Current user ID:', user.id);

      // Clean any malformed data
      let cleanProfile = { ...profile };
      
      // Make sure gender is a simple string, not a complex/formatted value
      if (cleanProfile.gender && typeof cleanProfile.gender === 'string') {
        // Remove any quotes, slashes or formatting that might be present
        cleanProfile.gender = cleanProfile.gender.replace(/['"\\\/]+/g, '').trim();
        
        // Validate that gender is either 'Male' or 'Female' only
        if (!['Male', 'Female'].includes(cleanProfile.gender)) {
          cleanProfile.gender = null;
        }
      }

      // Handle date_of_birth formatting for PostgreSQL DATE type
      if (cleanProfile.date_of_birth) {
        // If it's a full ISO string, convert to YYYY-MM-DD format
        if (typeof cleanProfile.date_of_birth === 'string' && cleanProfile.date_of_birth.includes('T')) {
          cleanProfile.date_of_birth = cleanProfile.date_of_birth.split('T')[0];
          debugLog('Formatting date_of_birth for database:', cleanProfile.date_of_birth);
        }
      }

      // First, try to get existing profile data
      const { data: existingProfile, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found
        console.error('Error fetching existing profile:', fetchError);
        throw fetchError;
      }
      
      // Create update object, starting with a clean slate
      const updateData = { 
        id: user.id, 
        email: user.email
      };
      
      debugLog('Creating update data with:', { cleanProfile });
      
      // Add existing fields from database (if any)
      if (existingProfile) {
        // Selectively copy fields we want to preserve
        ['name', 'gender', 'date_of_birth', 'onboarding_complete', 'unit_pref'].forEach(field => {
          if (existingProfile[field] !== null && existingProfile[field] !== undefined) {
            updateData[field] = existingProfile[field];
          }
        });
      }
      
      // Now override with the cleaned new data - explicitly handle each field
      if (cleanProfile.name) updateData.name = cleanProfile.name;
      if (cleanProfile.gender) updateData.gender = cleanProfile.gender;
      if (cleanProfile.date_of_birth) updateData.date_of_birth = cleanProfile.date_of_birth;
      
      // Explicitly handle onboarding_complete flag - IMPORTANT: this must override existing value
      if (cleanProfile.onboarding_complete !== undefined) {
        // Ensure onboarding_complete is stored as a boolean
        updateData.onboarding_complete = cleanProfile.onboarding_complete === true;
        debugLog('Setting onboarding_complete to:', updateData.onboarding_complete, '(boolean)');
      }
      
      debugLog('Final update data:', updateData);

      // First try a direct update - this is most reliable with RLS
      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id);
        
      if (!updateError) {
        debugLog('Profile updated successfully via update');
        return { error: null };
      }
      
      debugLog('Update failed, trying insert:', updateError);
      
      // Fallback to insert with upsert if update fails
      const { data, error: insertError } = await supabase
        .from('users')
        .upsert([updateData], { 
          onConflict: 'id',
          returning: 'minimal' 
        });

      if (!insertError) {
        debugLog('Profile updated successfully via insert');
        return { error: null };
      }
      
      debugLog('Insert failed too, trying RPC:', insertError);
      
      // Last resort: try using RPC (if available)
      try {
        const { error: rpcError } = await supabase.rpc('update_user_profile', {
          user_id: user.id,
          user_name: cleanProfile.name || updateData.name,
          user_gender: cleanProfile.gender || updateData.gender,
          user_date_of_birth: cleanProfile.date_of_birth || updateData.date_of_birth,
          user_onboarding_complete: cleanProfile.onboarding_complete !== undefined ? cleanProfile.onboarding_complete : updateData.onboarding_complete
        });
        
        if (!rpcError) {
          debugLog('Profile updated successfully via RPC');
          return { error: null };
        } else {
          debugLog('RPC failed:', rpcError);
          throw rpcError;
        }
      } catch (rpcError) {
        console.error('Error using RPC function:', rpcError);
        throw rpcError;
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  // Force complete the onboarding process - use as last resort
  const forceCompleteOnboarding = async () => {
    try {
      setLoading(true);
      debugLog('Attempting to force complete onboarding');
      
      // Get current user
      const session = supabase.auth.session();
      const user = session?.user;
      
      if (!user) {
        console.error('No authenticated user found in forceCompleteOnboarding');
        return { error: new Error('No authenticated user found') };
      }
      
      // Direct update to set onboarding_complete to true
      const { error } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email,
          onboarding_complete: true
        }, {
          onConflict: 'id'
        });
        
      if (error) {
        console.error('Error in forceCompleteOnboarding:', error);
        return { error };
      }
      
      debugLog('Successfully forced onboarding completion');
      return { error: null };
    } catch (error) {
      console.error('Error in forceCompleteOnboarding:', error);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  return {
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    signInWithProvider,
    forceCompleteOnboarding,
    loading,
    biometricSupported,
    biometricEnabled,
    toggleBiometric,
    rememberMe,
    setRememberMe,
  };
}; 