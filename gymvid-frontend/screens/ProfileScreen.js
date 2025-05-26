import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  Image, 
  Platform, 
  ActivityIndicator,
  TouchableOpacity,
  Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../config/colors';
import { supabase } from '../config/supabase';
import CountryFlag from 'react-native-country-flag';
import * as ImagePicker from 'expo-image-picker';
import { uploadProfileImage } from '../utils/storageUtils';
import { useToast } from '../components/ToastProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

export default function ProfileScreen({ mcp, user_id }) {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [countryCode, setCountryCode] = useState('US'); // Default to US
  const [userId, setUserId] = useState(null);
  const [ageCategory, setAgeCategory] = useState('Open'); // Default fallback
  const [weightClass, setWeightClass] = useState('60kg'); // Default fallback
  const toast = useToast();
  
  // Stats data moved to state
  const [stats, setStats] = useState({
    workouts: 42,
    videos: 128,
    followers: 987
  });

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        // Get current user using the v2 API method or use provided user_id prop
        let currentUserId = user_id;
        
        if (!currentUserId) {
          const { data: { user } } = await supabase.auth.getUser();
          currentUserId = user?.id;
        }
        
        if (!currentUserId) {
          setLoading(false);
          return;
        }
        
        setUserId(currentUserId);
        
        // Fetch user profile from 'users' table
        const { data, error } = await supabase
          .from('users')
          .select('username, name, email, profile_image_url, country, age_category, weight_class')
          .eq('id', currentUserId)
          .maybeSingle(); // Use maybeSingle() to handle no rows
          
        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching user profile:', error);
          setLoading(false);
          return;
        }
        
        if (!data) {
          // Create a basic profile if it doesn't exist
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { error: insertError } = await supabase
              .from('users')
              .insert({
                id: currentUserId,
                email: user.email,
                onboarding_complete: false
              });
            
            if (insertError) {
              console.error('Error creating user profile:', insertError);
            }
          }
          setLoading(false);
          return;
        }
        
        console.log('User country:', data.country);
        
        // Find country code if country is available
        let countryIsoCode = 'US'; // Default
        if (data.country) {
          const countryObj = COUNTRIES.find(c => 
            c.name.toLowerCase() === data.country.toLowerCase()
          );
          
          if (countryObj) {
            countryIsoCode = countryObj.code;
            console.log('Found country code:', countryIsoCode);
          } else {
            console.log('Country not found in list:', data.country);
          }
        }
        
        setCountryCode(countryIsoCode);
        
        // Try to get age category and weight class from Supabase first
        if (data.age_category) setAgeCategory(data.age_category);
        if (data.weight_class) setWeightClass(data.weight_class);
        
        // If not available in Supabase, try AsyncStorage as fallback
        try {
          const storedAgeCategory = await AsyncStorage.getItem('userAgeCategory');
          const storedWeightClass = await AsyncStorage.getItem('userWeightClass');
          
          if (!data.age_category && storedAgeCategory) {
            setAgeCategory(storedAgeCategory);
          }
          
          if (!data.weight_class && storedWeightClass) {
            setWeightClass(storedWeightClass);
          }
        } catch (storageError) {
          console.error('Error reading from AsyncStorage:', storageError);
        }
        
        // Set user data with username from database
        setUserData({
          name: data.username || data.name || 'User',
          profileImage: data.profile_image_url || 'https://randomuser.me/api/portraits/women/44.jpg',
          country: data.country || 'United States'
        });
      } catch (error) {
        console.error('Error in profile data fetching:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserProfile();
  }, [user_id]);

  const handleSelectProfileImage = async () => {
    try {
      // Request permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert("Permission Denied", "You need to allow access to your photos to change your profile picture.");
        return;
      }
      
      // Launch image picker using the compatible format for this version
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        await handleProfileImageUpload(imageUri);
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };
  
  const handleProfileImageUpload = async (imageUri) => {
    try {
      setUploadingImage(true);
      
      // Get current user id (from props or auth)
      let currentUserId = user_id;
      
      if (!currentUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        currentUserId = user?.id;
      }
      
      if (!currentUserId) {
        toast.error('You need to be logged in to upload a profile image');
        return;
      }
      
      console.log('Starting profile image upload for user:', currentUserId);
      
      // Prepare FormData for the backend
      const fileExt = imageUri.split('.').pop().toLowerCase();
      const fileName = `${Date.now()}.${fileExt}`;
      
      const fileObject = {
        uri: imageUri,
        type: `image/${fileExt}`,
        name: fileName
      };
      
      // Create FormData
      const formData = new FormData();
      formData.append('file', fileObject);
      formData.append('user_id', currentUserId);
      
      // Send direct request to backend API
      const response = await fetch('https://gymvid-app.onrender.com/upload/profile-image', {
        method: 'POST',
        body: formData,
        timeout: 30000,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Backend error:', {
          status: response.status,
          text: errorText
        });
        throw new Error(`Upload failed: ${response.status}`);
      }
      
      // Parse backend response
      const data = await response.json();
      console.log('Backend response:', data);
      
      // Check for success flag and image_url in response
      if (!data.success || !data.image_url) {
        throw new Error('Invalid response from server');
      }
      
      const imageUrl = data.image_url;
      console.log('Image uploaded successfully to S3, URL:', imageUrl);
      
      // Use the provided mcp client or fallback to standard supabase client
      const dbClient = mcp || supabase;
      
      // Update user profile in Supabase - overwrite existing image URL
      const updateResult = await dbClient
        .from('users')
        .update({ profile_image_url: imageUrl })
        .eq('id', currentUserId);
      
      if (updateResult.error) {
        console.error('Error updating user profile:', updateResult.error);
        toast.error('Profile updated in S3 but database update failed');
        throw new Error(`Failed to update profile in database: ${updateResult.error.message}`);
      }
      
      console.log('Profile updated successfully in database');
      
      // Update state with new image
      setUserData(prev => ({
        ...prev,
        profileImage: imageUrl
      }));
      
      // Show success toast without tick emoji
      toast.success('Profile image updated!');
      
    } catch (error) {
      // Log the full error object for debugging
      console.error('Error uploading image:', error);
      
      // Show error toast
      toast.error(`Failed to update profile image: ${error.message || 'Unknown error'}`);
    } finally {
      setUploadingImage(false);
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
            onPress={handleSelectProfileImage}
            style={styles.profileImageContainer}
            className="relative rounded-full overflow-hidden shadow-md border-2 border-gray-100"
          >
            <Image 
              source={{ uri: userData?.profileImage || 'https://randomuser.me/api/portraits/women/44.jpg' }} 
              style={styles.profileImage} 
              className="w-20 h-20 rounded-full bg-gray-100"
            />
            {uploadingImage ? (
              <View style={styles.uploadingOverlay} className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-full">
                <ActivityIndicator size="small" color="#fff" />
              </View>
            ) : (
              <View style={styles.editIconContainer} className="absolute bottom-0 right-0 bg-gray-800 w-7 h-7 rounded-full flex items-center justify-center border-2 border-white">
                <Ionicons name="camera" size={18} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.nameStatsContainer}>
            <Text style={styles.name}>{userData?.name || 'User'}</Text>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{userData?.workouts || 0}</Text>
                <Text style={styles.statLabel}>Workouts</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{userData?.videos || 0}</Text>
                <Text style={styles.statLabel}>Videos</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{userData?.followers || 0}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
            </View>
          </View>
        </View>
        
        <View style={styles.badgesRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Team </Text>
            <CountryFlag isoCode={countryCode} size={20} />
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{ageCategory}</Text>
            <Text style={[styles.badgeIcon, styles.trophyIcon]}>🏆</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{weightClass}</Text>
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