import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowUpRight, ArrowDownLeft, Trash2, Calendar } from 'lucide-react-native';
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

export default function HistoryScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const transactionsData = await AsyncStorage.getItem('transactions');
      if (transactionsData) {
        const parsedTransactions = JSON.parse(transactionsData);
        // Sort by date, newest first
        const sortedTransactions = parsedTransactions.sort((a: Transaction, b: Transaction) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setTransactions(sortedTransactions);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const deleteTransaction = async (transactionId: number) => {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedTransactions = transactions.filter(t => t.id !== transactionId);
              setTransactions(updatedTransactions);
              await AsyncStorage.setItem('transactions', JSON.stringify(updatedTransactions));
            } catch (error) {
              console.error('Error deleting transaction:', error);
            }
          }
        }
      ]
    );
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const groupTransactionsByDate = () => {
    const grouped: { [key: string]: Transaction[] } = {};
    
    transactions.forEach(transaction => {
      const date = new Date(transaction.date).toDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(transaction);
    });

    return grouped;
  };

  const groupedTransactions = groupTransactionsByDate();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Transaction History</Text>
        <Text style={styles.subtitle}>{transactions.length} transactions</Text>
      </View>

      {transactions.length === 0 ? (
        <View style={styles.emptyState}>
          <Calendar size={48} color="#E5E5E5" />
          <Text style={styles.emptyText}>No transactions yet</Text>
          <Text style={styles.emptySubtext}>Your transaction history will appear here</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {Object.entries(groupedTransactions).map(([date, dayTransactions]) => (
            <View key={date} style={styles.dateGroup}>
              <Text style={styles.dateHeader}>{formatDate(dayTransactions[0].date)}</Text>
              
              {dayTransactions.map((transaction) => (
                <View key={transaction.id} style={styles.transactionCard}>
                  <View style={styles.transactionLeft}>
                    <View style={[
                      styles.iconContainer,
                      transaction.type === 'add' ? styles.addIcon : styles.subtractIcon
                    ]}>
                      {transaction.type === 'add' ? (
                        <ArrowUpRight size={16} color="#FFFFFF" />
                      ) : (
                        <ArrowDownLeft size={16} color="#FFFFFF" />
                      )}
                    </View>
                    
                    <View style={styles.transactionInfo}>
                      <Text style={styles.transactionType}>
                        {transaction.type === 'add' ? 'Money Added' : 'Money Withdrawn'}
                      </Text>
                      <Text style={styles.transactionTime}>
                        {formatTime(transaction.date)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.transactionRight}>
                    <Text style={[
                      styles.transactionAmount,
                      transaction.type === 'add' ? styles.addAmount : styles.subtractAmount
                    ]}>
                      {transaction.type === 'add' ? '+' : '-'}{formatAmount(transaction.amount)}
                    </Text>
                    
                    <TouchableOpacity 
                      style={styles.deleteButton}
                      onPress={() => deleteTransaction(transaction.id)}
                    >
                      <Trash2 size={16} color="#999999" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999999',
    marginTop: 4,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingTop: 0,
    paddingBottom: 100,
  },
  dateGroup: {
    marginBottom: 24,
  },
  dateHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
    paddingLeft: 4,
  },
  transactionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  addIcon: {
    backgroundColor: '#000000',
  },
  subtractIcon: {
    backgroundColor: '#666666',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionType: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 2,
  },
  transactionTime: {
    fontSize: 12,
    color: '#666666',
  },
  transactionRight: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  addAmount: {
    color: '#000000',
  },
  subtractAmount: {
    color: '#666666',
  },
  deleteButton: {
    padding: 4,
  },
});