import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

const MarketsScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Markets Screen</Text>
      <Text style={styles.subtitle}>Coming Soon - Market Analysis</Text>
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

export default MarketsScreen;
