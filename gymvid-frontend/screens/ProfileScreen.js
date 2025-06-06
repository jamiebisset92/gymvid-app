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
  Animated,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../config/colors';
import { supabase } from '../config/supabase';
import * as ImagePicker from 'expo-image-picker';
import { uploadProfileImage } from '../utils/storageUtils';
import { useToast } from '../components/ToastProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../hooks/useAuth';
import { Video } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';

const formatTodaysDate = () => {
  const date = new Date();
  const days = ['Sun', 'Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
  const dayName = days[date.getDay()];
  const day = date.getDate();
  const month = months[date.getMonth()];
  
  const getOrdinalSuffix = (day) => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };
  
  return `${dayName} ${day}${getOrdinalSuffix(day)} ${month}`;
};

const ProfileScreen = ({ navigation }) => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [tempValue, setTempValue] = useState('');
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [selectedTab, setSelectedTab] = useState('Feed');
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const toast = useToast();
  const videoRef = useRef(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // Initialize session
  useEffect(() => {
    const getSession = async () => {
      try {
        // Supabase v1 method
        const session = supabase.auth.session();
        console.log('Initial session:', session ? 'Found session' : 'No session');
        setSession(session);
      } catch (error) {
        console.error('Error in getSession:', error);
      }
    };

    getSession();

    // Listen for auth changes (v1 method)
    const authListener = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session ? 'Has session' : 'No session');
        setSession(session);
      }
    );

    return () => {
      // Defensive cleanup for different possible return structures
      try {
        if (authListener) {
          if (typeof authListener.unsubscribe === 'function') {
            authListener.unsubscribe();
          } else if (authListener.data && typeof authListener.data.unsubscribe === 'function') {
            authListener.data.unsubscribe();
          } else if (authListener.subscription && typeof authListener.subscription.unsubscribe === 'function') {
            authListener.subscription.unsubscribe();
          }
        }
      } catch (error) {
        console.warn('Error cleaning up auth listener:', error);
      }
    };
  }, []);

  const fetchProfile = async () => {
    if (!session?.user) {
      console.log('fetchProfile: No session or user, skipping');
      setLoading(false);
        toast.error("Not authenticated. Please log in.");
        return;
      }

    console.log('fetchProfile: Starting fetch for user ID:', session.user.id);
    
    try {
      setLoading(true);

      const { data, error, status } = await supabase
        .from('users')
        .select(`*`)
        .eq('id', session.user.id)
        .maybeSingle();

      console.log('fetchProfile: Query result:', { data, error, status });

      if (error && status !== 406) {
        throw error;
      }

      if (data) {
        console.log('fetchProfile: Profile data found:', data);
        setProfile(data);
        if (data.avatar_url) {
          if (data.avatar_url.startsWith('http')) {
            setAvatarUrl(data.avatar_url);
          } else {
            const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(data.avatar_url);
            setAvatarUrl(publicUrlData?.publicUrl);
          }
        }
      } else {
        console.log('fetchProfile: No profile data, creating basic profile');
        setProfile({ id: session.user.id, email: session.user.email });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error(`Error fetching profile: ${error.message}`);
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
    console.log('ProfileScreen useEffect: session changed:', session ? 'Has session' : 'No session');
    if (session?.user) {
      console.log('ProfileScreen useEffect: User ID:', session.user.id);
      fetchProfile();
    } else if (session === null) {
      // Session is explicitly null (not loading), set loading to false
      console.log('ProfileScreen useEffect: Session is null, stopping loading');
      setLoading(false);
    }
  }, [session?.user?.id]);

  const handleSaveField = async (field) => {
    if (!profile || !session?.user) return;
    
    setLoading(true);
    try {
      const updates = {
        id: session.user.id,
        [field]: field === 'bodyweight' ? parseFloat(tempValue) : tempValue,
        updated_at: new Date(),
      };

      const { error } = await supabase.from('users').upsert(updates).select().single();
      if (error) throw error;

      setProfile(prev => ({ ...prev, [field]: tempValue }));
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
    if (!session?.user) {
      toast.error('User not authenticated for avatar upload.');
      return;
    }

    try {
      setUploading(true);

      const fileExt = uri.split('.').pop();
      const fileName = `${session.user.id}.${fileExt}`;
      const filePath = `${fileName}`;

      let formData = new FormData();
      formData.append('file', {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        name: fileName,
        type: `image/${fileExt}`,
      });

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, formData, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const newAvatarUrl = publicUrlData?.publicUrl;

      if (!newAvatarUrl) {
        throw new Error("Could not get public URL for avatar.");
      }

      const updates = {
        id: session.user.id,
        avatar_url: newAvatarUrl,
        updated_at: new Date(),
      };
      const { error: dbError } = await supabase.from('users').upsert(updates);
      if (dbError) throw dbError;

      setAvatarUrl(newAvatarUrl);
      setProfile(prev => ({ ...prev, avatar_url: newAvatarUrl }));

      toast.success("Avatar updated!");

    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleVideoPress = async () => {
    if (videoRef.current) {
      if (isVideoPlaying) {
        await videoRef.current.pauseAsync();
        setIsVideoPlaying(false);
      } else {
        await videoRef.current.playAsync();
        setIsVideoPlaying(true);
      }
    }
  };

  // Show loading only when actually loading and not just waiting for auth
  if (loading && session) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  // If no session and auth is not loading, don't render the profile
  if (!session?.user) {
    return null; // Let the navigation handle redirecting to login
  }

  console.log('ProfileScreen rendering with profile data:', profile);
  console.log('ProfileScreen rendering with avatarUrl:', avatarUrl);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={pickImage}
            style={styles.profileImageContainer}
          >
            <Image 
                source={avatarUrl ? { uri: avatarUrl } : require('../assets/images/Default Profile Icon.jpg')} 
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
                  <Text style={styles.statNumber}>{profile?.videos || 1}</Text>
                <Text style={styles.statLabel}>Videos</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{profile?.followers || 0}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
            </View>
          </View>
        </View>
        
          {/* Navigation Tabs */}
          <View style={styles.tabsContainer}>
            {['Feed', 'Routines', 'Progress'].map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tabButton,
                  selectedTab === tab && styles.selectedTab
                ]}
                onPress={() => setSelectedTab(tab)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.tabText,
                  selectedTab === tab && styles.selectedTabText
                ]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Exercise Content - No Card Container */}
          <View style={styles.exerciseContent}>
            <View style={styles.exerciseHeaderRow}>
              <Text style={styles.exerciseHeader}>{formatTodaysDate()}</Text>
              <LinearGradient
                colors={['#2563eb', '#0284c7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.prBadgeGradient}
              >
                <Text style={styles.prBadgeText}>New PR</Text>
              </LinearGradient>
            </View>
            <Text style={styles.exerciseSubHeader}>
              Barbell Conventional Deadlift
            </Text>
            <Text style={styles.exerciseWeight}>240kg x 2</Text>
            <View style={styles.videoContainer}>
              <Video
                ref={videoRef}
                source={{ uri: 'https://gymvid-user-uploads.s3.amazonaws.com/workoutVideos/yUac9MAARLXxF57u5EYVU1IFY1u2/Jamie_Deadlift.mov' }}
                style={styles.instagramVideo}
                useNativeControls={false}
                resizeMode="cover"
                shouldPlay={isVideoPlaying}
                isLooping={true}
                isMuted={true}
              />
              {!isVideoPlaying && (
                <TouchableOpacity style={styles.playOverlay} onPress={handleVideoPress}>
                  <Ionicons name="play-circle" size={48} color="rgba(255, 255, 255, 0.9)" />
                </TouchableOpacity>
              )}
              {isVideoPlaying && (
                <TouchableOpacity style={styles.videoTouchArea} onPress={handleVideoPress} />
              )}
            </View>
          </View>

        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    paddingTop: 0,
    paddingBottom: 20,
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
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 8,
    width: '100%',
    paddingHorizontal: 0,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  selectedTab: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#8E8E93',
  },
  selectedTabText: {
    color: '#000',
    fontWeight: '600',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  exerciseContent: {
    width: '100%',
    alignItems: 'flex-start',
    marginTop: 10,
  },
  exerciseHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    width: '100%',
  },
  exerciseHeader: {
    fontSize: 18,
    fontFamily: 'DMSans-Bold',
    color: colors.darkGray,
    textAlign: 'left',
  },
  prBadgeGradient: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  prBadgeText: {
    fontSize: 11,
    fontFamily: 'DMSans-Bold',
    color: '#fff',
  },
  exerciseSubHeader: {
    fontSize: 16,
    fontFamily: 'DMSans-Regular',
    color: colors.gray,
    marginBottom: 5,
    textAlign: 'left',
    width: '100%',
  },
  exerciseWeight: {
    fontSize: 14,
    fontFamily: 'DMSans-Regular',
    color: colors.darkGray,
    textAlign: 'left',
    marginBottom: 10,
    width: '100%',
  },
  videoContainer: {
    width: '100%',
    aspectRatio: 4/5,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 10,
  },
  instagramVideo: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoTouchArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
}); 

export default ProfileScreen; 