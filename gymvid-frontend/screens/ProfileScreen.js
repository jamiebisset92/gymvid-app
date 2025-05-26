import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  Image, 
  Platform, 
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../config/colors';
import { supabase } from '../config/supabase';
import CountryFlag from 'react-native-country-flag';
import * as ImagePicker from 'expo-image-picker';
import { uploadProfileImage } from '../utils/storageUtils';
import { useToast } from '../components/ToastProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../hooks/useAuth';

// List of countries with ISO codes for flag display
const COUNTRIES = [
  { name: "Afghanistan", code: "AF" },
  { name: "Albania", code: "AL" },
  { name: "Algeria", code: "DZ" },
  { name: "Andorra", code: "AD" },
  { name: "Angola", code: "AO" },
  { name: "Antigua and Barbuda", code: "AG" },
  { name: "Argentina", code: "AR" },
  { name: "Armenia", code: "AM" },
  { name: "Australia", code: "AU" },
  { name: "Austria", code: "AT" },
  { name: "Azerbaijan", code: "AZ" },
  { name: "Bahamas", code: "BS" },
  { name: "Bahrain", code: "BH" },
  { name: "Bangladesh", code: "BD" },
  { name: "Barbados", code: "BB" },
  { name: "Belarus", code: "BY" },
  { name: "Belgium", code: "BE" },
  { name: "Belize", code: "BZ" },
  { name: "Benin", code: "BJ" },
  { name: "Bhutan", code: "BT" },
  { name: "Bolivia", code: "BO" },
  { name: "Bosnia and Herzegovina", code: "BA" },
  { name: "Botswana", code: "BW" },
  { name: "Brazil", code: "BR" },
  { name: "Brunei", code: "BN" },
  { name: "Bulgaria", code: "BG" },
  { name: "Burkina Faso", code: "BF" },
  { name: "Burundi", code: "BI" },
  { name: "Cabo Verde", code: "CV" },
  { name: "Cambodia", code: "KH" },
  { name: "Cameroon", code: "CM" },
  { name: "Canada", code: "CA" },
  { name: "Central African Republic", code: "CF" },
  { name: "Chad", code: "TD" },
  { name: "Chile", code: "CL" },
  { name: "China", code: "CN" },
  { name: "Colombia", code: "CO" },
  { name: "Comoros", code: "KM" },
  { name: "Congo", code: "CG" },
  { name: "Costa Rica", code: "CR" },
  { name: "Croatia", code: "HR" },
  { name: "Cuba", code: "CU" },
  { name: "Cyprus", code: "CY" },
  { name: "Czech Republic", code: "CZ" },
  { name: "Denmark", code: "DK" },
  { name: "Djibouti", code: "DJ" },
  { name: "Dominica", code: "DM" },
  { name: "Dominican Republic", code: "DO" },
  { name: "Ecuador", code: "EC" },
  { name: "Egypt", code: "EG" },
  { name: "El Salvador", code: "SV" },
  { name: "Equatorial Guinea", code: "GQ" },
  { name: "Eritrea", code: "ER" },
  { name: "Estonia", code: "EE" },
  { name: "Eswatini", code: "SZ" },
  { name: "Ethiopia", code: "ET" },
  { name: "Fiji", code: "FJ" },
  { name: "Finland", code: "FI" },
  { name: "France", code: "FR" },
  { name: "Gabon", code: "GA" },
  { name: "Gambia", code: "GM" },
  { name: "Georgia", code: "GE" },
  { name: "Germany", code: "DE" },
  { name: "Ghana", code: "GH" },
  { name: "Greece", code: "GR" },
  { name: "Grenada", code: "GD" },
  { name: "Guatemala", code: "GT" },
  { name: "Guinea", code: "GN" },
  { name: "Guinea-Bissau", code: "GW" },
  { name: "Guyana", code: "GY" },
  { name: "Haiti", code: "HT" },
  { name: "Honduras", code: "HN" },
  { name: "Hungary", code: "HU" },
  { name: "Iceland", code: "IS" },
  { name: "India", code: "IN" },
  { name: "Indonesia", code: "ID" },
  { name: "Iran", code: "IR" },
  { name: "Iraq", code: "IQ" },
  { name: "Ireland", code: "IE" },
  { name: "Israel", code: "IL" },
  { name: "Italy", code: "IT" },
  { name: "Ivory Coast", code: "CI" },
  { name: "Jamaica", code: "JM" },
  { name: "Japan", code: "JP" },
  { name: "Jordan", code: "JO" },
  { name: "Kazakhstan", code: "KZ" },
  { name: "Kenya", code: "KE" },
  { name: "Kiribati", code: "KI" },
  { name: "Kuwait", code: "KW" },
  { name: "Kyrgyzstan", code: "KG" },
  { name: "Laos", code: "LA" },
  { name: "Latvia", code: "LV" },
  { name: "Lebanon", code: "LB" },
  { name: "Lesotho", code: "LS" },
  { name: "Liberia", code: "LR" },
  { name: "Libya", code: "LY" },
  { name: "Liechtenstein", code: "LI" },
  { name: "Lithuania", code: "LT" },
  { name: "Luxembourg", code: "LU" },
  { name: "Madagascar", code: "MG" },
  { name: "Malawi", code: "MW" },
  { name: "Malaysia", code: "MY" },
  { name: "Maldives", code: "MV" },
  { name: "Mali", code: "ML" },
  { name: "Malta", code: "MT" },
  { name: "Marshall Islands", code: "MH" },
  { name: "Mauritania", code: "MR" },
  { name: "Mauritius", code: "MU" },
  { name: "Mexico", code: "MX" },
  { name: "Micronesia", code: "FM" },
  { name: "Moldova", code: "MD" },
  { name: "Monaco", code: "MC" },
  { name: "Mongolia", code: "MN" },
  { name: "Montenegro", code: "ME" },
  { name: "Morocco", code: "MA" },
  { name: "Mozambique", code: "MZ" },
  { name: "Myanmar", code: "MM" },
  { name: "Namibia", code: "NA" },
  { name: "Nauru", code: "NR" },
  { name: "Nepal", code: "NP" },
  { name: "Netherlands", code: "NL" },
  { name: "New Zealand", code: "NZ" },
  { name: "Nicaragua", code: "NI" },
  { name: "Niger", code: "NE" },
  { name: "Nigeria", code: "NG" },
  { name: "North Korea", code: "KP" },
  { name: "North Macedonia", code: "MK" },
  { name: "Norway", code: "NO" },
  { name: "Oman", code: "OM" },
  { name: "Pakistan", code: "PK" },
  { name: "Palau", code: "PW" },
  { name: "Panama", code: "PA" },
  { name: "Papua New Guinea", code: "PG" },
  { name: "Paraguay", code: "PY" },
  { name: "Peru", code: "PE" },
  { name: "Philippines", code: "PH" },
  { name: "Poland", code: "PL" },
  { name: "Portugal", code: "PT" },
  { name: "Qatar", code: "QA" },
  { name: "Romania", code: "RO" },
  { name: "Russia", code: "RU" },
  { name: "Rwanda", code: "RW" },
  { name: "Saint Kitts and Nevis", code: "KN" },
  { name: "Saint Lucia", code: "LC" },
  { name: "Saint Vincent and the Grenadines", code: "VC" },
  { name: "Samoa", code: "WS" },
  { name: "San Marino", code: "SM" },
  { name: "Sao Tome and Principe", code: "ST" },
  { name: "Saudi Arabia", code: "SA" },
  { name: "Senegal", code: "SN" },
  { name: "Serbia", code: "RS" },
  { name: "Seychelles", code: "SC" },
  { name: "Sierra Leone", code: "SL" },
  { name: "Singapore", code: "SG" },
  { name: "Slovakia", code: "SK" },
  { name: "Slovenia", code: "SI" },
  { name: "Solomon Islands", code: "SB" },
  { name: "Somalia", code: "SO" },
  { name: "South Africa", code: "ZA" },
  { name: "South Korea", code: "KR" },
  { name: "South Sudan", code: "SS" },
  { name: "Spain", code: "ES" },
  { name: "Sri Lanka", code: "LK" },
  { name: "Sudan", code: "SD" },
  { name: "Suriname", code: "SR" },
  { name: "Sweden", code: "SE" },
  { name: "Switzerland", code: "CH" },
  { name: "Syria", code: "SY" },
  { name: "Taiwan", code: "TW" },
  { name: "Tajikistan", code: "TJ" },
  { name: "Tanzania", code: "TZ" },
  { name: "Thailand", code: "TH" },
  { name: "Timor-Leste", code: "TL" },
  { name: "Togo", code: "TG" },
  { name: "Tonga", code: "TO" },
  { name: "Trinidad and Tobago", code: "TT" },
  { name: "Tunisia", code: "TN" },
  { name: "Turkey", code: "TR" },
  { name: "Turkmenistan", code: "TM" },
  { name: "Tuvalu", code: "TV" },
  { name: "Uganda", code: "UG" },
  { name: "Ukraine", code: "UA" },
  { name: "United Arab Emirates", code: "AE" },
  { name: "United Kingdom", code: "GB" },
  { name: "United States", code: "US" },
  { name: "Uruguay", code: "UY" },
  { name: "Uzbekistan", code: "UZ" },
  { name: "Vanuatu", code: "VU" },
  { name: "Vatican City", code: "VA" },
  { name: "Venezuela", code: "VE" },
  { name: "Vietnam", code: "VN" },
  { name: "Yemen", code: "YE" },
  { name: "Zambia", code: "ZM" },
  { name: "Zimbabwe", code: "ZW" }
];

const ProfileScreen = ({ navigation }) => {
  const { session, setSession, loading: authLoading, updateProfileData, user: authContextUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [tempValue, setTempValue] = useState('');
  const [showUnitPicker, setShowUnitPicker] = useState(false);

  const toast = useToast();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const user = supabase.auth.user(); // V1 METHOD
      if (!user) {
        toast.error("Not authenticated. Please log in.");
        setLoading(false);
        navigation.navigate('Login'); // Redirect to login if not authenticated
        return;
      }

      const { data, error, status } = await supabase
        .from('users')
        .select(`*`)
        .eq('id', user.id)
        .maybeSingle(); // Use maybeSingle to handle no profile yet

      if (error && status !== 406) {
        // 406 status means no rows found, which is fine for a new user
        throw error;
      }

      if (data) {
        setProfile(data);
        if (data.avatar_url) {
          // Construct full URL for avatar if it's just a path
          if (data.avatar_url.startsWith('http')) {
            setAvatarUrl(data.avatar_url);
          } else {
            // Assume it's a path in a public bucket
            // You might need to adjust this based on your bucket structure
            const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(data.avatar_url);
            setAvatarUrl(publicUrlData?.publicUrl);
          }
        }
        // Update auth context if needed, or ensure it's in sync
        if (!authContextUser || authContextUser.id !== data.id) {
          updateProfileData(data); // Make sure updateProfileData can handle this
        }
      } else {
        // If no profile data, but user is authenticated, create a basic profile object
        // or prompt for profile completion.
        // For now, set a minimal profile or null and let UI handle it.
        setProfile({ id: user.id, email: user.email }); // Basic profile from auth user
        toast.info("Profile not fully set up yet.");
      }
    } catch (error) {
      toast.error(`Error fetching profile: ${error.message}`);
      console.error("Error fetching profile:", error);
      // If profile fetch fails critically, consider signing out or redirecting
      // For now, just show error and stop loading
    } finally {
      setLoading(false);
      // Start animations once loading is complete
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true })
      ]).start();
    }
  };

  useEffect(() => {
    if (session) { // Only fetch if session is available
      fetchProfile();
    }
  }, [session]); // Re-fetch if session changes

  const handleSaveField = async (field) => {
    if (!profile) return;
    setLoading(true);
    try {
      const user = supabase.auth.user(); // V1 METHOD
      if (!user) throw new Error('User not authenticated');

      const updates = {
        id: user.id, // Ensure ID is part of updates for upsert logic
        [field]: field === 'bodyweight' ? parseFloat(tempValue) : tempValue,
        updated_at: new Date(),
      };

      const { error } = await supabase.from('users').upsert(updates).select().single();
      if (error) throw error;

      setProfile(prev => ({ ...prev, [field]: tempValue }));
      updateProfileData({ [field]: tempValue }); // Update auth context
      toast.success("Profile updated!");
      setEditingField(null);
    } catch (error) {
      toast.error(`Error updating profile: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setSession(null); // Clear session in auth context
      // navigation.replace('Login'); // Or your main auth flow start screen
      // AsyncStorage.clear(); // Optional: clear all async storage on sign out
      toast.success("Signed out successfully.");
    } catch (error) {
      toast.error(`Sign out failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets[0].uri) {
      uploadAvatar(result.assets[0].uri);
    }
  };

  const uploadAvatar = async (uri) => {
    try {
      setUploading(true);
      const user = supabase.auth.user(); // V1 METHOD
      if (!user) throw new Error('User not authenticated for avatar upload.');

      const fileExt = uri.split('.').pop();
      const fileName = `${user.id}.${fileExt}`;
      const filePath = `${fileName}`;

      let formData = new FormData();
      formData.append('file', {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        name: fileName,
        type: `image/${fileExt}`,
      });

      // Check if avatar exists to decide on update or upload
      // This might be tricky if old avatar has different extension
      // Simpler: always use upsert or overwrite
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, formData, { upsert: true }); // Use upsert: true

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL (assuming your bucket is public or has RLS for public read)
      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const newAvatarUrl = publicUrlData?.publicUrl;

      if (!newAvatarUrl) {
        throw new Error("Could not get public URL for avatar.");
      }

      // Update user profile with new avatar_url
      const updates = {
        id: user.id,
        avatar_url: newAvatarUrl, // Store the full public URL or just path based on preference
        updated_at: new Date(),
      };
      const { error: dbError } = await supabase.from('users').upsert(updates);
      if (dbError) throw dbError;

      setAvatarUrl(newAvatarUrl);
      setProfile(prev => ({ ...prev, avatar_url: newAvatarUrl }));
      updateProfileData({ avatar_url: newAvatarUrl }); // Update auth context

      toast.success("Avatar updated!");

    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={pickImage}
            style={styles.profileImageContainer}
          >
            <Image 
              source={{ uri: avatarUrl || 'https://randomuser.me/api/portraits/women/44.jpg' }} 
              style={styles.profileImage} 
            />
            {uploading ? (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="small" color="#fff" />
              </View>
            ) : (
              <View style={styles.editIconContainer}>
                <Ionicons name="camera" size={18} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.nameStatsContainer}>
            <Text style={styles.name}>{profile?.username || profile?.name || 'User'}</Text>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{profile?.workouts || 0}</Text>
                <Text style={styles.statLabel}>Workouts</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{profile?.videos || 0}</Text>
                <Text style={styles.statLabel}>Videos</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{profile?.followers || 0}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
            </View>
          </View>
        </View>
        
        <View style={styles.badgesRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Team </Text>
            <CountryFlag isoCode={profile?.country || 'US'} size={20} />
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{profile?.age_category || 'Open'}</Text>
            <Text style={[styles.badgeIcon, styles.trophyIcon]}>🏆</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{profile?.weight_class || '60kg'}</Text>
            <Text style={[styles.badgeIcon, styles.flexIcon]}>💪</Text>
          </View>
        </View>

        {/* Admin section for app settings */}
        <TouchableOpacity 
          style={styles.adminButton}
          onPress={() => Alert.alert(
            'Backend Configuration',
            'Profile images are stored via the FastAPI backend with fallback support',
            [
              { 
                text: 'API Information', 
                onPress: () => Alert.alert(
                  'Backend API Details',
                  'Endpoint: https://gymvid-app.onrender.com/upload/profile-image\n\nMethod: POST\nBody: FormData (file, user_id)'
                )
              },
              { 
                text: 'API Implementation', 
                onPress: () => Alert.alert(
                  'API Implementation',
                  'The backend saves uploaded images to the "/uploads/profiles/" directory and eventually to AWS S3.\n\nMax file size: 3MB\nAllowed types: jpg, jpeg, png, gif, webp'
                )
              },
              { 
                text: 'Fallback System', 
                onPress: () => Alert.alert(
                  'Fallback System',
                  'If the backend API is unavailable, the app uses placeholder images from randomuser.me to ensure functionality during connectivity issues.'
                )
              },
              { text: 'Close', style: 'cancel' }
            ]
          )}
        >
          <Text style={styles.adminButtonText}>Admin: API Backend Information</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.gray,
    fontFamily: 'DMSans-Regular',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    justifyContent: 'center',
    marginBottom: 16,
  },
  profileImageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.lightGray,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.darkGray,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameStatsContainer: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
  },
  name: {
    fontSize: 22,
    fontFamily: 'DMSans-Bold',
    color: colors.darkGray,
    marginBottom: 8,
    flexWrap: 'wrap',
    textAlign: 'left',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  statBox: {
    alignItems: 'center',
    marginRight: 16,
    minWidth: 60,
  },
  statNumber: {
    fontSize: 18,
    fontFamily: 'DMSans-Bold',
    color: colors.darkGray,
  },
  statLabel: {
    fontSize: 12,
    color: colors.gray,
    fontFamily: 'DMSans-Regular',
    marginTop: 2,
  },
  badgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    width: '100%',
    paddingHorizontal: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F8FF',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 5,
    width: '30%',
    height: 37,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,118,255,0.2)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  badgeText: {
    fontSize: 14,
    color: colors.darkGray,
    fontFamily: 'DMSans-Medium',
    marginRight: 5,
    textAlign: 'center',
  },
  badgeIcon: {
    marginLeft: 2,
  },
  flagContainer: {
    borderRadius: 4,
    overflow: 'hidden',
    marginLeft: 2,
  },
  emojiIcon: {
    fontSize: 13,
  },
  trophyIcon: {
    fontSize: 13,
  },
  flexIcon: {
    fontSize: 12,
  },
  adminButton: {
    marginTop: 30,
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    alignSelf: 'center',
  },
  adminButtonText: {
    fontSize: 12,
    color: colors.gray,
    fontFamily: 'DMSans-Medium',
  },
  uploaderContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  cancelButton: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelButtonText: {
    color: colors.gray,
    fontSize: 16,
    fontFamily: 'DMSans-Medium',
  },
}); 

export default ProfileScreen; 