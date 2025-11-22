import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

const WatchlistScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Watchlist Screen</Text>
      <Text style={styles.subtitle}>Coming Soon - Personalized Watchlists</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
});

export default WatchlistScreen;
