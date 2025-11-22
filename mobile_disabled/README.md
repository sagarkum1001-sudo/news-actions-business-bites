# News Actions Mobile App

Cross-platform React Native application for News Actions business intelligence platform.

## 🚀 Features

- **Real-time News Feed**: Live business news with impact scoring and sentiment analysis
- **Personalized Watchlists**: Create custom watchlists for companies, sectors, and topics
- **Cross-platform**: Native iOS and Android support
- **Offline Capability**: Read articles offline with automatic sync
- **User Assistance**: Integrated feedback and support system

## 📱 Tech Stack

- **Framework**: React Native 0.72.6
- **Language**: TypeScript
- **Navigation**: React Navigation v6
- **State Management**: React Context + Hooks
- **API Client**: Axios with interceptors
- **Storage**: AsyncStorage for offline data
- **Icons**: Material Icons

## 🏃‍♂️ Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- React Native development environment
- iOS: Xcode 14+ (macOS only)
- Android: Android Studio with SDK

### Installation

1. **Clone and navigate to mobile directory:**
   ```bash
   cd news-actions-business-bites/mobile
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start Metro bundler:**
   ```bash
   npm start
   ```

5. **Run on device/simulator:**
   ```bash
   # iOS
   npm run ios

   # Android
   npm run android
   ```

## 📁 Project Structure

```
mobile/
├── src/
│   ├── screens/          # Screen components
│   │   ├── HomeScreen.tsx       # News feed
│   │   ├── MarketsScreen.tsx    # Market overview
│   │   ├── WatchlistScreen.tsx  # User watchlists
│   │   ├── ProfileScreen.tsx    # User profile
│   │   └── SettingsScreen.tsx   # App settings
│   ├── services/         # API and external services
│   │   └── api.ts        # API client with typed interfaces
│   └── navigation/       # Navigation configuration
├── android/              # Android native code
├── ios/                  # iOS native code
├── App.tsx               # Main app component
├── index.js              # App entry point
├── metro.config.js       # Metro bundler config
├── babel.config.js       # Babel configuration
└── package.json          # Dependencies and scripts
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file from `.env.example`:

```env
# API Configuration
API_BASE_URL=http://localhost:3000
APP_ENV=development

# Feature Flags
ENABLE_WATCHLIST=true
ENABLE_USER_ASSIST=true
ENABLE_SEARCH=true
ENABLE_READ_LATER=true

# Push Notifications
PUSH_NOTIFICATIONS_ENABLED=false
FCM_SERVER_KEY=your_fcm_key

# Offline Sync
OFFLINE_SYNC_ENABLED=true
SYNC_INTERVAL_MINUTES=15
```

### Server Connection

The app connects to the unified server at `../server/index.js`. Make sure the server is running:

```bash
npm start  # in the project root
```

## 🔌 API Integration

### Authentication Flow

```typescript
import { apiClient } from '../services/api';

// Demo authentication
const { user, session } = await apiClient.lookupOrCreateUser({
  sub: 'user123',
  email: 'user@example.com',
  name: 'John Doe'
});

// Set session for all future requests
apiClient.setSessionId(session.session_id);
```

### News Feed

```typescript
// Get latest news
const response = await apiClient.getBusinessBitesArticles('US', 1);
console.log(response.articles);

// Log article access
await apiClient.logArticleAccess(article.business_bites_news_id);
```

### Watchlist Management

```typescript
// Get user watchlists
const { watchlists } = await apiClient.getWatchlists(userId);

// Create new watchlist
const { watchlist_id } = await apiClient.createWatchlist(
  userId, 'Tech Stocks', 'companies', 'US'
);

// Add company to watchlist
await apiClient.addToWatchlist(watchlistId, 'AAPL');
```

## 🏗 Building for Production

### Android APK

```bash
npm run build:android
# APK will be in android/app/build/outputs/apk/release/
```

### iOS App Store

```bash
npm run build:ios
# Archive will be in ios/build/
```

### Build Commands

```bash
# Development builds
npm run android      # Debug APK
npm run ios         # Debug simulator

# Production builds
npm run build:android  # Release APK
npm run build:ios     # Release archive
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Update test snapshots
npm run test -- -u
```

## 🔐 Security

- **API Keys**: Store in `.env` (not committed)
- **Code Obfuscation**: Enabled in release builds
- **Certificate Pinning**: Recommended for production
- **Data Encryption**: Offline data encrypted with AsyncStorage

## 🚀 Deployment

### App Store Deployment

1. **iOS**: Use Xcode to upload archive to App Store Connect
2. **Android**: Upload APK/AAB to Google Play Console

### Environment-specific Builds

```bash
# Staging build
APP_ENV=staging npm run build:android

# Production build
APP_ENV=production npm run build:ios
```

## 🐛 Troubleshooting

### Common Issues

1. **Metro bundler crashes**
   ```bash
   npx react-native start --reset-cache
   ```

2. **iOS build fails**
   ```bash
   cd ios && pod install && cd ..
   npm run ios
   ```

3. **Android build fails**
   ```bash
   cd android && ./gradlew clean && cd ..
   npm run android
   ```

### Debug Logs

Enable debug logging in `.env`:

```env
LOG_LEVEL=debug
```

## 📊 Performance

- **Target**: <2s load times
- **Offline Support**: Full article caching
- **Background Sync**: Automatic data synchronization
- **Lazy Loading**: News feed pagination

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes following conventional commits
4. Push to branch and create PR

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Documentation**: This README
- **Issues**: GitHub Issues
- **User Guide**: In-app help system
- **Server API**: See server README
