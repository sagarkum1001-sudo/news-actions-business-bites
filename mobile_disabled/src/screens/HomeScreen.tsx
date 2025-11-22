import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';

// API and Types
import {apiClient, Article, BusinessBitesResponse} from '../services/api';
import {RootStackParamList} from '../../App';

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ArticleDetail'
>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

const HomeScreen: React.FC<HomeScreenProps> = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [market, setMarket] = useState('US');
  const [pagination, setPagination] = useState<any>(null);
  const [dailySummary, setDailySummary] = useState<any>(null);

  useEffect(() => {
    loadArticles();
  }, [market]);

  const loadArticles = async (page: number = 1, isRefreshing: boolean = false) => {
    try {
      if (!isRefreshing) setLoading(true);

      const response: BusinessBitesResponse = await apiClient.getBusinessBitesArticles(market, page);
      setArticles(response.articles);
      setPagination(response.pagination);
      setDailySummary(response.daily_summary);
    } catch (error) {
      console.error('Error loading articles:', error);
      Alert.alert('Error', 'Failed to load news articles. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadArticles(1, true);
  };

  const handleArticlePress = async (article: Article) => {
    try {
      // Log article access
      await apiClient.logArticleAccess(article.business_bites_news_id);

      // Navigate to article detail (you can implement this screen later)
      // navigation.navigate('ArticleDetail', { articleId: article.business_bites_news_id });
      Alert.alert('Article', `Opening: ${article.title}`);
    } catch (error) {
      console.error('Error logging article access:', error);
    }
  };

  const getImpactColor = (score: number) => {
    if (score >= 7.5) return '#10B981'; // Green for positive
    if (score <= 5.5) return '#EF4444'; // Red for negative
    return '#6B7280'; // Gray for neutral
  };

  const renderArticle = ({item}: {item: Article}) => (
    <TouchableOpacity
      style={styles.articleCard}
      onPress={() => handleArticlePress(item)}
      activeOpacity={0.7}>
      <View style={styles.articleHeader}>
        <View style={styles.titleContainer}>
          <Text style={styles.articleTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.articleSummary} numberOfLines={3}>
            {item.summary}
          </Text>
        </View>
        <View style={styles.impactContainer}>
          <Text
            style={[
              styles.impactScore,
              {color: getImpactColor(item.impact_score)}
            ]}>
            {item.impact_score}
          </Text>
          <Text style={styles.sentiment}>{item.sentiment}</Text>
        </View>
      </View>

      <View style={styles.articleMeta}>
        <Text style={styles.sector}>{item.sector}</Text>
        <Text style={styles.source}>{item.source_system}</Text>
        <Text style={styles.publishedAt}>
          {new Date(item.published_at).toLocaleDateString()}
        </Text>
      </View>

      {item.source_links && item.source_links.length > 1 && (
        <View style={styles.sourceLinks}>
          <Text style={styles.sourceLinksText}>
            +{item.source_links.length - 1} more sources
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Business Bites</Text>
      {dailySummary && (
        <View style={styles.dailySummary}>
          <Text style={styles.summaryTitle}>Daily Market Activity</Text>
          <Text style={styles.summaryText}>
            {dailySummary.total_articles} articles, avg impact: {dailySummary.avg_impact_score}
          </Text>
          <Text style={styles.sentimentOverall}>
            Sentiment: {dailySummary.sentiment}
          </Text>
        </View>
      )}
    </View>
  );

  if (loading && articles.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading latest news...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}

      <FlatList
        data={articles}
        renderItem={renderArticle}
        keyExtractor={(item) => item.business_bites_news_id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#007AFF']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No articles found</Text>
            <Text style={styles.emptySubtext}>Pull down to refresh</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    backgroundColor: '#007AFF',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  dailySummary: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
    borderRadius: 8,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 2,
  },
  sentimentOverall: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  listContainer: {
    padding: 15,
  },
  articleCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  articleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 20,
    marginBottom: 6,
  },
  articleSummary: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
  },
  impactContainer: {
    alignItems: 'center',
    minWidth: 50,
  },
  impactScore: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  sentiment: {
    fontSize: 10,
    color: '#6B7280',
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  articleMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  sector: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  source: {
    fontSize: 12,
    color: '#6B7280',
  },
  publishedAt: {
    fontSize: 12,
    color: '#6B7280',
  },
  sourceLinks: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  sourceLinksText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  emptyContainer: {
    paddingVertical: 50,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});

export default HomeScreen;
