# News Actions Business Bites

A standalone Express.js application serving the Business Bites news interface, migrated from the full Django application for lightweight deployment on Vercel.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- SQLite3
- Git

### Local Development
```bash
# Install dependencies
npm install

# Export data from production (if available)
npm run export-data

# Start development server
npm run dev
```

Visit `http://localhost:3000` to view the application.

## 📦 Data Management

### Exporting Data from Production
The application includes a data export script that connects to the original News Actions database:

```bash
# From the original news-actions-app directory
./start.sh 4
```

This will:
1. Export latest `business_bites_display` data
2. Update the GitHub repository
3. Trigger Vercel redeployment

### Manual Data Export
```bash
npm run export-data
```

## 🚀 Deployment

### Vercel (Recommended)
1. **Create GitHub Repository**
   ```bash
   # Create new repository on GitHub
   # Push this code to the repository
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Vercel will automatically detect the configuration

3. **Environment Variables** (Optional)
   Set these in Vercel dashboard if using GitHub Actions:
   ```
   DATABASE_PATH=./db/data.db
   ```

### Manual Deployment
```bash
# Build for production
npm run build

# Start production server
npm start
```

## 🔧 Configuration

### Environment Variables
- `DATABASE_PATH`: Path to SQLite database (default: `./db/data.db`)
- `PORT`: Server port (default: 3000)

### Database
The application uses SQLite with the following structure:
- `business_bites_display` table with news articles
- Automatic initialization from JSON export if database doesn't exist

## 📊 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Main application interface |
| `/api/markets` | GET | List available markets |
| `/api/sectors` | GET | List available sectors |
| `/api/news/business-bites/` | GET | Business bites articles with pagination |
| `/api/test` | GET | API health check |
| `/health` | GET | Application health check |

### Query Parameters for Business Bites
- `market`: Filter by market (e.g., `US`, `China`, `EU`)
- `page`: Page number for pagination (default: 1)

Example: `/api/news/business-bites/?market=US&page=2`

## 🔄 Data Synchronization

### Automated Sync (GitHub Actions)
The repository includes GitHub Actions that automatically:
- Export fresh data daily at 6 AM UTC
- Update the repository with latest articles
- Trigger Vercel redeployment

### Manual Sync
From the original application directory:
```bash
./start.sh 4
```

## 🏗️ Architecture

```
news-actions-business-bites/
├── server/
│   └── index.js              # Express.js server
├── public/
│   ├── index.html           # Frontend interface
│   └── styles.css           # Styles
├── db/
│   ├── business_bites_display.json  # Data export
│   └── export_metadata.json         # Export info
├── scripts/
│   └── export-data.js       # Data export utility
└── .github/workflows/
    └── data-refresh.yml     # Automated updates
```

## 📈 Features

- **Responsive Design**: Works on desktop, tablet, and mobile
- **Real-time Data**: Articles with sentiment analysis and impact scores
- **Pagination**: Efficient loading of large datasets
- **Multi-market Support**: US, China, EU, India, Crypto, and more
- **Source Links**: Multiple sources per article
- **Daily Summaries**: Market sentiment analysis

## 🔧 Development

### Adding New Features
1. Modify `server/index.js` for backend changes
2. Update `public/index.html` for frontend changes
3. Test locally with `npm run dev`
4. Commit and push to trigger deployment

### Database Schema
The `business_bites_display` table includes:
- `business_bites_news_id`: Unique article identifier
- `title`: Article title
- `summary`: Article summary
- `market`: Target market
- `sector`: Business sector
- `impact_score`: Impact rating (1-10)
- `sentiment`: Positive/negative/neutral
- `published_at`: Publication timestamp
- `source_system`: News source
- `link`: Article URL

## 🚨 Troubleshooting

### Database Issues
```bash
# Check database
sqlite3 db/data.db '.tables'
sqlite3 db/data.db 'SELECT COUNT(*) FROM business_bites_display;'
```

### Server Issues
```bash
# Check server logs
npm run dev

# Health check
curl http://localhost:3000/health
```

### Deployment Issues
- Check Vercel build logs
- Verify environment variables
- Ensure database file is in repository

## 📋 Migration Checklist

- [x] Complete system backup created
- [x] Standalone Express.js server extracted
- [x] Business bites UI components migrated
- [x] Data export/import system implemented
- [x] Vercel deployment configuration
- [x] GitHub Actions automation
- [x] Option 4 integration in start.sh
- [ ] GitHub repository created
- [ ] Vercel project connected
- [ ] Environment variables configured
- [ ] Initial deployment tested
- [ ] Data sync automation verified

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes and test locally
4. Submit a pull request

## 📄 License

This project is part of the News Actions application suite.

## 🆘 Support

For issues related to:
- **Data Export**: Check the original News Actions application
- **Deployment**: Check Vercel documentation
- **API Issues**: Review server logs and database connectivity

---

**Note**: This is a migrated component from the full News Actions Django application. For the complete news processing pipeline, see the original repository.
