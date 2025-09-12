# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**pfinance** is a Next.js financial dashboard application that provides AI-powered transaction analysis and management. The application processes PDF and XLSX financial documents, automatically categorizes transactions using AI, and provides intelligent financial insights through interactive dashboards.

## Essential Commands

### Development
```bash
# Start development server with Turbopack
npm run dev

# Build for production with Turbopack
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

### Database Operations
The application automatically creates and manages a SQLite database at `data/pfinance.db`. No manual database setup is required - the database and tables are created on first run.

## Architecture Overview

### Core Stack
- **Frontend**: Next.js 15+ with App Router, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes with server-side processing  
- **Database**: SQLite with better-sqlite3 (auto-created in `data/` directory)
- **AI Integration**: OpenRouter API with multiple model fallbacks
- **Charts**: Recharts for financial data visualization
- **File Processing**: PDF parsing (pdf2pic, pdfjs-dist) and XLSX parsing (papaparse, xlsx)

### Data Flow Architecture
```
Upload (PDF/XLSX) → Parser → AI Categorization → SQLite Storage → Dashboard Visualization
                      ↓
              Fallback Categorization (Rule-based)
```

### Key Directories
```
src/
├── app/                 # Next.js App Router pages and API routes
│   ├── api/            # Backend API endpoints
│   │   ├── parse-pdf/  # PDF transaction parsing
│   │   ├── parse-xlsx/ # Excel file parsing  
│   │   ├── transactions/ # Transaction CRUD operations
│   │   ├── recategorize/ # AI recategorization endpoint
│   │   └── ai-chat/    # Interactive AI chat with streaming support
├── components/         # React UI components
│   ├── Dashboard.tsx   # Main financial dashboard
│   ├── AdvancedDashboard.tsx # Advanced analytics view
│   ├── AIInsights.tsx  # AI-generated financial insights (legacy)
│   └── ChatBox.tsx     # Interactive AI financial advisor chat
├── lib/               # Core business logic
│   ├── database.ts    # SQLite operations and schema
│   ├── ai.ts         # OpenRouter AI integration (legacy insights)
│   ├── aiChat.ts     # AI chat completion with streaming support
│   ├── parsers.ts    # Document parsing utilities
└── categorizer.ts # Transaction categorization engine
├── types/            # TypeScript definitions
└── hooks/            # Custom React hooks for data analysis
```

## Core Workflows

### Transaction Processing Pipeline
1. **File Upload**: User uploads PDF bank statement or XLSX file
2. **Document Parsing**: 
   - PDF: Extract text using pdfjs-dist, convert to structured data
   - XLSX: Parse spreadsheet data using papaparse/xlsx
3. **AI Categorization**: Send transaction descriptions to OpenRouter API for smart categorization
4. **Fallback Logic**: If AI fails, use rule-based categorization in `categorizer.ts`
5. **Duplicate Detection**: Generate transaction hash to prevent duplicate entries
6. **Database Storage**: Insert transactions into SQLite with category assignments
7. **Dashboard Update**: Refresh UI with new transaction data and charts

### AI Integration Pattern
The application uses a multi-tiered AI approach:
- **Primary**: OpenRouter API with model fallbacks (`deepseek/deepseek-r1-0528:free`, `google/gemini-2.0-flash-exp:free`)
- **Fallback**: Rule-based categorization using pattern matching
- **Caching**: Manual category overrides stored in database to prevent re-categorization
- **Chat Interface**: Interactive financial advisor with streaming responses and conversation history

### AI Chat Workflow
1. **Session Management**: Auto-create chat sessions with welcome messages
2. **Context Injection**: AI receives real-time financial data (income, expenses, categories)
3. **Streaming Response**: Server-Sent Events provide real-time response chunks
4. **Conversation Persistence**: All messages stored in SQLite for continuous context
5. **Real Amounts**: Chat sempre mostra importi reali per consigli accurati

### Category Management
- **Auto-categorization**: AI assigns categories based on transaction descriptions
- **Manual Override**: Users can manually assign categories (stored as `manual_category_id`)
- **Rule Engine**: Pattern-based rules for consistent categorization
- **Category Persistence**: Categories and rules stored in SQLite tables

## Environment Configuration

### Required Environment Variables
Create `.env.local` from `.env.example`:
```bash
# OpenRouter API key for AI categorization
NEXT_PUBLIC_OPENROUTER_API_KEY=your_openrouter_api_key_here

# Optional: Password for showing real amounts vs obfuscated
SHOW_AMOUNTS=your_password_here

# Optional: Chat rate limiting (messages per minute per user)
CHAT_RATE_LIMIT=10
```

### Development Setup
```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your OpenRouter API key

# Start development server
npm run dev
```

## Database Schema

The application uses SQLite with the following key tables:

```sql
-- Core transaction storage
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  amount REAL NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  hash TEXT NOT NULL UNIQUE,
  manual_category_id INTEGER,
  is_manual_override BOOLEAN DEFAULT 0
);

-- Category management
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  type TEXT CHECK (type IN ('income', 'expense', 'both')),
  color TEXT DEFAULT '#8884d8',
  is_active BOOLEAN DEFAULT 1
);

-- Pattern-based categorization rules
CREATE TABLE category_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  pattern TEXT NOT NULL,
  match_type TEXT CHECK (match_type IN ('contains', 'startsWith', 'endsWith')),
  priority INTEGER DEFAULT 0,
  enabled BOOLEAN DEFAULT 1
);

-- AI Chat sessions
CREATE TABLE ai_chat_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'default_user',
  title TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_activity DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- AI Chat messages with streaming support
CREATE TABLE ai_chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES ai_chat_sessions(id) ON DELETE CASCADE
);
```

## Important Implementation Details

### Transaction Duplicate Prevention
Each transaction generates a unique hash based on `date-amount-description-type`. This prevents duplicate imports when re-processing the same financial documents.

### AI Model Fallback Chain
The AI service tries multiple models in sequence:
1. `deepseek/deepseek-r1-0528:free` (primary)
2. `google/gemini-2.0-flash-exp:free` (fallback)
3. `google/gemini-2.0-flash-001` (final fallback)
4. Rule-based categorization (if all AI models fail)

### Amount Visibility Context
The app includes a privacy feature that can obfuscate financial amounts. The `AmountVisibilityContext` manages this state across all components.

### File Processing Limitations
- **PDF**: Requires text-based PDFs (not scanned images)
- **XLSX**: Expects standard banking export formats with columns for date, amount, description
- **File Size**: No explicit limits set, but browser upload limitations apply

### Chart and Analysis Features
- **Pareto Analysis**: 80/20 spending analysis using custom hooks
- **Seasonal Trends**: Month-over-month spending patterns
- **Category Breakdowns**: Pie charts and bar charts for expense categorization
- **AI Insights**: Personalized financial advice based on spending patterns

## Performance Considerations

- **Database**: SQLite performs well for personal finance data volumes
- **AI Calls**: Cached category assignments reduce API usage
- **File Processing**: Large files processed on server-side to avoid browser memory issues
- **Chart Rendering**: Recharts handles large datasets efficiently with built-in optimization