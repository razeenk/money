import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, ScrollView, Pressable, Animated, Easing, Keyboard, LayoutAnimation, Platform, UIManager, Alert } from 'react-native';
import { Eye, EyeOff, ArrowDownLeft, ArrowUpRight, ShoppingCart, Chrome as HomeIcon, Briefcase, Trash2, Calendar as CalendarIcon, Zap, Utensils, Bus, ShoppingBag, HeartPulse, Film, Circle, HandCoins, House, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Transaction {
  id: number;
  amount: number;
  type: 'add' | 'subtract';
  date: string;
  payee: string;
  category: string;
  notes?: string;
}

export default function SavingsScreen() {
  const [totalSavings, setTotalSavings] = useState(0);
  const [selectedDate, setSelectedDate] = useState('');
  const [showAmount, setShowAmount] = useState(true);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [payee, setPayee] = useState('');
  const [knownPayees, setKnownPayees] = useState<string[]>([]);
  const [showPayeeSuggestions, setShowPayeeSuggestions] = useState(false);
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedType, setSelectedType] = useState<'add' | 'subtract'>('subtract');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const animTranslate = useRef(new Animated.Value(0)).current;
  const animOpacity = useRef(new Animated.Value(1)).current;
  const calOverlayOpacity = useRef(new Animated.Value(0)).current;
  const calSheetTranslateY = useRef(new Animated.Value(24)).current;
  const calSheetOpacity = useRef(new Animated.Value(0)).current;
  const catOverlayOpacity = useRef(new Animated.Value(0)).current;
  const catSheetTranslateY = useRef(new Animated.Value(24)).current;
  const catSheetOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
    loadData();
  }, []);

  useEffect(() => {
    if (!selectedDate) {
      setSelectedDate(formatDate(new Date()));
    }
  }, [addModalVisible]);

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

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const animateFluid = () => {
    LayoutAnimation.configureNext({
      duration: 180,
      create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity, duration: 180 },
      update: { type: LayoutAnimation.Types.easeInEaseOut, duration: 180 },
      delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity, duration: 160 },
    });
  };

  const formatDate = (date: Date) => {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const parseDate = (value: string) => {
    // Accept dd/mm/yyyy, fallback to today
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
    // keep only digits
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
    // Slide in from left/right with fade
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
    const firstWeekday = start.getDay(); // 0 Sun - 6 Sat
    const grid: Date[] = [];
    // Leading blanks from previous month
    for (let i = 0; i < firstWeekday; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() - (firstWeekday - i));
      grid.push(d);
    }
    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      grid.push(new Date(date.getFullYear(), date.getMonth(), d));
    }
    // Trailing to complete weeks (42 cells = 6 weeks)
    while (grid.length % 7 !== 0 || grid.length < 42) {
      const last = grid[grid.length - 1];
      const next = new Date(last);
      next.setDate(next.getDate() + 1);
      grid.push(next);
    }
    return grid;
  };

  const loadData = async () => {
    try {
      const savedTransactions = await AsyncStorage.getItem('transactions');
      if (savedTransactions) {
        const parsedTransactions = JSON.parse(savedTransactions);
        setTransactions(parsedTransactions);
        
        const total = parsedTransactions.reduce((sum: number, transaction: Transaction) => {
          return transaction.type === 'add' ? sum + transaction.amount : sum - transaction.amount;
        }, 0);
        setTotalSavings(total);
      }
      const savedPayees = await AsyncStorage.getItem('payees');
      if (savedPayees) {
        setKnownPayees(JSON.parse(savedPayees));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const saveTransaction = async (newTransaction: Transaction) => {
    try {
      const updatedTransactions = [newTransaction, ...transactions];
      await AsyncStorage.setItem('transactions', JSON.stringify(updatedTransactions));
      setTransactions(updatedTransactions);
      
      const newTotal = newTransaction.type === 'add' 
        ? totalSavings + newTransaction.amount 
        : totalSavings - newTransaction.amount;
      setTotalSavings(newTotal);

      // update known payees
      const normalized = newTransaction.payee.trim();
      if (normalized) {
        const set = new Set([normalized, ...knownPayees]);
        const next = Array.from(set).slice(0, 50);
        setKnownPayees(next);
        await AsyncStorage.setItem('payees', JSON.stringify(next));
      }
    } catch (error) {
      console.error('Error saving transaction:', error);
    }
  };

  const handleAddMoney = () => {
    const numericAmount = parseFloat((amount || '0').replace(/[^0-9.]/g, ''));
    if (!numericAmount || numericAmount <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid amount greater than 0.');
      return;
    }
    if (!payee.trim()) {
      Alert.alert('Missing payee', 'Please enter the payee details.');
      return;
    }

    const useCategory = category || (selectedType === 'add' ? 'Income' : 'Expense');
    const dateString = selectedDate || formatDate(new Date());

      const newTransaction: Transaction = {
        id: Date.now(),
      amount: numericAmount,
        type: selectedType,
      date: parseDate(dateString).toISOString(),
        payee: payee.trim(),
      category: useCategory,
        notes: notes.trim()
      };
      saveTransaction(newTransaction);
      resetForm();
      setAddModalVisible(false);
  };

  const resetForm = () => {
    setAmount('');
    setPayee('');
    setCategory('');
    setNotes('');
    setSelectedType('subtract');
    setSelectedDate(formatDate(new Date()));
  };

  const deleteTransaction = async (transactionId: number) => {
            try {
              const updatedTransactions = transactions.filter(t => t.id !== transactionId);
              setTransactions(updatedTransactions);
              await AsyncStorage.setItem('transactions', JSON.stringify(updatedTransactions));
              const newTotal = updatedTransactions.reduce((sum, transaction) => {
                return transaction.type === 'add' ? sum + transaction.amount : sum - transaction.amount;
              }, 0);
              setTotalSavings(newTotal);
            } catch (error) {
              console.error('Error deleting transaction:', error);
    }
  };

  const requestDelete = (id: number) => {
    setPendingDeleteId(id);
    setDetailsVisible(false);
    setConfirmVisible(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDisplayDate = (iso: string) => {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const getTransactionIcon = (category: string) => {
    const key = (category || '').toLowerCase();
    const color = '#4A9EFF';
    const size = 20;
    switch (key) {
      case 'groceries':
        return <ShoppingCart size={size} color={color} />;
      case 'rent':
        return <House size={size} color={color} />;
      case 'salary':
        return <Briefcase size={size} color={color} />;
      case 'deposit':
        return <HandCoins size={size} color={color} />;
      case 'utilities':
        return <Zap size={size} color={color} />;
      case 'dining':
        return <Utensils size={size} color={color} />;
      case 'transport':
        return <Bus size={size} color={color} />;
      case 'shopping':
        return <ShoppingBag size={size} color={color} />;
      case 'healthcare':
        return <HeartPulse size={size} color={color} />;
      case 'entertainment':
        return <Film size={size} color={color} />;
      case 'other':
        return <Circle size={size} color={color} />;
      default:
        return <Briefcase size={size} color={color} />;
    }
  };

  const CATEGORY_OPTIONS = [
    { label: 'Groceries', Icon: ShoppingCart },
    { label: 'Rent', Icon: House },
    { label: 'Salary', Icon: Briefcase },
    { label: 'Deposit', Icon: HandCoins },
    { label: 'Utilities', Icon: Zap },
    { label: 'Dining', Icon: Utensils },
    { label: 'Transport', Icon: Bus },
    { label: 'Shopping', Icon: ShoppingBag },
    { label: 'Healthcare', Icon: HeartPulse },
    { label: 'Entertainment', Icon: Film },
    { label: 'Other', Icon: Circle },
  ] as const;

  const recentTransactions = transactions.slice(0, 3);

  const closeCalendar = () => {
    Animated.parallel([
      Animated.timing(calOverlayOpacity, { toValue: 0, duration: 100, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(calSheetTranslateY, { toValue: 24, duration: 140, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(calSheetOpacity, { toValue: 0, duration: 140, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(() => setDatePickerVisible(false));
  };

  // Animate category picker open/close
  useEffect(() => {
    if (categoryPickerVisible) {
      catOverlayOpacity.setValue(0);
      catSheetTranslateY.setValue(24);
      catSheetOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(catOverlayOpacity, { toValue: 1, duration: 120, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(catSheetTranslateY, { toValue: 0, duration: 160, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(catSheetOpacity, { toValue: 1, duration: 160, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }
  }, [categoryPickerVisible]);

  // Animate layout changes when keyboard visibility toggles
  useEffect(() => {
    animateFluid();
  }, [isKeyboardVisible, focusedField]);

  const closeCategoryPicker = () => {
    Animated.parallel([
      Animated.timing(catOverlayOpacity, { toValue: 0, duration: 100, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(catSheetTranslateY, { toValue: 24, duration: 140, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(catSheetOpacity, { toValue: 0, duration: 140, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(() => setCategoryPickerVisible(false));
  };

  return (
    <SafeAreaView style={styles.container}>
        <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Accounts</Text>
        </View>

        {/* Account Card */}
        <View style={styles.accountCard}>
          <View style={styles.accountInfo}>
            <Text style={styles.accountType}>Checking</Text>
            <Text style={styles.bankName}>Bank of the West</Text>
            <Text style={styles.accountNumber}>•••• 1234</Text>
          </View>
          <View style={styles.bankLogo}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>B</Text>
            </View>
          </View>
        </View>

        {/* Balance Section */}
        <View style={styles.balanceSection}>
          <Text style={styles.balanceLabel}>Balance</Text>
          <View style={styles.balanceContainer}>
            <Text style={styles.balanceAmount}>
              {showAmount ? formatCurrency(totalSavings) : '****'}
            </Text>
            <TouchableOpacity 
              style={styles.eyeButton}
              onPress={() => setShowAmount(!showAmount)}
            >
              {showAmount ? (
                <Eye size={24} color="#8B9DC3" />
              ) : (
                <EyeOff size={24} color="#8B9DC3" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.inButton}
            onPress={() => {
              setSelectedType('add');
              setAddModalVisible(true);
            }}
          >
            <ArrowDownLeft size={20} color="#4A9EFF" />
            <Text style={styles.inButtonText}>In</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.outButton}
            onPress={() => {
              setSelectedType('subtract');
              setAddModalVisible(true);
            }}
          >
            <ArrowUpRight size={20} color="#4A9EFF" />
            <Text style={styles.outButtonText}>Out</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Transactions */}
        <View style={styles.transactionsSection}>
          <Text style={styles.transactionsTitle}>Transactions</Text>
          <View style={styles.transactionsList}>
            {recentTransactions.map((transaction) => (
              <TouchableOpacity key={transaction.id} style={styles.transactionItem} activeOpacity={0.8}
                onPress={() => { setSelectedTransaction(transaction); setDetailsVisible(true); }}>
                <View style={styles.transactionLeft}>
                  <View style={styles.transactionIcon}>
                    {getTransactionIcon(transaction.category)}
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionTitle}>{transaction.payee}</Text>
                    <Text style={styles.transactionCategory}>{transaction.category}</Text>
                  </View>
                </View>
                <View style={styles.transactionRight}>
                  <Text style={[
                    styles.transactionAmount,
                    transaction.type === 'add' ? styles.positiveAmount : styles.negativeAmount
                  ]}>
                    {transaction.type === 'add' ? '+' : '-'}{formatCurrency(transaction.amount)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        </ScrollView>

        {/* Add Money Modal */}
        <Modal
        animationType="slide"
        transparent={true}
        visible={addModalVisible}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => {
                    setAddModalVisible(false);
                    resetForm();
                  }}
                >
                  <Text style={styles.closeIcon}>×</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Add Transaction</Text>
                <View style={styles.spacer} />
              </View>

              {/* Main Content */}
              <View style={styles.mainContent}>
                {/* Type Toggle */}
                <View style={styles.toggleContainer}>
                  <View style={styles.toggleWrapper}>
                    <TouchableOpacity 
                      style={[
                        styles.toggleButton, 
                        selectedType === 'subtract' && styles.activeToggle
                      ]}
                      onPress={() => setSelectedType('subtract')}
                    >
                      <Text style={[
                        styles.toggleText,
                        selectedType === 'subtract' && styles.activeToggleText
                      ]}>
                        Expense
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[
                        styles.toggleButton, 
                        selectedType === 'add' && styles.activeToggle
                      ]}
                      onPress={() => setSelectedType('add')}
                    >
                      <Text style={[
                        styles.toggleText,
                        selectedType === 'add' && styles.activeToggleText
                      ]}>
                        Income
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Form Fields */}
                <ScrollView
                  style={styles.formScroll}
                  contentContainerStyle={styles.formFields}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  showsVerticalScrollIndicator={false}
                >
                  {/* Amount */}
                  {(!isKeyboardVisible || focusedField === 'amount') && (
                  <View style={styles.amountContainer}>
                    <View style={styles.amountInputWrapper}>
                      <Text style={styles.dollarSign}>$</Text>
                      <TextInput
                        style={styles.amountInput}
                        placeholder="0"
                        placeholderTextColor="#94A3B8"
                        value={amount}
                          onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ''))}
                          keyboardType="decimal-pad"
                          onFocus={() => { animateFluid(); setFocusedField('amount'); }}
                          onBlur={() => { animateFluid(); setFocusedField(null); }}
                      />
                    </View>
                  </View>
                  )}

                  {/* Category */}
                  {!isKeyboardVisible && (
                    <TouchableOpacity style={styles.fieldContainer} onPress={() => { animateFluid(); setFocusedField('category'); setCategoryPickerVisible(true); }}>
                      <View style={styles.fieldLeftRow}>
                        <View style={styles.categoryIconWrap}>
                          {getTransactionIcon((category || '').toLowerCase())}
                        </View>
                    <Text style={styles.fieldText}>
                      {category || 'Category'}
                    </Text>
                      </View>
                      <ChevronDown size={18} color="#8B9DC3" />
                  </TouchableOpacity>
                  )}

                  {/* Payee Details */}
                  {(!isKeyboardVisible || focusedField === 'payee') && (
                  <View style={styles.fieldContainer}>
                    <TextInput
                      style={styles.fieldInput}
                      placeholder="Payee Details"
                      placeholderTextColor="#94A3B8"
                      value={payee}
                        onChangeText={(text) => {
                          setPayee(text);
                          const hasQuery = text.trim().length > 0;
                          setShowPayeeSuggestions(hasQuery);
                        }}
                        onFocus={() => { animateFluid(); setFocusedField('payee'); }}
                        onBlur={() => { animateFluid(); setFocusedField(null); }}
                    />
                  </View>
                  )}
                  {showPayeeSuggestions && payee.trim().length > 0 && (!isKeyboardVisible || focusedField === 'payee') && (
                    <View style={styles.suggestionsBox}>
                      {knownPayees
                        .filter(p => p.toLowerCase().startsWith(payee.trim().toLowerCase()) && p.toLowerCase() !== payee.trim().toLowerCase())
                        .slice(0, 6)
                        .map(s => (
                          <TouchableOpacity key={s} style={styles.suggestionItem} onPress={() => { setPayee(s); setShowPayeeSuggestions(false); }}>
                            <Text style={styles.suggestionText}>{s}</Text>
                          </TouchableOpacity>
                        ))}
                    </View>
                  )}

                  {/* Date */}
                  {(!isKeyboardVisible || focusedField === 'date') && (
                  <View style={styles.fieldContainer}>
                    <TextInput
                      style={styles.fieldInput}
                        placeholder="dd/mm/yyyy"
                      placeholderTextColor="#94A3B8"
                      value={selectedDate}
                        editable
                        maxLength={10}
                        keyboardType="number-pad"
                        onChangeText={(v) => setSelectedDate(maskToDDMMYYYY(v))}
                        onFocus={() => { animateFluid(); setFocusedField('date'); }}
                        onBlur={() => { animateFluid(); setFocusedField(null); }}
                      />
                      <TouchableOpacity
                        accessibilityLabel="Open calendar"
                        style={styles.calendarIconBtn}
                        onPress={() => {
                          setCalendarMonth(parseDate(selectedDate || formatDate(new Date())));
                          setDatePickerVisible(true);
                        }}
                      >
                        <CalendarIcon size={18} color="#8B9DC3" />
                      </TouchableOpacity>
                  </View>
                  )}

                  {/* Notes */}
                  {(!isKeyboardVisible || focusedField === 'notes') && (
                  <View style={styles.notesContainer}>
                    <TextInput
                      style={styles.notesInput}
                      placeholder="Notes"
                      placeholderTextColor="#94A3B8"
                      value={notes}
                      onChangeText={setNotes}
                      multiline
                      textAlignVertical="top"
                        onFocus={() => { animateFluid(); setFocusedField('notes'); }}
                        onBlur={() => { animateFluid(); setFocusedField(null); }}
                    />
                  </View>
                  )}
                  <View style={{ height: 88 }} />
                </ScrollView>
            </View>

            {/* Footer */}
              { !isKeyboardVisible && (
              <View style={styles.footerFixed}>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleAddMoney}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
              )}
            </View>
          </View>
          </View>
        </Modal>

        {/* Category Picker Sheet */}
        <Modal
          visible={categoryPickerVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setCategoryPickerVisible(false)}
        >
          <Animated.View style={[styles.pickerOverlay, { opacity: catOverlayOpacity }]}>
            <Pressable style={styles.overlayDismiss} onPress={closeCategoryPicker} />
            <Animated.View style={[styles.pickerSheet, { transform: [{ translateY: catSheetTranslateY }], opacity: catSheetOpacity }]}>
              <Text style={styles.pickerTitle}>Select Category</Text>
              <ScrollView style={styles.pickerList}>
                {CATEGORY_OPTIONS.map(({ label, Icon }) => (
                  <TouchableOpacity
                    key={label}
                    style={[styles.pickerItem, styles.pickerItemRow]}
                    onPress={() => {
                      setCategory(label);
                      closeCategoryPicker();
                    }}
                  >
                    <Icon size={18} color="#4A9EFF" />
                    <Text style={styles.pickerItemText}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={styles.pickerCancel} onPress={closeCategoryPicker}>
                <Text style={styles.pickerCancelText}>Cancel</Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </Modal>

        {/* Calendar Date Picker */}
        <Modal
          visible={datePickerVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setDatePickerVisible(false)}
        >
          <Animated.View style={[styles.pickerOverlay, { opacity: calOverlayOpacity }] }>
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
                  const isSelected = sameDay(d, parseDate(selectedDate || formatDate(new Date())));
                  return (
                    <TouchableOpacity
                      key={`${d.toISOString()}-${idx}`}
                      style={styles.dayCell}
                      onPress={() => {
                        setSelectedDate(formatDate(d));
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

        {/* Transaction Details Modal */}
        <Modal
          visible={detailsVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setDetailsVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.detailsSheet}>
              <View style={styles.detailsHeader}>
                <Text style={styles.detailsTitle}>Transaction</Text>
                {!!selectedTransaction && (
                  <TouchableOpacity accessibilityLabel="Delete transaction" onPress={() => { if (selectedTransaction) requestDelete(selectedTransaction.id); }}>
                    <Trash2 size={18} color="#FF5A5F" />
                  </TouchableOpacity>
                )}
              </View>
              {!!selectedTransaction && (
                <View style={styles.detailsContent}>
                  <View style={styles.detailsRow}>
                    <Text style={styles.detailsLabel}>Amount</Text>
                    <Text style={[styles.detailsValue, selectedTransaction.type === 'add' ? styles.positiveAmount : styles.negativeAmount]}>
                      {selectedTransaction.type === 'add' ? '+' : '-'}{formatCurrency(selectedTransaction.amount)}
                    </Text>
                  </View>
                  <View style={styles.detailsRow}>
                    <Text style={styles.detailsLabel}>Payee</Text>
                    <Text style={styles.detailsValue}>{selectedTransaction.payee}</Text>
                  </View>
                  <View style={styles.detailsRow}>
                    <Text style={styles.detailsLabel}>Category</Text>
                    <Text style={styles.detailsValue}>{selectedTransaction.category}</Text>
                  </View>
                  <View style={styles.detailsRow}>
                    <Text style={styles.detailsLabel}>Date</Text>
                    <Text style={styles.detailsValue}>{formatDisplayDate(selectedTransaction.date)}</Text>
                  </View>
                  {selectedTransaction.notes ? (
                    <View style={styles.detailsNotes}>
                      <Text style={styles.detailsLabel}>Notes</Text>
                      <Text style={styles.detailsNotesText}>{selectedTransaction.notes}</Text>
                    </View>
                  ) : null}
                </View>
              )}
              <View style={styles.detailsFooter}>
                <TouchableOpacity style={styles.pickerCancel} onPress={() => setDetailsVisible(false)}>
                  <Text style={styles.pickerCancelText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          visible={confirmVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setConfirmVisible(false)}
        >
          <View style={styles.pickerOverlay}>
            <Pressable style={styles.overlayDismiss} onPress={() => setConfirmVisible(false)} />
            <View style={styles.confirmSheet}>
              <Text style={styles.confirmTitle}>Delete Transaction</Text>
              <Text style={styles.confirmMessage}>Are you sure you want to delete this transaction?</Text>
              <View style={styles.confirmActions}>
                <TouchableOpacity style={styles.confirmCancel} onPress={() => setConfirmVisible(false)}>
                  <Text style={styles.pickerCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButtonFilled}
                  onPress={async () => {
                    if (pendingDeleteId != null) {
                      await deleteTransaction(pendingDeleteId);
                    }
                    setConfirmVisible(false);
                    setPendingDeleteId(null);
                  }}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
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
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  accountCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 32,
    backgroundColor: '#111C2A',
    padding: 16,
    borderRadius: 16,
  },
  accountInfo: {
    flex: 1,
  },
  accountType: {
    fontSize: 14,
    color: '#8B9DC3',
    marginBottom: 4,
  },
  bankName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  accountNumber: {
    fontSize: 14,
    color: '#8B9DC3',
  },
  bankLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2A5A4A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3A6A5A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  balanceSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#8B9DC3',
    marginBottom: 8,
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  balanceAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  eyeButton: {
    padding: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 16,
    marginBottom: 32,
  },
  inButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A3F54',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  inButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4A9EFF',
  },
  outButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A3F54',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  outButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4A9EFF',
  },
  transactionsSection: {
    flex: 1,
    paddingHorizontal: 24,
  },
  transactionsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  transactionsList: {
    flex: 1,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A3F54',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#2A3F54',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  transactionCategory: {
    fontSize: 14,
    color: '#8B9DC3',
  },
  transactionRight: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 12,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  positiveAmount: {
    color: '#4CAF50',
  },
  negativeAmount: {
    color: '#FFFFFF',
  },
  deleteButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#101922',
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  closeButton: {
    width: 24,
    height: 24,
  },
  closeIcon: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    paddingRight: 24,
  },
  spacer: {
    width: 24,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  formScroll: {
    flex: 1,
  },
  toggleContainer: {
    marginBottom: 16,
  },
  toggleWrapper: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
    padding: 8,
    flexDirection: 'row',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeToggle: {
    backgroundColor: '#101922',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94A3B8',
  },
  activeToggleText: {
    color: '#FFFFFF',
  },
  formFields: {
    gap: 16,
  },
  amountContainer: {
    marginBottom: 16,
  },
  amountInputWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    height: 80,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  amountInputFocused: {
    borderWidth: 1,
    borderColor: '#2F88FF',
  },
  dollarSign: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#94A3B8',
    marginRight: 12,
  },
  amountInput: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  fieldContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldContainerFocused: {
    borderWidth: 1,
    borderColor: '#2F88FF',
  },
  fieldLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  categoryIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#2A3F54',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  fieldInput: {
    fontSize: 16,
    color: '#FFFFFF',
    flex: 1,
  },
  chevron: {
    fontSize: 16,
    color: '#94A3B8',
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
  notesContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    minHeight: 88,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  suggestionsBox: {
    marginTop: 8,
    backgroundColor: '#0F1621',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A3F54',
    overflow: 'hidden',
  },
  suggestionItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#142132',
  },
  suggestionText: {
    color: '#C2CBDA',
    fontSize: 14,
  },
  notesContainerFocused: {
    borderWidth: 1,
    borderColor: '#2F88FF',
  },
  notesInput: {
    fontSize: 16,
    color: '#FFFFFF',
    flex: 1,
    textAlignVertical: 'top',
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 16,
  },
  footerFixed: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 12,
    backgroundColor: '#101922',
  },
  saveButton: {
    backgroundColor: '#1173D4',
    borderRadius: 16,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  // Picker styles
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#101922',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
    paddingBottom: 24,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  pickerList: {
    paddingHorizontal: 8,
  },
  pickerItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2A3A',
  },
  pickerItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pickerItemText: {
    fontSize: 16,
    color: '#FFFFFF',
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
  navText: {
    color: '#8B9DC3',
    fontSize: 16,
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
  // Remove old styles
  typeToggle: {
    flexDirection: 'row',
    marginBottom: 60,
    marginTop: 40,
  },
  typeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
  },
  activeTypeButton: {
  },
  typeButtonText: {
    fontSize: 20,
    color: '#64748B',
    fontWeight: '500',
  },
  activeTypeButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  amountSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 80,
    paddingLeft: 8,
  },
  currencySymbol: {
    fontSize: 72,
    color: '#64748B',
    marginRight: 8,
    fontWeight: '300',
  },
  inputSection: {
    marginBottom: 40,
  },
  categorySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
    marginBottom: 40,
  },
  categoryText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '400',
  },
  dropdownArrow: {
    fontSize: 20,
    color: '#64748B',
    fontWeight: '300',
  },
  textInput: {
    fontSize: 20,
    color: '#FFFFFF',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
    fontWeight: '400',
  },
  oldNotesInput: {
    fontSize: 20,
    color: '#FFFFFF',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
    minHeight: 140,
    fontWeight: '400',
  },
  input: {
    borderWidth: 1,
    borderColor: '#3A4F64',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
    backgroundColor: '#1E2A3A',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
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
    fontSize: 16,
    color: '#8B9DC3',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#4A9EFF',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  overlayDismiss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  // Details modal styles
  detailsSheet: {
    backgroundColor: '#101922',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 16,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  detailsTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  detailsContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 10,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2A3A',
  },
  detailsLabel: {
    color: '#8B9DC3',
    fontSize: 14,
  },
  detailsValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  detailsNotes: {
    paddingVertical: 12,
  },
  detailsNotesText: {
    color: '#C2CBDA',
    fontSize: 14,
  },
  detailsFooter: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  confirmSheet: {
    backgroundColor: '#101922',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  confirmTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  confirmMessage: {
    color: '#C2CBDA',
    fontSize: 14,
    marginBottom: 12,
  },
  confirmActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
  },
  confirmCancel: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#2A3F54',
    backgroundColor: 'transparent',
  },
  deleteButtonFilled: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF5A5F',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});