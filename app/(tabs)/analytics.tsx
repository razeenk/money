import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Briefcase, Shield, Home, Plus, X } from 'lucide-react-native';
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

interface Goal {
  id: number;
  title: string;
  targetAmount: number;
  deadline: string;
  createdAt: string;
  icon: string;
}

export default function GoalsScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalSavings, setTotalSavings] = useState(0);
  const { formatAmount } = useCurrency();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [goalDeadline, setGoalDeadline] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('briefcase');

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
      } else {
        // Set default goals if none exist
        const defaultGoals = [
          {
            id: 1,
            title: 'Vacation Fund',
            targetAmount: 2000,
            deadline: '2024-12-31',
            createdAt: new Date().toISOString(),
            icon: 'briefcase'
          },
          {
            id: 2,
            title: 'Emergency Fund',
            targetAmount: 1000,
            deadline: '2024-08-31',
            createdAt: new Date().toISOString(),
            icon: 'shield'
          },
          {
            id: 3,
            title: 'Down Payment',
            targetAmount: 5000,
            deadline: '2025-06-30',
            createdAt: new Date().toISOString(),
            icon: 'home'
          }
        ];
        setGoals(defaultGoals);
        await AsyncStorage.setItem('goals', JSON.stringify(defaultGoals));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
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
      icon: selectedIcon,
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
    setSelectedIcon('briefcase');
  };

  const calculateGoalProgress = (goal: Goal) => {
    const progress = Math.min(100, (totalSavings / goal.targetAmount) * 100);
    return {
      progress,
      currentAmount: Math.min(totalSavings, goal.targetAmount),
    };
  };

  const getGoalIcon = (iconName: string) => {
    const iconProps = { size: 24, color: '#4A9EFF' };
    
    switch (iconName) {
      case 'briefcase':
        return <Briefcase {...iconProps} />;
      case 'shield':
        return <Shield {...iconProps} />;
      case 'home':
        return <Home {...iconProps} />;
      default:
        return <Briefcase {...iconProps} />;
    }
  };

  const iconOptions = [
    { name: 'briefcase', icon: Briefcase, label: 'Briefcase' },
    { name: 'shield', icon: Shield, label: 'Shield' },
    { name: 'home', icon: Home, label: 'Home' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.spacer} />
        <Text style={styles.headerTitle}>Goals</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Plus size={24} color="#4A9EFF" />
        </TouchableOpacity>
      </View>

      {/* Goals List */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.goalsContainer}>
          {goals.map((goal) => {
            const { progress, currentAmount } = calculateGoalProgress(goal);
            return (
              <View key={goal.id} style={styles.goalCard}>
                <View style={styles.goalHeader}>
                  <View style={styles.goalIconContainer}>
                    {getGoalIcon(goal.icon)}
                  </View>
                  <View style={styles.goalInfo}>
                    <View style={styles.goalTitleRow}>
                      <Text style={styles.goalTitle}>{goal.title}</Text>
                      <Text style={styles.goalAmount}>{formatAmount(currentAmount)}</Text>
                    </View>
                    <View style={styles.goalSubtitleRow}>
                      <Text style={styles.goalTarget}>of {formatAmount(goal.targetAmount)}</Text>
                      <Text style={styles.goalPercentage}>{progress.toFixed(0)}%</Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { width: `${Math.min(100, progress)}%` }
                      ]} 
                    />
                  </View>
                </View>
              </View>
            );
          })}
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
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Goal</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <X size={24} color="#8B9DC3" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Goal Title</Text>
              <TextInput
                style={styles.textInput}
                value={goalTitle}
                onChangeText={setGoalTitle}
                placeholder="e.g., Vacation Fund"
                placeholderTextColor="#8B9DC3"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Target Amount</Text>
              <TextInput
                style={styles.textInput}
                value={goalAmount}
                onChangeText={setGoalAmount}
                placeholder="0.00"
                placeholderTextColor="#8B9DC3"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Deadline (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.textInput}
                value={goalDeadline}
                onChangeText={setGoalDeadline}
                placeholder="2024-12-31"
                placeholderTextColor="#8B9DC3"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Icon</Text>
              <View style={styles.iconSelector}>
                {iconOptions.map((option) => (
                  <TouchableOpacity
                    key={option.name}
                    style={[
                      styles.iconOption,
                      selectedIcon === option.name && styles.selectedIconOption
                    ]}
                    onPress={() => setSelectedIcon(option.name)}
                  >
                    <option.icon 
                      size={20} 
                      color={selectedIcon === option.name ? '#4A9EFF' : '#8B9DC3'} 
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => {
                  setModalVisible(false);
                  setGoalTitle('');
                  setGoalAmount('');
                  setGoalDeadline('');
                  setSelectedIcon('briefcase');
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
    backgroundColor: '#0F1621',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    justifyContent: 'space-between',
  },
  spacer: {
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(74, 158, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  goalsContainer: {
    gap: 24,
  },
  goalCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  goalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(74, 158, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalInfo: {
    flex: 1,
  },
  goalTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  goalAmount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  goalSubtitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalTarget: {
    fontSize: 14,
    color: '#8B9DC3',
  },
  goalPercentage: {
    fontSize: 14,
    color: '#8B9DC3',
  },
  progressBarContainer: {
    marginTop: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#2A3F54',
    borderRadius: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4A9EFF',
    borderRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#0F1621',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 4,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#8B9DC3',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#2A3F54',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#FFFFFF',
    backgroundColor: '#111C2A',
  },
  iconSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#111C2A',
    borderWidth: 1,
    borderColor: '#2A3F54',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedIconOption: {
    borderColor: '#4A9EFF',
    backgroundColor: 'rgba(74, 158, 255, 0.1)',
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
    borderColor: '#2A3F54',
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