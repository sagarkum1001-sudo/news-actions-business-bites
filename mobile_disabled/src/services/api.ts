import axios, {AxiosInstance, AxiosResponse} from 'axios';
import Config from 'react-native-config';

// API Configuration
const API_BASE_URL = Config.API_BASE_URL || __DEV__
  ? 'http://localhost:3000'
  : 'https://news-actions-business-bites.vercel.app';

// API Response Types
export interface Article {
  business_bites_news_id: string;
  title: string;
  summary: string;
  market: string;
  sector: string;
  impact_score: number;
  sentiment: string;
  link: string;
  urlToImage?: string;
  thumbnail_url?: string;
  published_at: string;
  source_system: string;
  author?: string;
  summary_short?: string;
  alternative_sources?: any;
  rank: number;
  slno: number;
  source_links: SourceLink[];
}

export interface SourceLink {
  title: string;
  source: string;
  url: string;
  published_at: string;
  rank: number;
}

export interface Pagination {
  current_page: number;
  total_pages: number;
  total_articles: number;
  has_previous: boolean;
  has_next: boolean;
  previous_page?: number;
  next_page?: number;
}

export interface DailySummary {
  total_articles: number;
  avg_impact_score: number;
  sentiment: string;
  summary: string;
}

export interface BusinessBitesResponse {
  articles: Article[];
  market: string;
  pagination: Pagination;
  daily_summary?: DailySummary;
}

export interface User {
  user_id: string;
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  access_type_name: string;
  access_description: string;
}

export interface Session {
  session_id: string;
  user_id: string;
  user_type: string;
  login_method: string;
  permissions: string[];
  google_user?: any;
  created_at: string;
  expires_at: string;
}

export interface Watchlist {
  id: string;
  user_id: string;
  watchlist_name: string;
  watchlist_category: string;
  market: string;
  created_at: string;
  updated_at: string;
  items: string[];
}

export interface FeedbackItem {
  id: string;
  user_id: string;
  type: string;
  title: string;
  description: string;
  status: string;
  submitted_at: string;
}

// API Client Class
class ApiClient {
  private client: AxiosInstance;
  private sessionId?: string;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      config => {
        if (this.sessionId) {
          config.headers['X-Session-ID'] = this.sessionId;
        }
        return config;
      },
      error => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      response => response,
      error => {
        if (error.response?.status === 401) {
          // Handle unauthorized access
          this.sessionId = undefined;
        }
        return Promise.reject(error);
      }
    );
  }

  // Session management
  setSessionId(sessionId: string) {
    this.sessionId = sessionId;
  }

  getSessionId(): string | undefined {
    return this.sessionId;
  }

  clearSession() {
    this.sessionId = undefined;
  }

  // Core API Methods

  // Markets
  async getMarkets(): Promise<string[]> {
    const response = await this.client.get<string[]>('/api/markets');
    return response.data;
  }

  // Sectors
  async getSectors(): Promise<string[]> {
    const response = await this.client.get<string[]>('/api/sectors');
    return response.data;
  }

  // Business Bites Articles
  async getBusinessBitesArticles(
    market: string = 'US',
    page: number = 1
  ): Promise<BusinessBitesResponse> {
    const response = await this.client.get<BusinessBitesResponse>(
      '/api/news/business-bites/',
      {
        params: {market, page}
      }
    );
    return response.data;
  }

  // Individual Article
  async getArticle(articleId: string): Promise<Article> {
    const response = await this.client.get<Article>(`/api/articles/${articleId}`);
    return response.data;
  }

  // Authentication
  async lookupOrCreateUser(userData: {
    sub: string;
    email: string;
    name?: string;
    picture?: string;
  }): Promise<{user: User; session: Session}> {
    const response = await this.client.post<{
      success: boolean;
      user: User;
      session: Session;
    }>('/api/users/lookup-or-create/', userData);
    return response.data;
  }

  async createSession(sessionData: {
    user_type: string;
    login_method: string;
    google_user?: any;
  }): Promise<Session> {
    const response = await this.client.post<Session>(
      '/api/auth/session',
      sessionData
    );
    this.setSessionId(response.data.session_id);
    return response.data;
  }

  // Article Access Logging
  async logArticleAccess(articleId: string, userType: string = 'free'): Promise<void> {
    await this.client.post('/api/articles/access', {
      article_id: articleId,
      user_type: userType
    });
  }

  // Read Later functionality
  async addToReadLater(
    userId: string,
    articleId: string,
    articleData?: {
      title?: string;
      url?: string;
      sector?: string;
      source_system?: string;
    }
  ): Promise<{read_later_id: number; article_id: string}> {
    const response = await this.client.post<{
      success: boolean;
      data: {read_later_id: number; article_id: string};
    }>('/api/user-preferences/add/', {
      user_id: userId,
      preference_type: 'read_later',
      item_type: 'article',
      item_id: articleId,
      ...articleData
    });
    return response.data.data;
  }

  async getReadLater(userId: string): Promise<{articles: any[]; count: number}> {
    const response = await this.client.get<{
      success: boolean;
      articles: any[];
      count: number;
    }>(`/api/user/read-later/${userId}`);
    return response.data;
  }

  async removeFromReadLater(userId: string, articleId: string): Promise<{deleted: boolean}> {
    const response = await this.client.delete<{
      success: boolean;
      deleted: boolean;
    }>('/api/user/read-later/', {
      data: {user_id: userId, article_id: articleId}
    });
    return response.data;
  }

  // User Assist (Feedback)
  async submitFeedback(
    userId: string,
    type: 'bug_report' | 'feature_request',
    title: string,
    description: string
  ): Promise<{feedback_id: string}> {
    const response = await this.client.post<{
      success: boolean;
      feedback_id: string;
    }>('/api/user-assist/submit', {
      user_id: userId,
      type,
      title,
      description
    });
    return response.data;
  }

  async getFeedbackHistory(userId: string): Promise<{feedback: FeedbackItem[]; count: number}> {
    const response = await this.client.get<{
      success: boolean;
      feedback: FeedbackItem[];
      count: number;
    }>(`/api/user-assist/history/${userId}`);
    return response.data;
  }

  // Search
  async searchSimilar(
    query: string,
    market: string = 'US',
    userId?: string
  ): Promise<{articles: any[]; count: number}> {
    const response = await this.client.get<{
      success: boolean;
      articles: any[];
      count: number;
    }>('/api/search-similar', {
      params: {query, market, user_id: userId}
    });
    return response.data;
  }

  // Watchlist APIs
  async getWatchlists(userId: string): Promise<{watchlists: Watchlist[]; count: number}> {
    const response = await this.client.get<{
      success: boolean;
      watchlists: Watchlist[];
      count: number;
    }>(`/api/watchlists/${userId}`);
    return response.data;
  }

  async createWatchlist(
    userId: string,
    name: string,
    type: string,
    market: string = 'US'
  ): Promise<{watchlist_id: string; watchlist: Watchlist}> {
    const response = await this.client.post<{
      success: boolean;
      watchlist_id: string;
      watchlist: Watchlist;
    }>('/api/watchlists/create', {
      user_id: userId,
      name,
      type,
      market
    });
    return response.data;
  }

  async addToWatchlist(
    watchlistId: string,
    itemName: string
  ): Promise<{item_id: number}> {
    const response = await this.client.post<{
      success: boolean;
      item_id: number;
    }>(`/api/watchlists/${watchlistId}/items`, {
      item_name: itemName
    });
    return response.data;
  }

  async removeFromWatchlist(
    watchlistId: string,
    itemName: string
  ): Promise<{deleted: boolean}> {
    const response = await this.client.delete<{
      success: boolean;
      deleted: boolean;
    }>(`/api/watchlists/${watchlistId}/items`, {
      data: {item_name: itemName}
    });
    return response.data;
  }

  async deleteWatchlist(watchlistId: string): Promise<{deleted: boolean}> {
    const response = await this.client.delete<{
      success: boolean;
      deleted: boolean;
    }>(`/api/watchlists/${watchlistId}`);
    return response.data;
  }

  // News Discovery
  async discoverNews(
    userId: string,
    market: string,
    watchlistType: string
  ): Promise<{output: string}> {
    const response = await this.client.post<{
      success: boolean;
      output: string;
    }>('/api/watchlist/discover-news', {
      user_id: userId,
      market,
      watchlist_type: watchlistType
    });
    return response.data;
  }

  // Feature flags and health
  async getFeatures(): Promise<any> {
    const response = await this.client.get('/api/features');
    return response.data;
  }

  async getHealth(): Promise<any> {
    const response = await this.client.get('/health');
    return response.data;
  }

  async getTest(): Promise<any> {
    const response = await this.client.get('/api/test');
    return response.data;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
