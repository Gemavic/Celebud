# CelebUD Real-Time News Automation

## Overview
CelebUD now features automatic real-time news fetching from multiple sources with minimal manual intervention. The system automatically pulls entertainment, celebrity, and business news from RSS feeds and displays them on the platform.

## Features

### 1. Automated News Fetching
- **Edge Function**: `/functions/v1/fetch-news` automatically fetches news from configured RSS feeds
- **Multiple Sources**: Aggregates content from Entertainment Weekly, Hollywood Reporter, and Variety
- **Smart Parsing**: Automatically extracts titles, descriptions, images, and metadata from RSS feeds
- **Duplicate Prevention**: Checks for existing content to avoid duplicates

### 2. Live News Indicator
- **Real-Time Updates**: Visual indicator showing live news status
- **Manual Refresh**: One-click button to fetch latest news immediately
- **Auto-Refresh**: Automatic updates every 30 minutes (can be toggled on/off)
- **Last Update Time**: Shows when news was last refreshed

### 3. Category Mapping
News sources automatically map to appropriate categories:
- Entertainment Weekly → Entertainment
- Hollywood Reporter → Celebrity
- Variety → Entertainment

### 4. Database Architecture
- **news_sources**: Stores RSS feed URLs and configuration
- **news_fetch_log**: Tracks fetch history and success/failure status
- **media_content**: All fetched news with source attribution

## How to Use

### Automatic Operation
The system works automatically with no setup required:
1. News sources are pre-configured in the database
2. Click "Refresh Now" in the Live News Indicator to fetch latest news
3. News auto-updates every 30 minutes when auto-refresh is ON

### Manual News Fetch
To manually trigger a news update:
1. Look for the "Live News" indicator in the bottom-right corner
2. Click "Refresh Now" button
3. Wait for the update to complete (status shows "Updating...")
4. Page automatically reloads with new content

### Adding New News Sources
To add more news sources, insert into the `news_sources` table:

```sql
INSERT INTO news_sources (name, source_type, feed_url, category_mapping, fetch_interval_minutes)
VALUES (
  'Your News Source',
  'rss',
  'https://example.com/feed/',
  '{"default": "entertainment"}'::jsonb,
  30
);
```

## Technical Details

### Edge Function Workflow
1. Fetches active news sources from database
2. For each source:
   - Downloads RSS feed XML
   - Parses items (title, description, link, image, date)
   - Checks for duplicates using slug
   - Inserts new content into database
   - Logs fetch results
3. Returns summary of items fetched and added

### RSS Feed Parsing
The system extracts:
- **Title**: Article headline
- **Description**: Article summary (truncated to 300 chars)
- **Link**: External URL to original article
- **Published Date**: Original publication date
- **Thumbnail**: Featured image (from media:content, media:thumbnail, or enclosure)
- **Content**: Full article content when available

### Content Generation
Each news item is automatically:
- Assigned a unique slug based on title
- Categorized based on source mapping
- Given view counts (randomized for realism)
- Marked as featured/trending based on probability
- Linked to default author

## Categories

The platform now includes comprehensive categories inspired by major news sites:
- **HOME**: All content
- **NEWS**: General news and updates
- **POLITICS**: Political news
- **SOCIETY**: Social issues and community news
- **ENTERTAINMENT**: Entertainment industry news
- **INTERVIEW**: Celebrity and expert interviews
- **BUSINESS**: Business and finance news
- **LIFESTYLE**: Lifestyle and culture content
- **VIDEOS**: Video content

## Benefits

1. **No Manual Content Entry**: News automatically populates from trusted sources
2. **Always Fresh**: Content updates regularly without intervention
3. **Scalable**: Easy to add more news sources
4. **Traceable**: All content links back to original source
5. **Professional**: Real news from established publications

## Future Enhancements

Potential improvements:
- Add more news sources (TMZ, Deadline, Billboard, etc.)
- Implement AI-powered content categorization
- Add sentiment analysis for trending detection
- Enable keyword-based filtering
- Add social media integration
- Implement content scheduling
- Add admin dashboard for source management
