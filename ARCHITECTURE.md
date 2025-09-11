# Architecture Overview

## Project Structure
```
pfinance/
├── src/
│   ├── app/
│   │   └── api/
│   │       ├── parse-pdf/
│   │       ├── parse-xlsx/
│   │       ├── recategorize/
│   │       └── transactions/
│   ├── lib/
│   │   ├── database.ts
│   │   ├── parsers.ts
│   │   ├── ai.ts
│   │   └── utils.ts
│   ├── hooks/
│   │   ├── analysis/useParetoAnalysis.ts
│   │   └── analysis/useSeasonalAnalysis.ts
│   └── types/transaction.ts
├── next.config.ts
└── tailwind.config.ts
```

## Core Components
- **API Routes**: Handle PDF/XLSX parsing (`pdf-parse`, `papaparse`), transaction processing, and AI recategorization
- **Data Layer**: SQLite database with transaction storage and category management
- **AI Integration**: OpenAI API for transaction recategorization and analysis
- **Analysis Hooks**: Custom hooks for Pareto/seasonal financial analysis using Recharts

## Technology Stack
- **Framework**: Next.js 13+ (App Router)
- **Styling**: Tailwind CSS
- **Data Visualization**: Recharts, D3.js
- **Icons**: Lucide React
- **State Management**: React Context API
- **AI**: OpenAI API for NLP-based categorization

## Data Flow
1. User uploads financial statement (PDF/XLSX)
2. API routes parse documents using `pdf-parse`/`papaparse`
3. Transactions stored in SQLite database
4. AI service (`ai.ts`) analyzes and recategorizes transactions
5. Analysis hooks process data for visualizations
6. UI renders interactive charts using Recharts

## Key Features
- **Document Parsing**: Supports PDF bank statements and XLSX exports
- **Smart Categorization**: AI-powered transaction classification
- **Financial Analysis**: Pareto principle (80/20) and seasonal trend analysis
- **Responsive UI**: Mobile-friendly dashboard with interactive charts