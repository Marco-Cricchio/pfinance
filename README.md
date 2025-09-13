# pFinance - Personal Finance Management Dashboard

**pFinance** is a Next.js financial dashboard application that provides AI-powered transaction analysis and management. The application processes PDF and XLSX financial documents, automatically categorizes transactions using AI, and provides intelligent financial insights through interactive dashboards.

## ✨ Key Features

- **Multi-Format PDF Parsing**: Supports multiple bank statement formats including BancoPosta
- **AI-Powered Categorization**: Automatic transaction categorization with OpenRouter API integration
- **Interactive Dashboard**: Real-time financial analytics with charts and insights
- **Smart Duplicate Detection**: Prevents duplicate transaction imports
- **SQLite Database**: Lightweight, serverless database for transaction storage
- **AI Financial Advisor**: Interactive chat interface for personalized financial advice

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenRouter API key (for AI features)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd finance
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
NEXT_PUBLIC_OPENROUTER_API_KEY=your_openrouter_api_key_here
SHOW_AMOUNTS=your_password_here
CHAT_RATE_LIMIT=10
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) to view the application.

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
- **Frontend**: Next.js 15+ with App Router, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes with server-side processing  
- **Database**: SQLite with better-sqlite3 (auto-created in `data/` directory)
- **AI Integration**: OpenRouter API with multiple model fallbacks
- **Charts**: Recharts for financial data visualization
- **File Processing**: PDF parsing (pdfjs-dist) and XLSX parsing (papaparse, xlsx)

### Parser Architecture
The application uses a plugin-style parser architecture:

1. **Format Detection**: Automatic format detection via `formatDetectors.ts`
2. **Specialized Parsers**: Format-specific parsers (e.g., `bancoPostaParser.ts`)
3. **Fallback Support**: Legacy parser for unsupported formats
4. **Unified Output**: All parsers produce standard Transaction objects

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_OPENROUTER_API_KEY` | OpenRouter API key for AI categorization | Yes |
| `SHOW_AMOUNTS` | Password for showing real amounts vs obfuscated | No |
| `CHAT_RATE_LIMIT` | Messages per minute per user for AI chat | No |

### Database Schema

The application automatically creates SQLite tables:
- `transactions`: Core transaction storage
- `categories`: Transaction categories
- `category_rules`: Pattern-based categorization rules
- `file_balances`: Extracted account balances
- `ai_chat_sessions` & `ai_chat_messages`: AI chat functionality

## 🧪 Testing

Run the test suite:
```bash
npm test
```

The test suite includes:
- BancoPosta parser validation
- Format detection tests
- Transaction parsing accuracy tests
- Error handling validation

## 📊 Usage

1. **Upload Documents**: Use the dashboard to upload PDF bank statements or Excel files
2. **Auto-Categorization**: Transactions are automatically categorized using AI and rules
3. **Review & Edit**: Manually adjust categories as needed
4. **Analytics**: View spending patterns, trends, and insights
5. **AI Chat**: Ask the AI advisor questions about your finances

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.
