# Smart Project System - Backend API Service

This is the standalone backend API service for the Smart Project System. It handles user authentication, project management, task board configurations, comments, and file attachments.

---

## Features Overview

- **User Authentication**: Secure JWT-based session and token handling.
- **Role-Based Access Control (RBAC)**: Distinct permissions for `ADMIN`, `PROJECT_MANAGER`, and `TEAM_MEMBER`.
- **Project Management**: Creation, modification, deletion, and team member management.
- **Task Board Actions**: Task lifecycle tracking (Todo, In Progress, Completed), priority, and assignees.
- **Granular Task Collaboration**:
    - Task assignees, project members, creators, and admins can post comments and upload file attachments.
    - Interactive file uploads handled locally.
- **Activity Logs**: Automated logging of project creation, task completion, and user activities.

---

## Environment Variables

Create a `.env` file in the root of the `backend/` directory. The following variables are required:

| Variable       | Description                                         | Example / Default                                                                          |
| :------------- | :-------------------------------------------------- | :----------------------------------------------------------------------------------------- |
| `DATABASE_URL` | PostgreSQL connection string (with schema)          | `postgresql://postgres:postgrespassword@localhost:5432/smart_project_collab?schema=public` |
| `JWT_SECRET`   | Secret key for signing JSON Web Tokens              | `super_secret_project_key_991823`                                                          |
| `PORT`         | Listening port for the Express application          | `5050`                                                                                     |
| `NODE_ENV`     | Running environment (`development` or `production`) | `development`                                                                              |
| `FRONTEND_URL` | Allowed origin URL for CORS configuration           | `http://localhost:3000`                                                                    |

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

Start the local PostgreSQL database using Docker Compose:

```bash
docker-compose up -d
```

_(Alternatively, configure an existing local/cloud PostgreSQL database in your `.env` file)._

### 2. Install dependencies

```bash
npm install
```

### 3. Apply Migrations & Generate Prisma Client

Sync the database with the Prisma schema and generate client types:

```bash
npx prisma migrate dev
```

### 4. Seed Database

Seed the database tables with initial demo users, projects, tasks, and activity logs:

```bash
npx prisma db seed
```

### 5. Start the Server

- **Development Mode** (with hot-reloading):
    ```bash
    npm run dev
    ```
- **Production Build & Execution**:
    ```bash
    npm run build
    npm start
    ```
    The server will run on `http://localhost:5050`.

---

## Demo Credentials

You can use the following pre-seeded users for testing and grading (all users share the password `Password123`):

| Email                 | Name        | Role              | Access Level                                                                  |
| :-------------------- | :---------- | :---------------- | :---------------------------------------------------------------------------- |
| `admin@example.com`   | Admin User  | `ADMIN`           | Full global access (comments/attaches to all tasks, creates projects/members) |
| `pm@example.com`      | PM User     | `PROJECT_MANAGER` | Can create projects, add members, and manage their tasks                      |
| `member1@example.com` | John Doe    | `TEAM_MEMBER`     | Can comment/attach on assigned tasks and projects they are member of          |
| `member2@example.com` | Jane Smith  | `TEAM_MEMBER`     | Can comment/attach on assigned tasks and projects they are member of          |
| `member3@example.com` | Bob Johnson | `TEAM_MEMBER`     | Can comment/attach on assigned tasks and projects they are member of          |

---

## Deployment Instructions

### Prerequisites

- A hosted PostgreSQL database (e.g. Neon, Aiven, AWS RDS, Supabase).
- A hosting platform supporting Node.js (e.g. Render, Railway, Fly.io, Heroku).

### Step-by-Step Deployment:

1. **Host the Database**: Set up a PostgreSQL instance on a cloud provider and copy the connection URI.
2. **Configure Environment Variables**: In your hosting dashboard, specify the environment variables listed in the [Environment Variables](#environment-variables) section above. Make sure the `DATABASE_URL` points to your cloud database.
3. **Set Build Commands**:
    - **Build Command**: `npm run build`
    - **Start Command**: `npm start`
4. **Run Database Migrations on Production**:
   Ensure you run Prisma migrations before starting the application:
    ```bash
    npx prisma migrate deploy
    ```
5. **Set CORS**: Set `FRONTEND_URL` to your live frontend address to prevent CORS blockages.
