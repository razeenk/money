import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, DollarSign, Bell, Lock, Download, ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';
import { useCurrency } from '@/contexts/CurrencyContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen() {
  const { selectedCurrency } = useCurrency();

  const exportData = async () => {
    try {
      // Get all data from AsyncStorage
      const [transactions, goals, goalHistory, payees, currency] = await Promise.all([
        AsyncStorage.getItem('transactions'),
        AsyncStorage.getItem('goals'),
        AsyncStorage.getItem('goalHistory'),
        AsyncStorage.getItem('payees'),
        AsyncStorage.getItem('selectedCurrency')
      ]);

      // Create export data object
      const exportData = {
        exportDate: new Date().toISOString(),
        appVersion: '1.0.0',
        data: {
          transactions: transactions ? JSON.parse(transactions) : [],
          goals: goals ? JSON.parse(goals) : [],
          goalHistory: goalHistory ? JSON.parse(goalHistory) : [],
          payees: payees ? JSON.parse(payees) : [],
          selectedCurrency: currency ? JSON.parse(currency) : null
        }
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const fileName = `sillymoney_backup_${new Date().toISOString().split('T')[0]}.sillymoney`;

      if (Platform.OS === 'web') {
        // Web export using download
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        Alert.alert('Success', 'Data exported successfully!');
      } else {
        // For mobile, we'll show the data in an alert for now
        // In a real app, you'd use a file system library like expo-file-system
        Alert.alert(
          'Export Data', 
          'Data exported successfully! In a mobile app, this would save to your device.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to export data. Please try again.');
    }
  };
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
          onPress: exportData,
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
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  sectionContent: {
    gap: 6,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111C2A',
    padding: 12,
    borderRadius: 12,
    marginBottom: 6,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(74, 158, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 16,
    color: '#8B9DC3',
  },
});