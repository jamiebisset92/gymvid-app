import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../config/colors';
import { supabase } from '../config/supabase';

export default function GymVidGamesScreen() {
  const [selectedTab, setSelectedTab] = useState('You');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBadges, setSelectedBadges] = useState(new Set());
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth) => {
    const today = new Date();
    const birth = new Date(dateOfBirth);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  // Get age category based on age (from DateOfBirthScreen logic)
  const getAgeCategory = (age) => {
    if (age < 18) {
      return 'Sub-Junior';
    } else if (age >= 18 && age < 23) {
      return 'Junior';
    } else if (age >= 40 && age < 50) {
      return 'Masters 1';
    } else if (age >= 50 && age < 60) {
      return 'Masters 2';
    } else if (age >= 60) {
      return 'Masters 3';
    } else {
      return 'Open';
    }
  };

  // Get weight class (from UserWeightScreen logic)
  const getWeightClass = (gender, weight, unit) => {
    if (!gender || !weight || isNaN(parseFloat(weight))) {
      return 'Open';
    }

    const numWeight = parseFloat(weight);
    let weightClass = 'Open';
    
    let weightInKg = numWeight;
    if (unit === 'lbs') {
      weightInKg = numWeight / 2.20462;
    }
    
    if (gender === 'Female') {
      if (weightInKg <= 47) weightClass = '43–47kg';
      else if (weightInKg <= 52) weightClass = '47–52kg';
      else if (weightInKg <= 57) weightClass = '50–57kg';
      else if (weightInKg <= 63) weightClass = '57–63kg';
      else if (weightInKg <= 69) weightClass = '63–69kg';
      else if (weightInKg <= 76) weightClass = '69–76kg';
      else if (weightInKg <= 84) weightClass = '76–84kg';
      else weightClass = '84kg+';
    } else {
      if (weightInKg <= 59) weightClass = '53–59kg';
      else if (weightInKg <= 66) weightClass = '59–66kg';
      else if (weightInKg <= 74) weightClass = '66–74kg';
      else if (weightInKg <= 83) weightClass = '74–83kg';
      else if (weightInKg <= 93) weightClass = '83–93kg';
      else if (weightInKg <= 105) weightClass = '93–105kg';
      else if (weightInKg <= 120) weightClass = '105–120kg';
      else weightClass = '120kg+';
    }
    
    return weightClass;
  };

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const user = supabase.auth.user();
        
        if (!user) {
          setLoading(false);
          return;
        }

        const { data: profile, error } = await supabase
          .from('users')
          .select('country, date_of_birth, bodyweight, unit_pref, gender')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user profile:', error);
          setLoading(false);
          return;
        }

        setUserProfile(profile);
        setLoading(false);
      } catch (err) {
        console.error('Error in fetchUserProfile:', err);
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  const toggleBadge = (badge) => {
    const newSelected = new Set(selectedBadges);
    if (newSelected.has(badge)) {
      newSelected.delete(badge);
    } else {
      newSelected.add(badge);
    }
    setSelectedBadges(newSelected);
  };

  const getPlaceholderText = () => {
    switch (selectedTab) {
      case 'You':
        return "Search exercises & find your PR's";
      case 'Others':
        return "Search exercises to find records";
      default:
        return "Search exercises...";
    }
  };

  // Generate badge data with user profile information
  const getBadgeData = () => {
    if (!userProfile) {
      return [
        { key: 'Team', label: 'Team', value: null },
        { key: 'Age Class', label: 'Age Class', value: null },
        { key: 'Weight Class', label: 'Weight Class', value: null },
      ];
    }

    const age = userProfile.date_of_birth ? calculateAge(userProfile.date_of_birth) : null;
    const ageCategory = age ? getAgeCategory(age) : null;
    const weightClass = getWeightClass(userProfile.gender, userProfile.bodyweight, userProfile.unit_pref);

    return [
      { 
        key: 'Team', 
        label: 'Team', 
        value: userProfile.country
      },
      { 
        key: 'Age Class', 
        label: 'Age Class', 
        value: ageCategory 
      },
      { 
        key: 'Weight Class', 
        label: 'Weight Class', 
        value: weightClass 
      },
    ];
  };

  const badges = getBadgeData();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>The GymVid Games</Text>
          <TouchableOpacity style={styles.settingsIcon}>
            <Ionicons name="settings-outline" size={24} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {['You', 'Others'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              selectedTab === tab && styles.selectedTab
            ]}
            onPress={() => setSelectedTab(tab)}
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

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={colors.gray} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={getPlaceholderText()}
            placeholderTextColor={colors.gray}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color={colors.gray} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Badges */}
      <View style={styles.badgesContainer}>
        {badges.map((badge) => (
          <TouchableOpacity
            key={badge.key}
            style={[
              styles.badge,
              selectedBadges.has(badge.key) && styles.selectedBadge
            ]}
            onPress={() => toggleBadge(badge.key)}
          >
            <View style={styles.badgeContent}>
              <Text style={[
                styles.badgeText,
                selectedBadges.has(badge.key) && styles.selectedBadgeText
              ]}>
                {badge.value || badge.label}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content Area */}
      <View style={styles.content}>
        {loading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading your profile...</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'left',
  },
  settingsIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  tab: {
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
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.darkGray,
    paddingVertical: 0,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  content: {
    flex: 1,
    paddingTop: 12,
  },
  badgesContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 12,
  },
  badge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  selectedBadge: {
    backgroundColor: 'transparent',
    borderColor: colors.primary,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.darkGray,
  },
  selectedBadgeText: {
    color: colors.primary,
    fontWeight: '600',
  },
  badgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
}); 