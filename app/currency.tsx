import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Search, DollarSign } from 'lucide-react-native';
import { router } from 'expo-router';
import { useCurrency, currencies, Currency } from '@/contexts/CurrencyContext';

export default function CurrencyScreen() {
  const { selectedCurrency, setSelectedCurrency } = useCurrency();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCurrencies = currencies.filter(currency =>
    currency.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    currency.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCurrencySelect = (currency: Currency) => {
    setSelectedCurrency(currency);
    router.back();
  };

  const getCurrencyIcon = (code: string) => {
    // Using DollarSign for all currencies as a placeholder
    // In a real app, you might want different icons for different currencies
    return <DollarSign size={20} color="#4A9EFF" />;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <X size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Currency</Text>
        <View style={styles.spacer} />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#8B9DC3" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search currency"
            placeholderTextColor="#8B9DC3"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Currency List */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {filteredCurrencies.map((currency) => (
          <TouchableOpacity
            key={currency.code}
            style={[
              styles.currencyItem,
              selectedCurrency.code === currency.code && styles.selectedCurrencyItem
            ]}
            onPress={() => handleCurrencySelect(currency)}
            activeOpacity={0.7}
          >
            <View style={styles.currencyIcon}>
              {getCurrencyIcon(currency.code)}
            </View>
            <View style={styles.currencyInfo}>
              <Text style={styles.currencyName}>
                {currency.name} ({currency.code})
              </Text>
              <Text style={styles.currencySymbol}>
                Symbol: {currency.symbol}
              </Text>
            </View>
            {selectedCurrency.code === currency.code && (
              <View style={styles.selectedIndicator} />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101922',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 157, 195, 0.1)',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  spacer: {
    width: 40,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2A3A',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: '#2A3F54',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 100,
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2A3A',
  },
  selectedCurrencyItem: {
    backgroundColor: 'rgba(74, 158, 255, 0.1)',
  },
  currencyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(74, 158, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  currencyInfo: {
    flex: 1,
  },
  currencyName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  currencySymbol: {
    fontSize: 12,
    color: '#8B9DC3',
  },
  selectedIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4A9EFF',
  },
});