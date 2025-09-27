import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, DollarSign, Bell, Lock, Download, ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';
import { useCurrency } from '@/contexts/CurrencyContext';

export default function SettingsScreen() {
  const { selectedCurrency } = useCurrency();

  const settingsItems = [
    {
      section: 'Profile',
      items: [
        {
          icon: User,
          title: 'Profile',
          description: 'Manage your profile information',
          onPress: () => console.log('Profile pressed'),
        },
      ],
    },
    {
      section: 'App',
      items: [
        {
          icon: DollarSign,
          title: 'Currency',
          description: 'Set your default currency',
          onPress: () => router.push('/currency'),
        },
        {
          icon: Bell,
          title: 'Notifications',
          description: 'Customize your notification settings',
          onPress: () => console.log('Notifications pressed'),
        },
        {
          icon: Lock,
          title: 'Security',
          description: 'Secure your app with a passcode',
          onPress: () => console.log('Security pressed'),
        },
      ],
    },
    {
      section: 'Data',
      items: [
        {
          icon: Download,
          title: 'Export Data',
          description: 'Export your data for backup',
          onPress: () => console.log('Export Data pressed'),
        },
      ],
    },
  ];

  const renderSettingItem = (item: any) => (
    <TouchableOpacity
      key={item.title}
      style={styles.settingItem}
      onPress={item.onPress}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <item.icon size={24} color="#4A9EFF" />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{item.title}</Text>
        <Text style={styles.settingDescription}>{item.description}</Text>
      </View>
      <ChevronRight size={20} color="#8B9DC3" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {settingsItems.map((section) => (
          <View key={section.section} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.section}</Text>
            <View style={styles.sectionContent}>
              {section.items.map(renderSettingItem)}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1621',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 157, 195, 0.1)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  sectionContent: {
    gap: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111C2A',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(74, 158, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#8B9DC3',
  },
});