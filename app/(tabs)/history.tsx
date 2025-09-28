import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, X } from 'lucide-react-native';
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
  const [selectedCategory, setSelectedCategory] = useState<CategoryData | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedMonthData, setSelectedMonthData] = useState<any>(null);
  const [monthDetailsVisible, setMonthDetailsVisible] = useState(false);
  const { formatAmount } = useCurrency();

  useEffect(() => {
    loadTransactions();
  }, []);

  // Add focus listener to reload data when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadTransactions();
    });
    return unsubscribe;
  }, [navigation]);

  // Reload data when report type or time filter changes
  useEffect(() => {
    loadTransactions();
  }, [reportType, timeFilter]);
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

  const getMonthCategoryData = (monthIndex: number) => {
    const currentYear = new Date().getFullYear();
    const filtered = getFilteredTransactions().filter(t => {
      const date = new Date(t.date);
      return date.getMonth() === monthIndex && date.getFullYear() === currentYear;
    });

    const categoryTotals: { [key: string]: number } = {};
    filtered.forEach(t => {
      const category = t.category || 'Other';
      categoryTotals[category] = (categoryTotals[category] || 0) + t.amount;
    });

    const total = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);
    
    return {
      categories: Object.entries(categoryTotals)
        .map(([name, amount]) => ({
          name,
          amount,
          percentage: total > 0 ? (amount / total) * 100 : 0
        }))
        .sort((a, b) => b.amount - a.amount),
      total,
      month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][monthIndex]
    };
  };

  // Category colors mapping
  const getCategoryColor = (categoryName: string, index: number) => {
    const colors = [
      '#4A9EFF', // Blue
      '#FF6B6B', // Red
      '#4ECDC4', // Teal
      '#45B7D1', // Light Blue
      '#96CEB4', // Green
      '#FFEAA7', // Yellow
      '#DDA0DD', // Plum
      '#98D8C8', // Mint
      '#F7DC6F', // Light Yellow
      '#BB8FCE', // Light Purple
    ];
    return colors[index % colors.length];
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

  const getDetailedCategoryData = (): CategoryData[] => {
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
      .sort((a, b) => b.amount - a.amount);
  };

  const handleCategoryPress = (category: CategoryData) => {
    setSelectedCategory(category);
    setDetailsVisible(true);
  };

  const handleMonthPress = (monthData: any, monthIndex: number) => {
    const categoryData = getMonthCategoryData(monthIndex);
    setSelectedMonthData({
      ...monthData,
      ...categoryData
    });
    setMonthDetailsVisible(true);
  };

  const monthlyData = getMonthlyData();
  const maxAmount = Math.max(...monthlyData.map(d => d.amount));
  const categoryData = getCategoryData();
  const detailedCategoryData = getDetailedCategoryData();
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


        {/* Month Details Modal */}
        <Modal
          visible={monthDetailsVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setMonthDetailsVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <Pressable style={styles.overlayDismiss} onPress={() => setMonthDetailsVisible(false)} />
            <View style={styles.detailsModal}>
              <View style={styles.detailsHeader}>
                <Text style={styles.detailsTitle}>
                  {selectedMonthData?.month} {reportType === 'spending' ? 'Spending' : 'Income'}
                </Text>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setMonthDetailsVisible(false)}
                >
                  <X size={20} color="#8B9DC3" />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.detailsSubtitle}>
                Total: {selectedMonthData?.total ? formatAmount(selectedMonthData.total) : '$0.00'}
              </Text>

              <ScrollView style={styles.detailsList} showsVerticalScrollIndicator={false}>
                {selectedMonthData?.categories?.map((category: any, index: number) => (
                  <View key={category.name} style={styles.detailsItem}>
                    <View style={styles.detailsItemLeft}>
                      <View 
                        style={[
                          styles.categoryColorDot, 
                          { backgroundColor: getCategoryColor(category.name, index) }
                        ]} 
                      />
                      <Text style={styles.detailsCategoryName}>{category.name}</Text>
                    </View>
                    <View style={styles.detailsItemRight}>
                      <Text style={styles.detailsAmount}>{formatAmount(category.amount)}</Text>
                      <Text style={styles.detailsPercentage}>{category.percentage.toFixed(1)}%</Text>
                    </View>
                  </View>
                )) || (
                  <Text style={styles.emptyText}>No transactions for this month</Text>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
          {/* Bar Chart */}
          <View style={styles.barChart}>
            {monthlyData.map((data, index, array) => {
              const height = maxAmount > 0 ? (data.amount / maxAmount) * 100 : 0;
              const isCurrentMonth = index === array.length - 1;
              const actualMonthIndex = new Date().getMonth() - (array.length - 1 - index);
              const monthCategoryData = getMonthCategoryData(actualMonthIndex);
              
              return (
                <TouchableOpacity 
                  key={data.month} 
                  style={styles.barContainer}
                  onPress={() => handleMonthPress(data, actualMonthIndex)}
                  activeOpacity={0.7}
                >
                  <View style={styles.barWrapper}>
                    {monthCategoryData.categories.length > 0 ? (
                      <View style={[styles.bar, { height: `${Math.max(height, 5)}%` }]}>
                        {monthCategoryData.categories.map((category, catIndex) => {
                          const categoryHeight = (category.amount / data.amount) * 100;
                          return (
                            <View
                              key={category.name}
                              style={[
                                styles.barSegment,
                                {
                                  height: `${categoryHeight}%`,
                                  backgroundColor: getCategoryColor(category.name, catIndex),
                                }
                              ]}
                            />
                          );
                        })}
                      </View>
                    ) : (
                      <View 
                        style={[
                          styles.bar,
                          isCurrentMonth ? styles.activeBar : styles.inactiveBar,
                          { height: `${Math.max(height, 5)}%` }
                        ]} 
                      />
                    )}
                  </View>
                  <Text style={styles.barAmount}>{formatAmount(data.amount)}</Text>
                  <Text style={[styles.barLabel, isCurrentMonth && styles.activeBarLabel]}>
                    {data.month}
                  </Text>
                </TouchableOpacity>
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
              <TouchableOpacity 
                key={category.name} 
                style={styles.categoryItem}
                onPress={() => handleCategoryPress(category)}
                activeOpacity={0.7}
              >
                <Text style={styles.categoryName}>{category.name}</Text>
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { 
                          width: `${category.percentage}%`,
                          backgroundColor: getCategoryColor(category.name, index)
                        }
                      ]} 
                    />
                  </View>
                </View>
                <Text style={styles.categoryAmount}>{formatAmount(category.amount)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Category Details Modal */}
      <Modal
        visible={detailsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.overlayDismiss} onPress={() => setDetailsVisible(false)} />
          <View style={styles.detailsModal}>
            <View style={styles.detailsHeader}>
              <Text style={styles.detailsTitle}>
                {reportType === 'spending' ? 'Spending' : 'Income'} Breakdown
              </Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setDetailsVisible(false)}
              >
                <X size={20} color="#8B9DC3" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.detailsSubtitle}>
              {getTimeFilterLabel()} • Total: {formatAmount(totalAmount)}
            </Text>

            <ScrollView style={styles.detailsList} showsVerticalScrollIndicator={false}>
              {detailedCategoryData.map((category, index) => (
                <View key={category.name} style={styles.detailsItem}>
                  <View style={styles.detailsItemLeft}>
                    <View 
                      style={[
                        styles.categoryColorDot, 
                        { backgroundColor: getCategoryColor(category.name, index) }
                      ]} 
                    />
                    <Text style={styles.detailsCategoryName}>{category.name}</Text>
                  </View>
                  <View style={styles.detailsItemRight}>
                    <Text style={styles.detailsAmount}>{formatAmount(category.amount)}</Text>
                    <Text style={styles.detailsPercentage}>{category.percentage.toFixed(1)}%</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    flexDirection: 'column',
    justifyContent: 'flex-end',
  },
  barSegment: {
    width: '100%',
    borderRadius: 2,
  },
  activeBar: {
    backgroundColor: '#4A9EFF',
  },
  inactiveBar: {
    backgroundColor: 'rgba(74, 158, 255, 0.3)',
  },
  barAmount: {
    fontSize: 10,
    color: '#8B9DC3',
    textAlign: 'center',
    marginBottom: 2,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayDismiss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  detailsModal: {
    backgroundColor: '#0F1621',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 4,
  },
  detailsSubtitle: {
    fontSize: 16,
    color: '#8B9DC3',
    marginBottom: 20,
  },
  detailsList: {
    maxHeight: 400,
  },
  detailsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 157, 195, 0.1)',
  },
  detailsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  detailsCategoryName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  detailsItemRight: {
    alignItems: 'flex-end',
  },
  detailsAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  detailsPercentage: {
    fontSize: 16,
    color: '#8B9DC3',
  },
  emptyText: {
    fontSize: 16,
    color: '#8B9DC3',
    textAlign: 'center',
    padding: 20,
  },
});