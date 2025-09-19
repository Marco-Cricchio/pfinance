# pFinance - Personal Finance Management Dashboard

**pFinance** is a modern Next.js financial dashboard application that provides AI-powered transaction analysis and comprehensive financial management. The application processes PDF and XLSX financial documents, automatically categorizes transactions using AI, and provides intelligent financial insights through interactive dashboards with advanced filtering capabilities.

## ✨ Key Features

- **🔐 Encrypted Backups**: Military-grade AES-256-GCM encryption for secure data backups
- **📊 Universal Category Toggle**: One-click toggle to show/hide all categories across all dashboard views
- **🤖 AI-Powered Analysis**: Three distinct AI analysis modes - Overview Dashboard, Advanced Analytics, and Intelligent Analysis
- **📋 Multi-Format PDF Parsing**: Supports multiple bank statement formats including BancoPosta
- **🏷️ Smart Categorization**: Automatic transaction categorization with OpenRouter API integration and custom rules
- **📈 Interactive Dashboards**: Real-time financial analytics with advanced charts and insights
- **🚫 Smart Duplicate Detection**: Prevents duplicate transaction imports with intelligent matching
- **💾 SQLite Database**: Lightweight, serverless database for secure transaction storage
- **💬 AI Financial Advisor**: Interactive chat interface for personalized financial advice
- **🔍 Advanced Analytics**: Deep financial insights with spending patterns and trend analysis

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenRouter API key (for AI features)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd pfinance
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:
```env
# OpenRouter API Key for AI features (required)
NEXT_PUBLIC_OPENROUTER_API_KEY=your_openrouter_api_key_here

# Password for showing real amounts instead of obfuscated values (optional)
SHOW_AMOUNTS=your_password_here
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) to view the application.

> **Note**: The application will automatically create the SQLite database in the `data/` directory on first run.

## 📄 Supported Document Formats

### PDF Bank Statements

#### BancoPosta Format (NEW)
- **Auto-detected** format for BancoPosta statements
- Extracts IBAN, account holder, and statement date
- Parses "LISTA MOVIMENTI" table with full transaction details
- Supports balance extraction (SALDO CONTABILE and SALDO DISPONIBILE)

#### Legacy PDF Format
- Supports traditional Italian bank statement formats
- Dual-date parsing (Data Contabile, Data Valuta)
- Flexible text-based transaction extraction

### Excel/CSV Files
- Standard CSV with headers: Date, Amount, Description
- Excel files (.xlsx) with transaction data
- Flexible column mapping

## 🏗️ Architecture

### Core Stack
- **Frontend**: Next.js 15.5+ with App Router, TypeScript, Tailwind CSS 4
- **UI Components**: Custom components with Radix UI primitives (Select, Tabs, Slot)
- **Backend**: Next.js API routes with server-side processing  
- **Database**: SQLite with better-sqlite3 (auto-created in `data/` directory)
- **AI Integration**: OpenRouter API with OpenAI client for multiple model support
- **Charts**: Recharts for comprehensive financial data visualization
- **File Processing**: Advanced PDF parsing (pdfjs-dist) and Excel parsing (papaparse, xlsx)
- **Encryption**: Built-in AES-256-GCM encryption for secure backups
- **Styling**: Tailwind CSS with class-variance-authority and clsx utilities

### Parser Architecture
The application uses a plugin-style parser architecture:

1. **Format Detection**: Automatic format detection via `formatDetectors.ts`
2. **Specialized Parsers**: Format-specific parsers (e.g., `bancoPostaParser.ts`)
3. **Fallback Support**: Legacy parser for unsupported formats
4. **Unified Output**: All parsers produce standard Transaction objects

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|----------|
| `NEXT_PUBLIC_OPENROUTER_API_KEY` | OpenRouter API key for AI categorization and analysis | Yes | - |
| `SHOW_AMOUNTS` | Password for showing real amounts instead of obfuscated values | No | (obfuscated by default) |

### Database Schema

The application automatically creates SQLite tables:
- `transactions`: Core transaction storage
- `categories`: Transaction categories
- `category_rules`: Pattern-based categorization rules
- `file_balances`: Extracted account balances
- `ai_chat_sessions` & `ai_chat_messages`: AI chat functionality

## 📊 Usage

### Core Workflow

1. **Upload Documents**: Upload PDF bank statements or Excel files through the intuitive dashboard
2. **Auto-Categorization**: Transactions are automatically categorized using AI and custom rules
3. **Multi-View Analysis**: 
   - **Overview Dashboard**: General financial overview with key metrics
   - **Advanced Analytics**: Deep dive into spending patterns and trends
   - **Intelligent Analysis**: AI-powered insights and recommendations
4. **Category Management**: Use the universal toggle to show/hide all categories across views
5. **Review & Edit**: Manually adjust categories and transaction details as needed
6. **AI Chat**: Interactive financial advisor for personalized advice and insights
7. **🔐 Secure Backups**: Create encrypted backups to protect your financial data

### Key Dashboard Features

- **Universal Category Toggle**: One-click control to show or hide all transaction categories
- **Real-time Charts**: Interactive visualizations including waterfall charts, spending profiles, and balance evolution
- **Smart Filtering**: Advanced filtering options across all dashboard views
- **Amount Visibility Control**: Toggle between real and obfuscated amounts for privacy

### Encrypted Backups

pFinance now includes **military-grade encrypted backups** to protect your sensitive financial data:

- **AES-256-GCM Encryption**: Industry-standard encryption with authenticated encryption
- **Custom Passwords**: Each backup is protected with your chosen password  
- **Complete Data Export**: Includes transactions, categories, rules, balances, and audit logs
- **Legacy Compatibility**: Existing JSON backups continue to work seamlessly
- **Secure Format**: Files use `.enc` extension and structured metadata

**How to use:**
1. Go to **Settings** → **Database Backup**
2. Enable **"Backup Cifrato (Raccomandato)"**
3. Set a strong password (min 8 characters)
4. Configure date range and options
5. Click **"Crea Backup Cifrato"**

For detailed instructions and security considerations, see [📚 **Encrypted Backups Documentation**](docs/ENCRYPTED_BACKUPS.md)

## 🔄 Category Toggle Feature

The **Universal Category Toggle** is a powerful feature that allows you to instantly show or hide all transaction categories across all dashboard views:

- **One-Click Control**: Toggle all categories on/off with a single switch
- **Consistent Across Views**: Works seamlessly in Overview Dashboard, Advanced Analytics, and Intelligent Analysis
- **Real-time Updates**: Charts and analytics update immediately when toggling categories
- **State Persistence**: Your toggle preference is remembered across sessions

For complete feature documentation, see [📚 **Category Toggle Documentation**](docs/CATEGORY_TOGGLE_FEATURE.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📈 Version

**Current Version**: 2.0.1

## 🚀 Recent Updates

- ✅ Universal Category Toggle functionality
- ✅ Enhanced encrypted backup system
- ✅ Three-tier dashboard architecture
- ✅ Advanced AI analysis capabilities
- ✅ Improved security and data protection

For detailed version history, see [CHANGELOG.md](CHANGELOG.md)

## 📝 License

This project is open source and available for personal use.
