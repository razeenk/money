import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, Animated, Easing, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Car, Home, GraduationCap, Plane, PiggyBank, Gift, Smartphone, Heart, ShoppingCart, Plus, X, Calendar, ChevronLeft, ChevronRight, ArrowLeft, History, Trash2 } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCurrency } from '@/contexts/CurrencyContext';

interface Goal {
  id: string;
  title: string;
  targetAmount: number;
  savedAmount: number;
  deadline: string;
  createdAt: string;
  icon: string;
  description?: string;
}

interface GoalHistory {
  id: string;
  goalId: string;
  amount: number;
  date: string;
  type: 'add' | 'subtract';
}

export default function GoalsScreen() {
  const { formatAmount } = useCurrency();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalHistory, setGoalHistory] = useState<GoalHistory[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [addAmount, setAddAmount] = useState('');
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const animTranslate = useRef(new Animated.Value(0)).current;
  const animOpacity = useRef(new Animated.Value(1)).current;
  const calOverlayOpacity = useRef(new Animated.Value(0)).current;
  const calSheetTranslateY = useRef(new Animated.Value(24)).current;
  const calSheetOpacity = useRef(new Animated.Value(0)).current;
  
  // Form states
  const [goalTitle, setGoalTitle] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [goalDeadline, setGoalDeadline] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('car');
  const [description, setDescription] = useState('');

  useEffect(() => {
    loadGoals();
    loadGoalHistory();
  }, []);

  const loadGoals = async () => {
    try {
      const goalsData = await AsyncStorage.getItem('goals');
      if (goalsData) {
        setGoals(JSON.parse(goalsData));
      }
    } catch (error) {
      console.error('Error loading goals:', error);
    }
  };

  const loadGoalHistory = async () => {
    try {
      const historyData = await AsyncStorage.getItem('goalHistory');
      if (historyData) {
        setGoalHistory(JSON.parse(historyData));
      }
    } catch (error) {
      console.error('Error loading goal history:', error);
    }
  };

  const saveGoalHistory = async (newHistory: GoalHistory[]) => {
    try {
      await AsyncStorage.setItem('goalHistory', JSON.stringify(newHistory));
      setGoalHistory(newHistory);
    } catch (error) {
      console.error('Error saving goal history:', error);
    }
  };

  // Calendar helper functions
  const formatDate = (date: Date) => {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const parseDate = (value: string) => {
    const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) return new Date();
    const d = Math.min(31, Math.max(1, parseInt(match[1], 10)));
    const m = Math.min(12, Math.max(1, parseInt(match[2], 10))) - 1;
    const y = parseInt(match[3], 10);
    const dt = new Date(y, m, d);
    if (isNaN(dt.getTime())) return new Date();
    return dt;
  };

  const maskToDDMMYYYY = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, '').slice(0, 8);
    let out = '';
    if (digits.length <= 2) return digits;
    out = digits.slice(0, 2) + '/';
    if (digits.length <= 4) return out + digits.slice(2);
    out += digits.slice(2, 4) + '/';
    return out + digits.slice(4);
  };

  const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
  const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const addMonths = (date: Date, n: number) => new Date(date.getFullYear(), date.getMonth() + n, 1);
  const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const switchMonth = (delta: number) => {
    setCalendarMonth(prev => addMonths(prev, delta));
    animTranslate.setValue(delta * 32);
    animOpacity.setValue(0);
    Animated.parallel([
      Animated.timing(animTranslate, { toValue: 0, duration: 140, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(animOpacity, { toValue: 1, duration: 140, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  };

  const getMonthDaysGrid = (date: Date) => {
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    const daysInMonth = end.getDate();
    const firstWeekday = start.getDay();
    const grid: Date[] = [];
    
    for (let i = 0; i < firstWeekday; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() - (firstWeekday - i));
      grid.push(d);
    }
    
    for (let d = 1; d <= daysInMonth; d++) {
      grid.push(new Date(date.getFullYear(), date.getMonth(), d));
    }
    
    while (grid.length % 7 !== 0 || grid.length < 42) {
      const last = grid[grid.length - 1];
      const next = new Date(last);
      next.setDate(next.getDate() + 1);
      grid.push(next);
    }
    return grid;
  };

  useEffect(() => {
    if (datePickerVisible) {
      calOverlayOpacity.setValue(0);
      calSheetTranslateY.setValue(24);
      calSheetOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(calOverlayOpacity, { toValue: 1, duration: 120, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(calSheetTranslateY, { toValue: 0, duration: 160, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(calSheetOpacity, { toValue: 1, duration: 160, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }
  }, [datePickerVisible]);

  const closeCalendar = () => {
    Animated.parallel([
      Animated.timing(calOverlayOpacity, { toValue: 0, duration: 100, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(calSheetTranslateY, { toValue: 24, duration: 140, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(calSheetOpacity, { toValue: 0, duration: 140, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(() => setDatePickerVisible(false));
  };

  const createGoal = async () => {
    const amount = parseFloat(goalAmount);
    
    if (!goalTitle.trim()) {
      Alert.alert('Invalid Input', 'Please enter a goal name');
      return;
    }
    
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid target amount');
      return;
    }
    
    if (!goalDeadline.trim()) {
      Alert.alert('Invalid Input', 'Please select a target date');
      return;
    }

    const newGoal: Goal = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      title: goalTitle.trim(),
      targetAmount: amount,
      savedAmount: 0,
      deadline: parseDate(goalDeadline).toISOString(),
      createdAt: new Date().toISOString(),
      icon: selectedIcon,
      description: description.trim() || undefined,
    };

    const updatedGoals = [...goals, newGoal];
    setGoals(updatedGoals);
    
    try {
      await AsyncStorage.setItem('goals', JSON.stringify(updatedGoals));
      Alert.alert('Success', 'Goal created successfully!');
    } catch (error) {
      console.error('Error saving goal:', error);
      Alert.alert('Error', 'Failed to save goal');
    }

    resetForm();
    setModalVisible(false);
  };

  const addFundsToGoal = async () => {
    if (!selectedGoal) return;
    
    const amount = parseFloat(addAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    const newSavedAmount = selectedGoal.savedAmount + amount;
    if (newSavedAmount > selectedGoal.targetAmount) {
      Alert.alert('Amount Exceeded', 'Total saved amount cannot exceed target amount');
      return;
    }

    // Update goal
    const updatedGoals = goals.map(goal => 
      goal.id === selectedGoal.id 
        ? { ...goal, savedAmount: newSavedAmount }
        : goal
    );

    // Add to history
    const historyEntry: GoalHistory = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      goalId: selectedGoal.id,
      amount: amount,
      date: new Date().toISOString(),
      type: 'add'
    };

    const updatedHistory = [historyEntry, ...goalHistory];

    setGoals(updatedGoals);
    setSelectedGoal({ ...selectedGoal, savedAmount: newSavedAmount });
    
    try {
      await AsyncStorage.setItem('goals', JSON.stringify(updatedGoals));
      await saveGoalHistory(updatedHistory);
      Alert.alert('Success', `${formatAmount(amount)} added to ${selectedGoal.title}!`);
    } catch (error) {
      console.error('Error updating goal:', error);
      Alert.alert('Error', 'Failed to update goal');
    }

    setAddAmount('');
  };

  const deleteGoal = async () => {
    if (!selectedGoal) return;

    Alert.alert(
      'Delete Goal',
      `Are you sure you want to delete "${selectedGoal.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedGoals = goals.filter(goal => goal.id !== selectedGoal.id);
            const updatedHistory = goalHistory.filter(entry => entry.goalId !== selectedGoal.id);
            
            setGoals(updatedGoals);
            
            try {
              await AsyncStorage.setItem('goals', JSON.stringify(updatedGoals));
              await saveGoalHistory(updatedHistory);
              setDetailsVisible(false);
              setSelectedGoal(null);
              Alert.alert('Success', 'Goal deleted successfully!');
            } catch (error) {
              console.error('Error deleting goal:', error);
              Alert.alert('Error', 'Failed to delete goal');
            }
          }
        }
      ]
    );
  };

  const markGoalComplete = async () => {
    if (!selectedGoal) return;

    Alert.alert(
      'Mark as Complete',
      `Congratulations! Mark "${selectedGoal.title}" as completed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            const updatedGoals = goals.filter(goal => goal.id !== selectedGoal.id);
            
            setGoals(updatedGoals);
            
            try {
              await AsyncStorage.setItem('goals', JSON.stringify(updatedGoals));
              setDetailsVisible(false);
              setSelectedGoal(null);
              Alert.alert('Congratulations!', `You've completed your goal: ${selectedGoal.title}! 🎉`);
            } catch (error) {
              console.error('Error completing goal:', error);
              Alert.alert('Error', 'Failed to complete goal');
            }
          }
        }
      ]
    );
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

  const calculateBreakdown = (goal: Goal) => {
    const now = new Date();
    const deadline = new Date(goal.deadline);
    const daysLeft = Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const remaining = goal.targetAmount - goal.savedAmount;
    
    return {
      daily: daysLeft > 0 ? remaining / daysLeft : 0,
      weekly: daysLeft > 0 ? remaining / (daysLeft / 7) : 0,
      monthly: daysLeft > 0 ? remaining / (daysLeft / 30) : 0,
    };
  };

  const getGoalIcon = (iconName: string, size: number = 24) => {
    const iconProps = { size, color: '#4A9EFF' };
    
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
    { name: 'car', icon: Car },
    { name: 'home', icon: Home },
    { name: 'graduation', icon: GraduationCap },
    { name: 'plane', icon: Plane },
    { name: 'piggybank', icon: PiggyBank },
    { name: 'gift', icon: Gift },
    { name: 'smartphone', icon: Smartphone },
    { name: 'heart', icon: Heart },
    { name: 'shopping', icon: ShoppingCart },
  ];

  const formatDisplayDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const getGoalHistoryForGoal = (goalId: string) => {
    return goalHistory.filter(entry => entry.goalId === goalId);
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
                  setDetailsVisible(true);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.goalHeader}>
                  <View style={styles.goalIconContainer}>
                    {getGoalIcon(goal.icon, 24)}
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
                    <Text style={styles.goalDeadline}>Due: {formatDisplayDate(goal.deadline)}</Text>
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

      {/* Goal Details Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={detailsVisible}
        onRequestClose={() => setDetailsVisible(false)}
      >
        <SafeAreaView style={styles.detailsContainer}>
          {selectedGoal && (
            <>
              {/* Details Header */}
              <View style={styles.detailsHeader}>
                <TouchableOpacity 
                  style={styles.backButton}
                  onPress={() => setDetailsVisible(false)}
                >
                  <ArrowLeft size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.detailsHeaderTitle}>Goal Details</Text>
                <TouchableOpacity 
                  style={styles.historyButton}
                  onPress={() => setHistoryVisible(true)}
                >
                  <History size={24} color="#4A9EFF" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.detailsContent}>
                {/* Goal Title */}
                <Text style={styles.detailsGoalTitle}>{selectedGoal.title}</Text>

                {/* Progress Section */}
                <View style={styles.progressSection}>
                  <View style={styles.progressInfo}>
                    <Text style={styles.savedLabel}>Saved</Text>
                    <Text style={styles.progressAmount}>
                      {formatAmount(selectedGoal.savedAmount)} / {formatAmount(selectedGoal.targetAmount)}
                    </Text>
                  </View>
                  <View style={styles.detailsProgressBar}>
                    <View 
                      style={[
                        styles.detailsProgressFill, 
                        { width: `${calculateProgress(selectedGoal)}%` }
                      ]} 
                    />
                  </View>
                </View>

                {/* Add Funds Section */}
                <View style={styles.addFundsSection}>
                  <Text style={styles.sectionTitle}>Add Funds</Text>
                  <View style={styles.addFundsContainer}>
                    <TextInput
                      style={styles.addFundsInput}
                      placeholder="Enter amount"
                      placeholderTextColor="#8B9DC3"
                      value={addAmount}
                      onChangeText={setAddAmount}
                      keyboardType="numeric"
                    />
                    <TouchableOpacity 
                      style={styles.addButton}
                      onPress={addFundsToGoal}
                    >
                      <Text style={styles.addButtonText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Breakdown Section */}
                <View style={styles.breakdownSection}>
                  <Text style={styles.sectionTitle}>Breakdown</Text>
                  {(() => {
                    const breakdown = calculateBreakdown(selectedGoal);
                    return (
                      <View style={styles.breakdownList}>
                        <View style={styles.breakdownItem}>
                          <Text style={styles.breakdownLabel}>Daily</Text>
                          <Text style={styles.breakdownAmount}>{formatAmount(breakdown.daily)}</Text>
                        </View>
                        <View style={styles.breakdownItem}>
                          <Text style={styles.breakdownLabel}>Weekly</Text>
                          <Text style={styles.breakdownAmount}>{formatAmount(breakdown.weekly)}</Text>
                        </View>
                        <View style={styles.breakdownItem}>
                          <Text style={styles.breakdownLabel}>Monthly</Text>
                          <Text style={styles.breakdownAmount}>{formatAmount(breakdown.monthly)}</Text>
                        </View>
                      </View>
                    );
                  })()}
                </View>
              </ScrollView>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={styles.deleteButton}
                  onPress={deleteGoal}
                >
                  <Text style={styles.deleteButtonText}>Delete Goal</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.completeButton}
                  onPress={markGoalComplete}
                >
                  <Text style={styles.completeButtonText}>Mark as Complete</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </SafeAreaView>
      </Modal>

      {/* Goal History Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={historyVisible}
        onRequestClose={() => setHistoryVisible(false)}
      >
        <SafeAreaView style={styles.historyContainer}>
          <View style={styles.historyHeader}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => setHistoryVisible(false)}
            >
              <ArrowLeft size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.historyHeaderTitle}>Goal History</Text>
            <View style={styles.spacer} />
          </View>

          <ScrollView style={styles.historyContent}>
            {selectedGoal && getGoalHistoryForGoal(selectedGoal.id).map((entry) => (
              <View key={entry.id} style={styles.historyItem}>
                <View style={styles.historyItemLeft}>
                  <View style={styles.historyIcon}>
                    <Plus size={16} color="#4CAF50" />
                  </View>
                  <View style={styles.historyDetails}>
                    <Text style={styles.historyAmount}>+{formatAmount(entry.amount)}</Text>
                    <Text style={styles.historyDate}>
                      {new Date(entry.date).toLocaleDateString('en-GB')} at {new Date(entry.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
            {selectedGoal && getGoalHistoryForGoal(selectedGoal.id).length === 0 && (
              <View style={styles.emptyHistory}>
                <Text style={styles.emptyHistoryText}>No history yet</Text>
                <Text style={styles.emptyHistorySubtext}>Start adding funds to see your progress</Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

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
              <View style={styles.fieldContainer}>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="dd/mm/yyyy"
                  placeholderTextColor="#8B9DC3"
                  value={goalDeadline}
                  editable
                  maxLength={10}
                  keyboardType="number-pad"
                  onChangeText={(v) => setGoalDeadline(maskToDDMMYYYY(v))}
                />
                <TouchableOpacity
                  style={styles.calendarIconBtn}
                  onPress={() => {
                    setCalendarMonth(parseDate(goalDeadline || formatDate(new Date())));
                    setDatePickerVisible(true);
                  }}
                >
                  <Calendar size={18} color="#8B9DC3" />
                </TouchableOpacity>
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

      {/* Calendar Date Picker */}
      <Modal
        visible={datePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDatePickerVisible(false)}
      >
        <Animated.View style={[styles.pickerOverlay, { opacity: calOverlayOpacity }]}>
          <Pressable style={styles.overlayDismiss} onPress={closeCalendar} />
          <Animated.View style={[styles.calendarSheet, { transform: [{ translateY: calSheetTranslateY }], opacity: calSheetOpacity }]}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity style={styles.navBtn} onPress={() => switchMonth(-1)}>
                <ChevronLeft size={18} color="#8B9DC3" />
              </TouchableOpacity>
              <Text style={styles.calendarMonthText}>
                {calendarMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
              </Text>
              <TouchableOpacity style={styles.navBtn} onPress={() => switchMonth(1)}>
                <ChevronRight size={18} color="#8B9DC3" />
              </TouchableOpacity>
            </View>
            <View style={styles.weekdaysRow}>
              {['S','M','T','W','T','F','S'].map(d => (
                <Text key={d} style={styles.weekday}>{d}</Text>
              ))}
            </View>
            <Animated.View style={[styles.daysGrid, { transform: [{ translateX: animTranslate }], opacity: animOpacity }]}>
              {getMonthDaysGrid(calendarMonth).map((d, idx) => {
                const isCurrentMonth = d.getMonth() === calendarMonth.getMonth();
                const isSelected = sameDay(d, parseDate(goalDeadline || formatDate(new Date())));
                return (
                  <TouchableOpacity
                    key={`${d.toISOString()}-${idx}`}
                    style={styles.dayCell}
                    onPress={() => {
                      setGoalDeadline(formatDate(d));
                      closeCalendar();
                    }}
                  >
                    <View style={[styles.dayInner, isSelected && styles.dayInnerSelected]}>
                      <Text style={[styles.dayText, !isCurrentMonth && styles.dayTextMuted]}>
                        {d.getDate()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </Animated.View>
            <TouchableOpacity style={styles.pickerCancel} onPress={closeCalendar}>
              <Text style={styles.pickerCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
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
  goalDeadline: {
    fontSize: 12,
    color: '#8B9DC3',
    marginTop: 4,
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
  // Goal Details Modal styles
  detailsContainer: {
    flex: 1,
    backgroundColor: '#0F1621',
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    justifyContent: 'space-between',
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
  detailsHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  historyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsContent: {
    flex: 1,
    padding: 24,
  },
  detailsGoalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 24,
  },
  progressSection: {
    marginBottom: 32,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  savedLabel: {
    fontSize: 14,
    color: '#8B9DC3',
  },
  progressAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  detailsProgressBar: {
    height: 8,
    backgroundColor: '#2A3F54',
    borderRadius: 4,
  },
  detailsProgressFill: {
    height: '100%',
    backgroundColor: '#4A9EFF',
    borderRadius: 4,
  },
  addFundsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  addFundsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  addFundsInput: {
    flex: 1,
    backgroundColor: '#2A3F54',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#FFFFFF',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  breakdownSection: {
    marginBottom: 32,
  },
  breakdownList: {
    gap: 12,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A3F54',
  },
  breakdownLabel: {
    fontSize: 16,
    color: '#8B9DC3',
  },
  breakdownAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionButtons: {
    padding: 24,
    gap: 16,
  },
  deleteButton: {
    backgroundColor: 'rgba(255, 90, 95, 0.1)',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF5A5F',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF5A5F',
  },
  completeButton: {
    backgroundColor: '#4A9EFF',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  // History Modal styles
  historyContainer: {
    flex: 1,
    backgroundColor: '#0F1621',
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 157, 195, 0.1)',
  },
  historyHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  historyContent: {
    flex: 1,
    padding: 16,
  },
  historyItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  historyItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyDetails: {
    flex: 1,
  },
  historyAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 14,
    color: '#8B9DC3',
  },
  emptyHistory: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyHistoryText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8B9DC3',
    marginBottom: 8,
  },
  emptyHistorySubtext: {
    fontSize: 14,
    color: '#8B9DC3',
    textAlign: 'center',
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
  fieldContainer: {
    backgroundColor: '#111C2A',
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  fieldInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
  },
  calendarIconBtn: {
    marginLeft: 12,
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  iconOption: {
    width: '48%',
    height: 60,
    borderRadius: 12,
    backgroundColor: '#111C2A',
    borderWidth: 2,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
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
  // Calendar styles
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  overlayDismiss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  calendarSheet: {
    backgroundColor: '#101922',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  calendarMonthText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A3F54',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  weekday: {
    width: `${100/7}%`,
    textAlign: 'center',
    color: '#8B9DC3',
    fontSize: 12,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
  },
  dayCell: {
    width: `${100/7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayInner: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  dayTextMuted: {
    color: '#58708A',
  },
  dayInnerSelected: {
    backgroundColor: 'rgba(71, 129, 230, 0.25)',
  },
  pickerCancel: {
    marginTop: 8,
    marginHorizontal: 16,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A3F54',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerCancelText: {
    color: '#8B9DC3',
    fontSize: 16,
  },
});