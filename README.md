# CoSphere - Backend API Service (Prisma 7 Setup)

This is the standalone backend API service for CoSphere. It handles user authentication, project management, task board configurations, comments, and file attachments. It is built with Express, TypeScript, and **Prisma 7**.

---

## Features Overview

*   **User Authentication**: Secure JWT-based session and token handling.
*   **Role-Based Access Control (RBAC)**: Distinct permissions for `ADMIN`, `PROJECT_MANAGER`, and `TEAM_MEMBER`.
*   **Project Management**: Creation, modification, deletion, and team member management.
*   **Task Board Actions**: Task lifecycle tracking (Todo, In Progress, Completed), priority, and assignees.
*   **Granular Task Collaboration**:
    *   Task assignees, project members, creators, and admins can post comments and upload file attachments.
    *   Interactive file uploads handled locally.
*   **Activity Logs**: Automated logging of project creation, task completion, and user activities.

---

## Prisma 7 Configuration

Prisma 7 introduces a Rust-free client architecture and separates datasource environment configurations from `schema.prisma`.

1.  **TypeScript Configurations**: The database connection string is configured dynamically in `prisma.config.ts` using the `DATABASE_URL` environment variable.
2.  **Driver Adapters**: Standard database queries use a runtime PostgreSQL driver adapter (`@prisma/adapter-pg` linked to a native Node `pg.Pool`) defined in `src/shared/prisma.ts` and `prisma/seed.ts`.
3.  **Local Client Output**: The Prisma Client is generated locally into `src/generated/client` instead of standard `node_modules`. Imports point directly to the local folder (`import { PrismaClient } from '../generated/client/client'`).

---

## Environment Variables

Create a `.env` file in the root of the `CoSphere-Backend` directory. The following variables are required:

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/cosphere?schema=public` |
| `JWT_SECRET` | Secret key for signing JSON Web Tokens | `super_secret_project_key_991823` |
| `PORT` | Listening port for the Express application | `5050` |
| `NODE_ENV` | Running environment (`development` or `production`) | `development` |
| `FRONTEND_URL` | Allowed origin URL for CORS configuration | `http://localhost:3000` |

### `.env` Quick Copy-Paste Template
```env
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/smart_project_collab?schema=public"
JWT_SECRET="super_secret_project_key_991823"
PORT=5050
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"
```

---

## Project Setup Instructions

### 1. Database Initialization
Start your PostgreSQL database instance locally (or configure an existing cloud database like Neon or Railway in your `.env` file).

### 2. Install Dependencies
```bash
npm install
```

### 3. Generate Prisma Client
Build the local type-safe client models:
```bash
npx prisma generate
```

### 4. Apply Database Migrations
Sync the PostgreSQL database schema:
```bash
npx prisma migrate dev
```

### 5. Seed Database
Populate database tables with demo users, projects, tasks, and activities:
```bash
npm run db:seed
```

### 6. Start the Server
*   **Development Mode** (with hot-reloading):
    ```bash
    npm run dev
    ```
*   **Production Build & Execution**:
    ```bash
    npm run build
    npm start
    ```
    The server will run on `http://localhost:5050`.

---

## Demo Credentials

All seed accounts use the default password: **`Password123`**

| Email | Name | Role | Access Level |
| :--- | :--- | :--- | :--- |
| `admin@example.com` | Admin User | `ADMIN` | Full global access (comments/attaches to all tasks, creates projects/members) |
| `pm@example.com` | PM User | `PROJECT_MANAGER` | Can create projects, add members, and manage their tasks |
| `member1@example.com` | John Doe | `TEAM_MEMBER` | Can comment/attach on assigned tasks and projects they are member of |
| `member2@example.com` | Jane Smith | `TEAM_MEMBER` | Can comment/attach on assigned tasks and projects they are member of |
| `member3@example.com` | Bob Johnson | `TEAM_MEMBER` | Can comment/attach on assigned tasks and projects they are member of |

---

## Deployment Instructions

### Prerequisites
*   A hosted PostgreSQL database (e.g. Neon, Aiven, AWS RDS, Supabase).
*   A hosting platform supporting Node.js (e.g. Render, Railway, Fly.io).

### Step-by-Step Deployment (e.g. Render):
1.  **Host the Database**: Set up a PostgreSQL instance on Neon or another cloud provider and copy the connection URI.
2.  **Configure Environment Variables**: In your hosting settings, specify the environment variables. Ensure the `DATABASE_URL` points to your cloud database.
3.  **Set Build Commands**:
    *   **Root Directory**: Leave blank (if repository contains only the backend, otherwise `CoSphere-Backend`)
    *   **Build Command**: `npm run build`
    *   **Start Command**: `npm start`
4.  **Set CORS**: Set `FRONTEND_URL` to your live frontend URL to prevent CORS blockages.
