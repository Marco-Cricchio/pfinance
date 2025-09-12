# Finance Dashboard Application

## Project Overview

Next.js application for financial transaction analysis and management with comprehensive dashboard and AI-powered insights.

## Key Features

- **Multi-tier Dashboards**: Overview, Advanced, and Intelligent analysis views
- **File Processing**: PDF and XLSX transaction parsing
- **AI Integration**: Transaction categorization and insights generation
- **Data Visualization**: Multiple chart types for financial analysis
- **Context Management**: Amount visibility toggling for privacy

## Architecture

- **Frontend**: Next.js 14+ with TypeScript and Tailwind CSS
- **Components**: Modular UI components with shadcn/ui foundation
- **State Management**: React Context for amount visibility
- **Data Processing**: Custom parsers for financial documents
- **Charts**: Recharts for data visualization

## Development Guidelines

- Use TypeScript for all new code
- Follow component composition patterns
- Maintain consistent file structure in `/src`
- Keep financial data processing secure and private
- Use proper error handling for file uploads and API calls

## Key Directories

- `/src/app`: Next.js app router structure
- `/src/components`: Reusable UI components
- `/src/lib`: Utilities and core business logic
- `/src/types`: TypeScript type definitions
- `/src/hooks`: Custom React hooks for data analysis
