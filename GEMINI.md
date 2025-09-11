# GEMINI.md

## Project Overview

This is a personal finance application built with Next.js. Its primary purpose is to help users analyze their financial data by importing and visualizing transactions from bank statements.

The application supports parsing of PDF and XLSX files, and leverages an AI-powered service (likely OpenAI) to automatically categorize transactions. It provides financial analysis features, including Pareto (80/20) and seasonal trend analysis, with interactive charts for data visualization.

The backend is powered by Next.js API routes and uses a SQLite database for data storage. The frontend is built with React and styled with Tailwind CSS.

## Building and Running

To work with this project, you'll need to have Node.js and npm installed.

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Run the Development Server:**
    ```bash
    npm run dev
    ```
    This will start the application in development mode with Turbopack. You can access it at [http://localhost:3000](http://localhost:3000).

3.  **Build for Production:**
    ```bash
    npm run build
    ```
    This command builds the application for production usage.

4.  **Start the Production Server:**
    ```bash
    npm run start
    ```
    This command starts the production server.

5.  **Lint the Code:**
    ```bash
    npm run lint
    ```
    This command runs the ESLint to check for code quality and style issues.

## Development Conventions

*   **Framework:** The project uses the Next.js App Router, so new pages and API routes should be created in the `src/app` directory.
*   **Styling:** Styling is done with Tailwind CSS. Utility classes should be used whenever possible.
*   **Database:** The application uses a SQLite database. The database logic is located in `src/lib/database.ts`.
*   **AI Integration:** The AI-powered features are handled by the OpenAI API. The related code can be found in `src/lib/ai.ts`.
*   **File Parsing:** File parsing logic for PDF and XLSX files is located in `src/lib/parsers.ts` and handled by the API routes in `src/app/api/`.
*   **Components:** Reusable UI components are located in the `src/components` directory.
