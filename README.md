# Deadline Guardian AI

Deadline Guardian AI is a state-of-the-art, multi-agent AI-powered project and task management web application designed to proactively prevent missed deadlines. Unlike standard task managers that rely on passive notifications, Deadline Guardian AI features an autonomous cascade of intelligent agents that evaluate task difficulty, monitor completion risk, propose tactical recovery strategies (rescue plans), generate daily schedules, and offer personalized productivity coaching.

---

## Table of Contents

1. [Project Description & Core Value Proposition](#1-project-description--core-value-proposition)
2. [Key Features & AI Agent Systems](#2-key-features--ai-agent-systems)
3. [System Architecture](#3-system-architecture)
4. [Database Schema](#4-database-schema)
5. [API Documentation](#5-api-documentation)
6. [Setup & Installation Guide](#6-setup--installation-guide)
7. [Running the Application](#7-running-the-application)
8. [Testing Suite](#8-testing-suite)

---

## 1. Project Description & Core Value Proposition

In fast-paced working and learning environments, managing multiple overlapping deadlines is challenging. Deadline Guardian AI shifts task management from **reactive** (notifying you *when* a deadline is missed) to **proactive** (predicting *if* you will miss a deadline and intervening before it happens).

### The Core Value Proposition:
- **Continuous Urgency & Effort Analysis**: The moment you create or edit a task, AI agents analyze the required effort, remaining time, and your current workload to compute dynamic priority and risk metrics.
- **Automated Rescue Operations**: If a task's risk score exceeds critical thresholds, the system triggers "Deadline Rescue Mode," formulating a custom, step-by-step recovery plan with daily hour targets and actionable milestones.
- **Intelligent Schedule Allocation**: A dedicated scheduling agent allocates your pending tasks into structured hourly time slots, balancing focus blocks with recharge intervals.
- **Reflective Habit Coaching**: A productivity coach agent runs weekly analyses of your focus consistency, completion rates, and rescue histories to offer tailored advice.

---

## 2. Key Features & AI Agent Systems

The core intelligence of Deadline Guardian AI is powered by five collaborative AI agents integrated via the Google Gemini API (model `gemini-1.5-flash`):

```
                       ┌─────────────────────────┐
                       │   Task Created/Edited   │
                       └────────────┬────────────┘
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │     Priority Agent      │
                       │ (Assigns score & desc)  │
                       └────────────┬────────────┘
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │       Risk Agent        │
                       │ (Evaluates risk level)  │
                       └────────────┬────────────┘
                                    │
                         [Risk Score >= 80%?]
                            /           \
                          Yes            No
                          /               \
                         ▼                 ▼
             ┌──────────────────────┐  ┌──────────────────────┐
             │    Recovery Agent    │  │   Standard Tracking  │
             │ (Generates Rescue)   │  │  (No Rescue Required)│
             └──────────────────────┘  └──────────────────────┘
```

1. **Priority Agent**: Assesses new/modified tasks, compares them against your existing backlog, and assigns a dynamic Priority Score (1–100) alongside a qualitative explanation.
2. **Risk Agent**: Computes a dynamic Risk Score (0–100) and designates a Risk Level (`Low`, `Medium`, `High`) based on the task's estimated hours and time remaining.
3. **Recovery Agent**: Conditionally activated when a task's Risk Score reaches or exceeds **80%**. It automatically generates a "Deadline Rescue Plan" with target daily work hours, estimated success probability, extra work sessions, and immediate distraction-mitigation steps.
4. **Schedule Agent**: Takes your daily available hours and organizes your pending tasks into an optimal day plan, allocating focused deep-work blocks, breaks, and buffers starting at your preferred work start hour.
5. **Productivity Coach Agent**: Generates behavioral insights, focus recommendations, and habit-building strategies based on your historical focus sprint completion rate and rescue resolution statistics.

---

## 3. System Architecture

Deadline Guardian AI follows a modular client-server architecture:

```mermaid
graph TD
    subgraph Frontend [React Frontend - Vite]
        UI[Dashboard & UI Pages]
        API[API Client / utils/api.js]
        Timer[CircularTimer Component]
        Charts[SvgCharts Component]
        
        UI --> API
        UI --> Timer
        UI --> Charts
    end

    subgraph Backend [Express Backend - Node.js]
        Server[Express Server / server.js]
        AuthMid[Auth Middleware / middleware/auth.js]
        Routes[API Routes / routes/*]
        DB[Firestore Handler / db/firestore.js]
        Gemini[Gemini Service / services/geminiService.js]
        
        API -->|HTTP Requests + Bearer JWT| Server
        Server --> AuthMid
        AuthMid --> Routes
        Routes --> DB
        Routes --> Gemini
    end

    subgraph Storage [Data Layer]
        DBFile[(Firebase / Firestore Cloud DB)]
        DB --> DBFile
    end

    subgraph AI [AI Layer]
        GeminiSDK[@google/generative-ai]
        Gemini --> GeminiSDK
        GeminiSDK -.->|API Calls| GeminiAPI[Gemini 1.5 Flash API]
    end
```

### Components Summary:
- **Frontend Client**: Built with **React 19** and **Vite** for rapid hot module replacement. Styles are authored in native **Vanilla CSS** for performance and control. Rich UI dashboards include custom SVG-rendered charts and an interactive Pomodoro-style timer.
- **Backend API**: A RESTful **Node.js Express** server. Incoming requests are filtered through JSON Web Token (JWT) verification middleware to guarantee security.
- **Database Engine**: Integrated with **Google Cloud Firestore** using the Firebase Admin SDK (`firestore.js`) for scalable, low-latency document storage.
- **AI Integrations**: Implemented using the official `@google/generative-ai` SDK. In environments where no API key is specified, the system automatically runs a high-fidelity heuristic fallback engine, ensuring the app remains fully functional off-line or during local development.

---

## 4. Database Schema

The system utilizes Google Cloud Firestore as its primary data store, using the following NoSQL document collections:

### `users`
Represents the user account credentials and profile configurations.
* `id` (String, UUID): Unique user identifier.
* `email` (String): User email address (unique, lowercased).
* `name` (String): Display name.
* `passwordHash` (String): bcrypt-hashed password.
* `settings` (Object):
  * `workStartHour` (Number): 24-hour format start time (e.g. `9`).
  * `workEndHour` (Number): 24-hour format end time (e.g. `17`).
  * `theme` (String): UI theme selection (`light` | `dark`).
* `createdAt` (String, ISO Timestamp): Account creation date.
* `updatedAt` (String, ISO Timestamp): Profile update date.

### `tasks`
Represents user-created tasks, enriched with AI evaluation metrics.
* `id` (String, UUID): Unique task identifier.
* `userId` (String, UUID): Foreign key referencing `users.id`.
* `title` (String): Title of the task.
* `description` (String): Optional task description details.
* `deadline` (String): Target deadline (ISO date-time or string format).
* `estimatedHours` (Number): Estimated effort required to complete the task (optional, defaults to `2`).
* `priorityLevel` (String): User-assigned significance (`low` | `medium` | `high`).
* `status` (String): Task lifecycle status (`pending` | `in_progress` | `completed`).
* `priorityScore` (Number): Dynamic AI-assigned priority rating (1–100).
* `priorityExplanation` (String): AI explanation for the assigned priority score.
* `riskScore` (Number): Dynamic AI-calculated likelihood of missing deadline (0–100).
* `riskLevel` (String): AI risk classification (`Low` | `Medium` | `High`).
* `riskExplanation` (String): AI explanation outlining the primary risk factors.
* `recoveryPlan` (Object | null): Set by the Recovery Agent if `riskScore >= 80`.
  * `strategy` (String): Tactical high-level recovery approach.
  * `extraSessions` (Array of Strings): Specific catch-up work blocks to schedule.
  * `actionSteps` (Array of Strings): Immediate physical actions to mitigate delays.
* `createdAt` (String, ISO Timestamp): Task creation date.
* `updatedAt` (String, ISO Timestamp): Last modification date.

### `rescue_modes`
Tracks active or resolved deadline rescue operations.
* `id` (String, UUID): Unique rescue identifier.
* `userId` (String, UUID): Foreign key referencing `users.id`.
* `taskId` (String, UUID): Foreign key referencing `tasks.id`.
* `status` (String): Status of the rescue operation (`active` | `resolved_success` | `resolved_failed`).
* `requiredDailyHours` (Number): Calculated hours required per day to finish on time.
* `successProbability` (Number): Estimated percentage chance of completion.
* `recoveryStrategy` (String): Tactical recovery description.
* `extraWorkSessions` (Array of Strings): Specific catch-up time blocks.
* `activatedAt` (String, ISO Timestamp): Date when rescue mode was triggered.
* `resolvedAt` (String, ISO Timestamp | null): Date when rescue mode was completed or failed.
* `createdAt` (String, ISO Timestamp)
* `updatedAt` (String, ISO Timestamp)

### `focus_sessions`
Represents individual Pomodoro/deep-work sprints logged by users.
* `id` (String, UUID): Unique focus session identifier.
* `userId` (String, UUID): Foreign key referencing `users.id`.
* `taskId` (String, UUID): Foreign key referencing `tasks.id`.
* `goal` (String): Specific goal set for the focus block.
* `duration` (Number): Target focus duration in minutes (e.g. `25`, `50`).
* `breakDuration` (Number): Associated break length in minutes.
* `status` (String): Outcome of the session (`active` | `completed` | `abandoned`).
* `createdAt` (String, ISO Timestamp)
* `updatedAt` (String, ISO Timestamp)

### `schedules`
Stores generated daily timeline block allocations.
* `id` (String, UUID): Unique schedule identifier.
* `userId` (String, UUID): Foreign key referencing `users.id`.
* `date` (String): Target date (Format: `YYYY-MM-DD`).
* `availableHours` (Number): Hours available for work on that date.
* `allocation` (Array of Objects): Chronological breakdown of the day:
  * `timeSlot` (String): Text interval (e.g. `"09:00 - 11:00"`).
  * `taskId` (String): ID of the task, or special designations (`"break"` | `"buffer"`).
  * `taskTitle` (String): Display title for the slot.
  * `activity` (String): Description of what the user should perform.
* `createdAt` (String, ISO Timestamp)
* `updatedAt` (String, ISO Timestamp)

### `notifications`
System alerts triggered by task cascades, focus sessions, or rescue status changes.
* `id` (String, UUID): Unique notification identifier.
* `userId` (String, UUID): Foreign key referencing `users.id`.
* `type` (String): Category of alert (`rescue_activated` | `focus_reminder` | `deadline_alert`).
* `message` (String): Contextual message payload.
* `read` (Boolean): Read status marker.
* `createdAt` (String, ISO Timestamp)
* `updatedAt` (String, ISO Timestamp)

### `coach_insights`
Stores historical snapshots of generated productivity coaching advice.
* `id` (String, UUID): Unique insight identifier.
* `userId` (String, UUID): Foreign key referencing `users.id`.
* `insights` (Array of Strings): Key observations regarding user work patterns.
* `focusRecommendations` (Array of Strings): Custom suggestions to enhance focus.
* `habitTips` (Array of Strings): Actionable routines for habit building.
* `generatedAt` (String, ISO Timestamp)
* `createdAt` (String, ISO Timestamp)
* `updatedAt` (String, ISO Timestamp)

---

## 5. API Documentation

All endpoints expect JSON request payloads and return JSON responses. Protected routes require authorization header: `Authorization: Bearer <JWT_TOKEN>`.

### Authentication Endpoints

#### Register a New User
* **Route**: `POST /api/auth/register`
* **Payload**:
  ```json
  {
    "email": "user@example.com",
    "password": "strongpassword123",
    "name": "Alex Smith"
  }
  ```
* **Success Response (201 Created)**:
  ```json
  {
    "token": "eyJhbGciOi...",
    "user": {
      "id": "f724b681-...",
      "email": "user@example.com",
      "name": "Alex Smith",
      "settings": { "workStartHour": 9, "workEndHour": 17, "theme": "light" },
      "createdAt": "2026-06-27T09:00:00.000Z",
      "updatedAt": "2026-06-27T09:00:00.000Z"
    }
  }
  ```

#### Log In Existing User
* **Route**: `POST /api/auth/login`
* **Payload**:
  ```json
  {
    "email": "user@example.com",
    "password": "strongpassword123"
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "token": "eyJhbGciOi...",
    "user": { ... }
  }
  ```

#### Fetch Current User Profile
* **Route**: `GET /api/auth/me`
* **Headers**: `Authorization: Bearer <token>`
* **Success Response (200 OK)**: User profile object.

#### Update Settings
* **Route**: `PUT /api/auth/settings`
* **Headers**: `Authorization: Bearer <token>`
* **Payload**: `{ "workStartHour": 8, "workEndHour": 18, "theme": "dark" }`
* **Success Response (200 OK)**: Updated user object.

---

### Tasks Endpoints

#### Get All Tasks
* **Route**: `GET /api/tasks`
* **Headers**: `Authorization: Bearer <token>`
* **Success Response (200 OK)**: Array of tasks, sorted by active status and priority score.

#### Create a Task
* **Route**: `POST /api/tasks`
* **Headers**: `Authorization: Bearer <token>`
* **Payload**:
  ```json
  {
    "title": "Build API Docs",
    "description": "Write comprehensive developer documentation.",
    "deadline": "2026-06-30T17:00:00.000Z",
    "estimatedHours": 8,
    "priorityLevel": "high"
  }
  ```
* **Success Response (201 Created)**: Created task object including AI evaluation values.

#### Update a Task
* **Route**: `PUT /api/tasks/:id`
* **Headers**: `Authorization: Bearer <token>`
* **Payload**: *(Any parameters to update, e.g. `{ "status": "completed" }` or `{ "estimatedHours": 10 }`)*
* **Success Response (200 OK)**: Updated task object (AI scores recomputed).

#### Delete a Task
* **Route**: `DELETE /api/tasks/:id`
* **Headers**: `Authorization: Bearer <token>`
* **Success Response (200 OK)**:
  ```json
  { "success": true, "message": "Task deleted successfully." }
  ```

---

### Rescue Mode Endpoints

#### Get Active Rescue Plans
* **Route**: `GET /api/rescue/active`
* **Headers**: `Authorization: Bearer <token>`
* **Success Response (200 OK)**: Array of active rescue modes with nested task info.

#### Resolve a Rescue Mode
* **Route**: `POST /api/rescue/resolve/:id`
* **Headers**: `Authorization: Bearer <token>`
* **Payload**: `{ "status": "resolved_success" }`
* **Success Response (200 OK)**:
  ```json
  { "success": true, "message": "Rescue mode resolved as resolved_success." }
  ```

---

### Focus Sprints Endpoints

#### Generate Sprint Guidelines
* **Route**: `POST /api/focus/sprint`
* **Headers**: `Authorization: Bearer <token>`
* **Payload**: `{ "taskId": "task-uuid" }`
* **Success Response (200 OK)**:
  ```json
  {
    "taskId": "task-uuid",
    "taskTitle": "Build API Docs",
    "goal": "Execute critical, intensive deep work on Build API Docs. Avoid all distractions.",
    "duration": 50,
    "breakDuration": 10
  }
  ```

#### Start a Focus Session
* **Route**: `POST /api/focus/session`
* **Headers**: `Authorization: Bearer <token>`
* **Payload**: `{ "taskId": "task-uuid", "goal": "Write docs", "duration": 50, "breakDuration": 10 }`
* **Success Response (201 Created)**: Active focus session object.

#### End a Focus Session
* **Route**: `PUT /api/focus/session/:id`
* **Headers**: `Authorization: Bearer <token>`
* **Payload**: `{ "status": "completed" }` *(or `"abandoned"`)*
* **Success Response (200 OK)**: Updated focus session object.

---

### Daily Schedule Endpoints

#### Fetch Schedule
* **Route**: `GET /api/schedule`
* **Headers**: `Authorization: Bearer <token>`
* **Query Params**: `?date=2026-06-27` (Optional, defaults to today)
* **Success Response (200 OK)**: Schedule object for date.

#### Generate Schedule
* **Route**: `POST /api/schedule/generate`
* **Headers**: `Authorization: Bearer <token>`
* **Payload**: `{ "availableHours": 6, "date": "2026-06-27" }`
* **Success Response (200 OK)**: Generated/updated daily schedule allocation object.

---

### Notifications Endpoints

#### Get Notifications
* **Route**: `GET /api/notifications`
* **Headers**: `Authorization: Bearer <token>`
* **Success Response (200 OK)**: Array of notifications.

#### Mark Read
* **Route**: `PUT /api/notifications/:id/read`
* **Headers**: `Authorization: Bearer <token>`
* **Success Response (200 OK)**: Success confirmation.

#### Clear All Read
* **Route**: `DELETE /api/notifications/clear-read`
* **Headers**: `Authorization: Bearer <token>`
* **Success Response (200 OK)**: Success confirmation.

---

### Analytics & Coach Endpoints

#### Fetch Analytics
* **Route**: `GET /api/analytics`
* **Headers**: `Authorization: Bearer <token>`
* **Success Response (200 OK)**: Analytics payload containing summaries and daily trend charts.

#### Fetch Coach Insights
* **Route**: `GET /api/coach/insights`
* **Headers**: `Authorization: Bearer <token>`
* **Success Response (200 OK)**: Object containing insights, focus recommendations, and habit building tips.

---

## 6. Setup & Installation Guide

### Prerequisites
* **Node.js**: Version 18.x or 20.x or higher.
* **npm**: Version 9.x or higher.
* **Gemini API Key**: Access key from Google AI Studio.

### Step-by-Step Installation

1. **Clone the Repository**:
   ```bash
   git clone <repository_url>
   cd "Deadline Guardian"
   ```

2. **Install All Dependencies**:
   A convenience script is located in the root directory to install all packages for the root project, the Express backend, and the React frontend:
   ```bash
   npm run install-all
   ```

3. **Configure Environment Variables**:
   Navigate to the `backend/` directory, copy the `.env.example` file, and name it `.env`:
   ```bash
   cd backend
   cp .env.example .env
   ```
   Open `.env` and insert your configurations:
   * **PORT**: The port the backend server listens on (defaults to `5000`).
   * **JWT_SECRET**: Secure JWT signing key (recommend changing from default).
   * **GEMINI_API_KEY**: Your API key from **[Google AI Studio](https://aistudio.google.com/)**.
   * **GEMINI_MODEL**: The model identifier (defaults to `gemini-2.5-flash` for high performance, but can be set to `gemini-1.5-flash` if preferred).
   
   *Note: If no API key is provided, the application will run in heuristic **Mock AI mode**.*

4. **Configure Firebase Admin Credentials**:
   To connect the backend to Google Cloud Firestore, you must provide a Firebase Service Account key.
   * Generate a new private key from your Firebase Project Console (`Project Settings` > `Service Accounts` > `Generate new private key`).
   * Save the downloaded JSON file as `backend/firebase-service-account.json`.

5. **Verify Your Setup (Diagnostics)**:
   You can run the built-in system diagnostics tool to verify that your directory, dependencies, database, environment variables, and Gemini API connection are fully configured and functional:
   ```bash
   npm run diagnose
   ```
   This will test your API connection in real time and verify if the AI agents are active.

---

## 7. Running the Application

### Development Mode
To run both the backend server and the frontend client concurrently with auto-reload, execute the following command in the project root:
```bash
npm run dev
```
* **Frontend client** runs on: `http://localhost:5173`
* **Backend API server** runs on: `http://localhost:5000`

### Production Mode
1. **Build the Frontend assets**:
   ```bash
   npm run build:frontend
   ```
2. **Serve from the Backend**:
   Run the backend server with `SERVE_STATIC=true` or set `NODE_ENV=production` inside your `.env`. The Express server will compile and host the static files:
   ```bash
   npm run dev:backend
   ```
   Open `http://localhost:5000` to view the running web application.

---

## 8. Testing Suite

The backend service contains an automated testing suite utilizing Jest and Supertest.

### Running Backend Tests
1. Change directory to the backend folder:
   ```bash
   cd backend
   ```
2. Execute the test command:
   ```bash
   npm test
   ```

### Running Test Coverage
To generate a comprehensive test coverage report, run:
```bash
npm run test:coverage
```
The Jest configuration enforces strict coverage thresholds:
* **Branches**: 75%
* **Functions**: 90%
* **Lines**: 90%
* **Statements**: 85%

---

## License

This project is licensed under the MIT License.
