import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Car, Home, GraduationCap, Plane, PiggyBank, Gift, Smartphone, Heart, ShoppingCart, Plus, X, Calendar } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCurrency } from '@/contexts/CurrencyContext';

interface Goal {
  id: number;
  title: string;
  targetAmount: number;
  savedAmount: number;
  deadline: string;
  createdAt: string;
  icon: string;
  description?: string;
}

export default function GoalsScreen() {
  const { formatAmount } = useCurrency();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [updateAmount, setUpdateAmount] = useState('');
  
  // Form states
  const [goalTitle, setGoalTitle] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [goalDeadline, setGoalDeadline] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('car');
  const [description, setDescription] = useState('');

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      const goalsData = await AsyncStorage.getItem('goals');
      if (goalsData) {
        setGoals(JSON.parse(goalsData));
      } else {
        // Set default goals with saved amounts
        const defaultGoals = [
          {
            id: 1,
            title: 'Vacation Fund',
            targetAmount: 2000,
            savedAmount: 1200,
            deadline: '2024-12-31',
            createdAt: new Date().toISOString(),
            icon: 'plane',
            description: 'Summer vacation to Europe'
          },
          {
            id: 2,
            title: 'Emergency Fund',
            targetAmount: 1000,
            savedAmount: 500,
            deadline: '2024-08-31',
            createdAt: new Date().toISOString(),
            icon: 'piggybank',
            description: 'Emergency savings for unexpected expenses'
          },
          {
            id: 3,
            title: 'Down Payment',
            targetAmount: 5000,
            savedAmount: 2500,
            deadline: '2025-06-30',
            createdAt: new Date().toISOString(),
            icon: 'home',
            description: 'Down payment for new house'
          }
        ];
        setGoals(defaultGoals);
        await AsyncStorage.setItem('goals', JSON.stringify(defaultGoals));
      }
    } catch (error) {
      console.error('Error loading goals:', error);
    }
  };

  const createGoal = async () => {
    const amount = parseFloat(goalAmount);
    
    if (!goalTitle || isNaN(amount) || amount <= 0 || !goalDeadline) {
      Alert.alert('Invalid Input', 'Please fill in all required fields with valid values');
      return;
    }

    const newGoal: Goal = {
      id: Date.now(),
      title: goalTitle,
      targetAmount: amount,
      savedAmount: 0,
      deadline: goalDeadline,
      createdAt: new Date().toISOString(),
      icon: selectedIcon,
      description: description.trim() || undefined,
    };

    const updatedGoals = [...goals, newGoal];
    setGoals(updatedGoals);
    
    try {
      await AsyncStorage.setItem('goals', JSON.stringify(updatedGoals));
    } catch (error) {
      console.error('Error saving goal:', error);
    }

    resetForm();
    setModalVisible(false);
  };

  const updateGoalSavings = async () => {
    if (!selectedGoal) return;
    
    const amount = parseFloat(updateAmount);
    if (isNaN(amount) || amount < 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    const updatedGoals = goals.map(goal => 
      goal.id === selectedGoal.id 
        ? { ...goal, savedAmount: amount }
        : goal
    );

    setGoals(updatedGoals);
    
    try {
      await AsyncStorage.setItem('goals', JSON.stringify(updatedGoals));
    } catch (error) {
      console.error('Error updating goal:', error);
    }

    setUpdateModalVisible(false);
    setSelectedGoal(null);
    setUpdateAmount('');
  };

  const resetForm = () => {
    setGoalTitle('');
    setGoalAmount('');
    setGoalDeadline('');
    setSelectedIcon('car');
    setDescription('');
  };

  const calculateProgress = (goal: Goal) => {
    return Math.min(100, (goal.savedAmount / goal.targetAmount) * 100);
  };

  const getGoalIcon = (iconName: string) => {
    const iconProps = { size: 24, color: '#4A9EFF' };
    
    switch (iconName) {
      case 'car': return <Car {...iconProps} />;
      case 'home': return <Home {...iconProps} />;
      case 'graduation': return <GraduationCap {...iconProps} />;
      case 'plane': return <Plane {...iconProps} />;
      case 'piggybank': return <PiggyBank {...iconProps} />;
      case 'gift': return <Gift {...iconProps} />;
      case 'smartphone': return <Smartphone {...iconProps} />;
      case 'heart': return <Heart {...iconProps} />;
      case 'shopping': return <ShoppingCart {...iconProps} />;
      default: return <Car {...iconProps} />;
    }
  };

  const iconOptions = [
    { name: 'car', icon: Car, label: 'Car' },
    { name: 'home', icon: Home, label: 'Home' },
    { name: 'graduation', icon: GraduationCap, label: 'Education' },
    { name: 'plane', icon: Plane, label: 'Travel' },
    { name: 'piggybank', icon: PiggyBank, label: 'Savings' },
    { name: 'gift', icon: Gift, label: 'Gift' },
    { name: 'smartphone', icon: Smartphone, label: 'Electronics' },
    { name: 'heart', icon: Heart, label: 'Health' },
    { name: 'shopping', icon: ShoppingCart, label: 'Shopping' },
  ];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

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
            const progress = calculateProgress(goal);
            return (
              <TouchableOpacity
                key={goal.id}
                style={styles.goalCard}
                onPress={() => {
                  setSelectedGoal(goal);
                  setUpdateAmount(goal.savedAmount.toString());
                  setUpdateModalVisible(true);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.goalHeader}>
                  <View style={styles.goalIconContainer}>
                    {getGoalIcon(goal.icon)}
                  </View>
                  <View style={styles.goalInfo}>
                    <View style={styles.goalTitleRow}>
                      <Text style={styles.goalTitle}>{goal.title}</Text>
                      <Text style={styles.goalAmount}>{formatAmount(goal.savedAmount)}</Text>
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
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Goal Creation Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => {
                setModalVisible(false);
                resetForm();
              }}
            >
              <X size={24} color="#8B9DC3" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Goal</Text>
            <View style={styles.spacer} />
          </View>

          {/* Modal Content */}
          <ScrollView style={styles.modalContent} contentContainerStyle={styles.formContainer}>
            {/* Goal Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Goal name</Text>
              <TextInput
                style={styles.textInput}
                value={goalTitle}
                onChangeText={setGoalTitle}
                placeholder="e.g., New Car"
                placeholderTextColor="#8B9DC3"
              />
            </View>

            {/* Target Amount */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Target amount</Text>
              <View style={styles.amountInputContainer}>
                <Text style={styles.dollarSign}>$</Text>
                <TextInput
                  style={styles.amountInput}
                  value={goalAmount}
                  onChangeText={setGoalAmount}
                  placeholder="20,000"
                  placeholderTextColor="#8B9DC3"
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Target Date */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Target date</Text>
              <View style={styles.dateInputContainer}>
                <TextInput
                  style={styles.dateInput}
                  value={goalDeadline}
                  onChangeText={setGoalDeadline}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#8B9DC3"
                />
                <Calendar size={20} color="#8B9DC3" style={styles.calendarIcon} />
              </View>
            </View>

            {/* Icon Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Select an icon</Text>
              <View style={styles.iconGrid}>
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
                      size={24} 
                      color={selectedIcon === option.name ? '#4A9EFF' : '#8B9DC3'} 
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description (optional)</Text>
              <TextInput
                style={styles.textAreaInput}
                value={description}
                onChangeText={setDescription}
                placeholder="A brief description of your goal"
                placeholderTextColor="#8B9DC3"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          {/* Modal Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.createButton}
              onPress={createGoal}
            >
              <Text style={styles.createButtonText}>Create Goal</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Update Savings Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={updateModalVisible}
        onRequestClose={() => setUpdateModalVisible(false)}
      >
        <View style={styles.updateModalOverlay}>
          <View style={styles.updateModalContent}>
            <View style={styles.updateModalHeader}>
              <Text style={styles.updateModalTitle}>Update Savings</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setUpdateModalVisible(false)}
              >
                <X size={20} color="#8B9DC3" />
              </TouchableOpacity>
            </View>
            
            {selectedGoal && (
              <>
                <Text style={styles.updateModalSubtitle}>
                  {selectedGoal.title}
                </Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Current saved amount</Text>
                  <View style={styles.amountInputContainer}>
                    <Text style={styles.dollarSign}>$</Text>
                    <TextInput
                      style={styles.amountInput}
                      value={updateAmount}
                      onChangeText={setUpdateAmount}
                      placeholder="0"
                      placeholderTextColor="#8B9DC3"
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={styles.updateModalButtons}>
                  <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={() => setUpdateModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.updateButton}
                    onPress={updateGoalSavings}
                  >
                    <Text style={styles.updateButtonText}>Update</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
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
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#0F1621',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    justifyContent: 'space-between',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  modalContent: {
    flex: 1,
  },
  formContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8B9DC3',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#111C2A',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111C2A',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dollarSign: {
    fontSize: 16,
    color: '#8B9DC3',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111C2A',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dateInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
  },
  calendarIcon: {
    marginLeft: 8,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  iconOption: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#111C2A',
    borderWidth: 2,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedIconOption: {
    borderColor: '#4A9EFF',
  },
  textAreaInput: {
    backgroundColor: '#111C2A',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalFooter: {
    padding: 16,
  },
  createButton: {
    backgroundColor: '#4A9EFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  // Update modal styles
  updateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  updateModalContent: {
    backgroundColor: '#0F1621',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  updateModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  updateModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  updateModalSubtitle: {
    fontSize: 16,
    color: '#8B9DC3',
    marginBottom: 24,
  },
  updateModalButtons: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 24,
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
  updateButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#4A9EFF',
    alignItems: 'center',
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});