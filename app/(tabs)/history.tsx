import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCurrency } from '@/contexts/CurrencyContext';

interface Transaction {
  id: number;
  amount: number;
  type: 'add' | 'subtract';
  date: string;
  payee?: string;
  category?: string;
  notes?: string;
}

interface CategoryData {
  name: string;
  amount: number;
  percentage: number;
}

export default function ReportsScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [reportType, setReportType] = useState<'spending' | 'income'>('spending');
  const [timeFilter, setTimeFilter] = useState<'all' | 'last30' | 'thisYear'>('all');
  const { formatAmount } = useCurrency();

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const transactionsData = await AsyncStorage.getItem('transactions');
      if (transactionsData) {
        const parsedTransactions = JSON.parse(transactionsData);
        setTransactions(parsedTransactions);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const getFilteredTransactions = () => {
    const now = new Date();
    let filtered = transactions.filter(t => t.type === (reportType === 'spending' ? 'subtract' : 'add'));

    switch (timeFilter) {
      case 'last30':
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(t => new Date(t.date) >= thirtyDaysAgo);
        break;
      case 'thisYear':
        filtered = filtered.filter(t => new Date(t.date).getFullYear() === now.getFullYear());
        break;
      default:
        break;
    }

    return filtered;
  };

  const getTotalAmount = () => {
    return getFilteredTransactions().reduce((sum, t) => sum + t.amount, 0);
  };

  const getMonthlyData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    const filtered = getFilteredTransactions();

    const monthlyData = months.map((month, index) => {
      const monthTransactions = filtered.filter(t => {
        const date = new Date(t.date);
        return date.getMonth() === index && date.getFullYear() === currentYear;
      });
      const amount = monthTransactions.reduce((sum, t) => sum + t.amount, 0);
      return { month, amount };
    });

    // Only show last 6 months for better visualization
    const currentMonth = new Date().getMonth();
    const startMonth = Math.max(0, currentMonth - 5);
    return monthlyData.slice(startMonth, currentMonth + 1);
  };

  const getCategoryData = (): CategoryData[] => {
    const filtered = getFilteredTransactions();
    const categoryTotals: { [key: string]: number } = {};

    filtered.forEach(t => {
      const category = t.category || 'Other';
      categoryTotals[category] = (categoryTotals[category] || 0) + t.amount;
    });

    const total = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);

    return Object.entries(categoryTotals)
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4);
  };

  const monthlyData = getMonthlyData();
  const maxAmount = Math.max(...monthlyData.map(d => d.amount));
  const categoryData = getCategoryData();
  const totalAmount = getTotalAmount();
  
  const getCurrentMonthChange = () => {
    const now = new Date();
    const currentMonth = transactions.filter(t => {
      const date = new Date(t.date);
      return date.getMonth() === now.getMonth() && 
             date.getFullYear() === now.getFullYear() &&
             t.type === (reportType === 'spending' ? 'subtract' : 'add');
    });
    
    const lastMonth = transactions.filter(t => {
      const date = new Date(t.date);
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return date.getMonth() === lastMonthDate.getMonth() && 
             date.getFullYear() === lastMonthDate.getFullYear() &&
             t.type === (reportType === 'spending' ? 'subtract' : 'add');
    });
    
    const currentTotal = currentMonth.reduce((sum, t) => sum + t.amount, 0);
    const lastTotal = lastMonth.reduce((sum, t) => sum + t.amount, 0);
    
    if (lastTotal === 0) return 0;
    return ((currentTotal - lastTotal) / lastTotal) * 100;
  };

  const monthChange = getCurrentMonthChange();
  const getTimeFilterLabel = () => {
    switch (timeFilter) {
      case 'last30': return 'Last 30 days';
      case 'thisYear': return 'This year';
      default: return 'All time';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton}>
          <ChevronLeft size={24} color="#8B9DC3" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reports</Text>
        <View style={styles.spacer} />
      </View>

      {/* Report Type Toggle */}
      <View style={styles.toggleContainer}>
        <View style={styles.toggleWrapper}>
          <TouchableOpacity 
            style={[styles.toggleButton, reportType === 'spending' && styles.activeToggle]}
            onPress={() => setReportType('spending')}
          >
            <Text style={[styles.toggleText, reportType === 'spending' && styles.activeToggleText]}>
              Spending
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toggleButton, reportType === 'income' && styles.activeToggle]}
            onPress={() => setReportType('income')}
          >
            <Text style={[styles.toggleText, reportType === 'income' && styles.activeToggleText]}>
              Income
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Time Filter Buttons */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          <TouchableOpacity 
            style={[styles.filterButton, timeFilter === 'all' && styles.activeFilter]}
            onPress={() => setTimeFilter('all')}
          >
            <Text style={[styles.filterText, timeFilter === 'all' && styles.activeFilterText]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, timeFilter === 'last30' && styles.activeFilter]}
            onPress={() => setTimeFilter('last30')}
          >
            <Text style={[styles.filterText, timeFilter === 'last30' && styles.activeFilterText]}>Last 30 days</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, timeFilter === 'thisYear' && styles.activeFilter]}
            onPress={() => setTimeFilter('thisYear')}
          >
            <Text style={[styles.filterText, timeFilter === 'thisYear' && styles.activeFilterText]}>This year</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Chart Section */}
        <View style={styles.chartContainer}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartLabel}>{reportType === 'spending' ? 'Spending' : 'Income'}</Text>
            <Text style={styles.chartAmount}>{formatAmount(totalAmount)}</Text>
            <View style={styles.chartSubInfo}>
              <Text style={styles.chartPeriod}>{getTimeFilterLabel()}</Text>
              {monthChange !== 0 && (
                <Text style={[
                  styles.chartChange, 
                  { color: monthChange > 0 ? '#FF5A5F' : '#4CAF50' }
                ]}>
                  {monthChange > 0 ? '+' : ''}{monthChange.toFixed(1)}%
                </Text>
              )}
            </View>
          </View>

          {/* Bar Chart */}
          <View style={styles.barChart}>
            {monthlyData.map((data, index) => {
              const height = maxAmount > 0 ? (data.amount / maxAmount) * 100 : 0;
              const isCurrentMonth = index === monthlyData.length - 1; // Current month is highlighted
              
              return (
                <View key={data.month} style={styles.barContainer}>
                  <View style={styles.barWrapper}>
                    <View 
                      style={[
                        styles.bar,
                        isCurrentMonth ? styles.activeBar : styles.inactiveBar,
                        { height: `${Math.max(height, 5)}%` }
                      ]} 
                    />
                  </View>
                  <Text style={[styles.barLabel, isCurrentMonth && styles.activeBarLabel]}>
                    {data.month}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Category Breakdown */}
        <View style={styles.categorySection}>
          <Text style={styles.sectionTitle}>
            {reportType === 'spending' ? 'Spending' : 'Income'} by Category
          </Text>
          <View style={styles.categoryContainer}>
            {categoryData.map((category, index) => (
              <View key={category.name} style={styles.categoryItem}>
                <Text style={styles.categoryName}>{category.name}</Text>
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBar}>
                    <View 
                      style={[styles.progressFill, { width: `${category.percentage}%` }]} 
                    />
                  </View>
                </View>
                <Text style={styles.categoryAmount}>{formatAmount(category.amount)}</Text>
              </View>
            ))}
          </View>
        </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 157, 195, 0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  spacer: {
    width: 40,
  },
  toggleContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  toggleWrapper: {
    backgroundColor: 'rgba(139, 157, 195, 0.1)',
    borderRadius: 8,
    padding: 4,
    flexDirection: 'row',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeToggle: {
    backgroundColor: '#4A9EFF',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8B9DC3',
  },
  activeToggleText: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  filterContainer: {
    marginBottom: 24,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(74, 158, 255, 0.1)',
    marginRight: 12,
  },
  activeFilter: {
    backgroundColor: 'rgba(74, 158, 255, 0.2)',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4A9EFF',
  },
  activeFilterText: {
    color: '#4A9EFF',
  },
  chartContainer: {
    backgroundColor: 'rgba(139, 157, 195, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  chartHeader: {
    marginBottom: 24,
  },
  chartLabel: {
    fontSize: 14,
    color: '#8B9DC3',
    marginBottom: 4,
  },
  chartAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  chartSubInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chartPeriod: {
    fontSize: 14,
    color: '#8B9DC3',
  },
  chartChange: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FF5A5F',
  },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    gap: 12,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
  },
  barWrapper: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  bar: {
    width: '100%',
    borderRadius: 4,
    minHeight: 8,
  },
  activeBar: {
    backgroundColor: '#4A9EFF',
  },
  inactiveBar: {
    backgroundColor: 'rgba(74, 158, 255, 0.3)',
  },
  barLabel: {
    fontSize: 12,
    color: '#8B9DC3',
  },
  activeBarLabel: {
    color: '#4A9EFF',
  },
  categorySection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  categoryContainer: {
    backgroundColor: 'rgba(139, 157, 195, 0.05)',
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8B9DC3',
    width: 80,
  },
  progressBarContainer: {
    flex: 1,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(139, 157, 195, 0.2)',
    borderRadius: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4A9EFF',
    borderRadius: 4,
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    width: 60,
    textAlign: 'right',
  },
});