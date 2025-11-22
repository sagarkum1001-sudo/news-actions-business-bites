import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {StatusBar, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import MarketsScreen from './src/screens/MarketsScreen';
import WatchlistScreen from './src/screens/WatchlistScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// Navigation Types
export type RootStackParamList = {
  MainTabs: undefined;
  ArticleDetail: {articleId: string};
  MarketArticles: {market: string};
  WatchlistDetail: {watchlistId: string};
};

export type MainTabParamList = {
  Home: undefined;
  Markets: undefined;
  Watchlist: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Main Tab Navigator
function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        tabBarIcon: ({focused, color, size}) => {
          let iconName: string;

          if (route.name === 'Home') {
            iconName = 'home';
          } else if (route.name === 'Markets') {
            iconName = 'show-chart';
          } else if (route.name === 'Watchlist') {
            iconName = 'star';
          } else if (route.name === 'Profile') {
            iconName = 'person';
          } else {
            iconName = 'help';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{title: 'News'}}
      />
      <Tab.Screen
        name="Markets"
        component={MarketsScreen}
        options={{title: 'Markets'}}
      />
      <Tab.Screen
        name="Watchlist"
        component={WatchlistScreen}
        options={{title: 'Watchlist'}}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{title: 'Profile'}}
      />
    </Tab.Navigator>
  );
}

// Main App Component
function App(): JSX.Element {
  return (
    <NavigationContainer>
      <StatusBar barStyle="light-content" backgroundColor="#007AFF" />
      <Stack.Navigator
        initialRouteName="MainTabs"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#007AFF',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}>
        <Stack.Screen
          name="MainTabs"
          component={MainTabNavigator}
          options={{headerShown: false}}
        />
        {/* Additional screens can be added here */}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
