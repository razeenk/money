import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Target, Calendar, TrendingUp, Plus } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Transaction {
  id: number;
  amount: number;
  type: 'add' | 'subtract';
  date: string;
  payee?: string;
  category?: string;
  notes?: string;
}

interface Goal {
  id: number;
  title: string;
  targetAmount: number;
  deadline: string;
  createdAt: string;
}

export default function AnalyticsScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalSavings, setTotalSavings] = useState(0);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [goalDeadline, setGoalDeadline] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load transactions
      const transactionsData = await AsyncStorage.getItem('transactions');
      if (transactionsData) {
        const parsedTransactions = JSON.parse(transactionsData);
        setTransactions(parsedTransactions);
        
        // Calculate total savings from transactions
        const totalSavings = parsedTransactions.reduce((sum: number, transaction: Transaction) => {
          return transaction.type === 'add' ? sum + transaction.amount : sum - transaction.amount;
        }, 0);
        setTotalSavings(totalSavings);
      }

      // Load goals
      const goalsData = await AsyncStorage.getItem('goals');
      if (goalsData) {
        setGoals(JSON.parse(goalsData));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const calculateStats = () => {
    const now = new Date();
    const thisMonth = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate.getMonth() === now.getMonth() && 
             transactionDate.getFullYear() === now.getFullYear();
    });

    const thisWeek = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return transactionDate >= weekAgo;
    });

    const monthlyIncome = thisMonth.filter(t => t.type === 'add').reduce((sum, t) => sum + t.amount, 0);
    const monthlyExpenses = thisMonth.filter(t => t.type === 'subtract').reduce((sum, t) => sum + t.amount, 0);
    const weeklyIncome = thisWeek.filter(t => t.type === 'add').reduce((sum, t) => sum + t.amount, 0);

    return { monthlyIncome, monthlyExpenses, weeklyIncome };
  };

  const createGoal = async () => {
    const amount = parseFloat(goalAmount);
    
    if (!goalTitle || isNaN(amount) || amount <= 0 || !goalDeadline) {
      Alert.alert('Invalid Input', 'Please fill in all fields with valid values');
      return;
    }

    const newGoal: Goal = {
      id: Date.now(),
      title: goalTitle,
      targetAmount: amount,
      deadline: goalDeadline,
      createdAt: new Date().toISOString(),
    };

    const updatedGoals = [...goals, newGoal];
    setGoals(updatedGoals);
    
    try {
      await AsyncStorage.setItem('goals', JSON.stringify(updatedGoals));
    } catch (error) {
      console.error('Error saving goal:', error);
    }

    setModalVisible(false);
    setGoalTitle('');
    setGoalAmount('');
    setGoalDeadline('');
  };

  const calculateGoalProgress = (goal: Goal) => {
    const remaining = Math.max(0, goal.targetAmount - totalSavings);
    const deadline = new Date(goal.deadline);
    const now = new Date();
    const daysRemaining = Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    
    const dailyTarget = daysRemaining > 0 ? remaining / daysRemaining : 0;
    const weeklyTarget = dailyTarget * 7;
    const monthlyTarget = dailyTarget * 30;

    return {
      remaining,
      daysRemaining,
      dailyTarget,
      weeklyTarget,
      monthlyTarget,
      progress: Math.min(100, (totalSavings / goal.targetAmount) * 100),
    };
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const stats = calculateStats();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Analytics</Text>

        {/* Stats Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>This Month</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Income</Text>
              <Text style={[styles.statValue, { color: '#000000' }]}>
                {formatAmount(stats.monthlyIncome)}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Expenses</Text>
              <Text style={[styles.statValue, { color: '#666666' }]}>
                {formatAmount(stats.monthlyExpenses)}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>This Week</Text>
              <Text style={styles.statValue}>
                {formatAmount(stats.weeklyIncome)}
              </Text>
            </View>
          </View>
        </View>

        {/* Goals Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Goals</Text>
            <TouchableOpacity 
              style={styles.addGoalButton}
              onPress={() => setModalVisible(true)}
            >
              <Plus size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {goals.length === 0 ? (
            <View style={styles.emptyState}>
              <Target size={48} color="#E5E5E5" />
              <Text style={styles.emptyText}>No goals set yet</Text>
              <Text style={styles.emptySubtext}>Create your first savings goal</Text>
            </View>
          ) : (
            <View style={styles.goalsContainer}>
              {goals.map((goal) => {
                const progress = calculateGoalProgress(goal);
                return (
                  <View key={goal.id} style={styles.goalCard}>
                    <View style={styles.goalHeader}>
                      <Text style={styles.goalTitle}>{goal.title}</Text>
                      <Text style={styles.goalProgress}>{progress.progress.toFixed(1)}%</Text>
                    </View>
                    
                    <View style={styles.progressBar}>
                      <View 
                        style={[
                          styles.progressFill, 
                          { width: `${Math.min(100, progress.progress)}%` }
                        ]} 
                      />
                    </View>

                    <View style={styles.goalStats}>
                      <Text style={styles.goalAmount}>
                        {formatAmount(totalSavings)} / {formatAmount(goal.targetAmount)}
                      </Text>
                      <Text style={styles.goalDeadline}>
                        {progress.daysRemaining} days left
                      </Text>
                    </View>

                    {progress.remaining > 0 && (
                      <View style={styles.savingTargets}>
                        <View style={styles.targetItem}>
                          <Text style={styles.targetLabel}>Daily</Text>
                          <Text style={styles.targetAmount}>{formatAmount(progress.dailyTarget)}</Text>
                        </View>
                        <View style={styles.targetItem}>
                          <Text style={styles.targetLabel}>Weekly</Text>
                          <Text style={styles.targetAmount}>{formatAmount(progress.weeklyTarget)}</Text>
                        </View>
                        <View style={styles.targetItem}>
                          <Text style={styles.targetLabel}>Monthly</Text>
                          <Text style={styles.targetAmount}>{formatAmount(progress.monthlyTarget)}</Text>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Goal Creation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set New Goal</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Goal Title</Text>
              <TextInput
                style={styles.textInput}
                value={goalTitle}
                onChangeText={setGoalTitle}
                placeholder="e.g., Vacation Fund"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Target Amount</Text>
              <View style={styles.amountInputContainer}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  value={goalAmount}
                  onChangeText={setGoalAmount}
                  placeholder="0.00"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Deadline (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.textInput}
                value={goalDeadline}
                onChangeText={setGoalDeadline}
                placeholder="2024-12-31"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => {
                  setModalVisible(false);
                  setGoalTitle('');
                  setGoalAmount('');
                  setGoalDeadline('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.confirmButton}
                onPress={createGoal}
              >
                <Text style={styles.confirmButtonText}>Create Goal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E2A3A',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 100,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  addGoalButton: {
    backgroundColor: '#4A9EFF',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statCard: {
    backgroundColor: '#2A3F54',
    padding: 16,
    borderRadius: 12,
    flex: 1,
    minWidth: 100,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: '#8B9DC3',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8B9DC3',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8B9DC3',
    marginTop: 4,
  },
  goalsContainer: {
    gap: 16,
  },
  goalCard: {
    backgroundColor: '#2A3F54',
    padding: 20,
    borderRadius: 12,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  goalProgress: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4A9EFF',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#3A4F64',
    borderRadius: 3,
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4A9EFF',
    borderRadius: 3,
  },
  goalStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  goalAmount: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  goalDeadline: {
    fontSize: 14,
    color: '#8B9DC3',
  },
  savingTargets: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#3A4F64',
  },
  targetItem: {
    alignItems: 'center',
  },
  targetLabel: {
    fontSize: 12,
    color: '#8B9DC3',
    marginBottom: 4,
  },
  targetAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#2A3F54',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8B9DC3',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#3A4F64',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#FFFFFF',
    backgroundColor: '#1E2A3A',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A4F64',
    borderRadius: 8,
    paddingLeft: 12,
    backgroundColor: '#1E2A3A',
  },
  currencySymbol: {
    fontSize: 16,
    color: '#8B9DC3',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    padding: 12,
    paddingLeft: 0,
    fontSize: 16,
    color: '#FFFFFF',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3A4F64',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#8B9DC3',
    fontSize: 16,
    fontWeight: '500',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#4A9EFF',
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});