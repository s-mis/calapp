# Calorie AI

A calorie tracking application with a FastAPI backend and React frontend.

## Project Structure

```
calorie-ai/
├── backend/          # FastAPI backend
│   ├── app/          # Application code
│   ├── data/         # SQLite database
│   └── requirements.txt
└── frontend/         # React + Vite frontend
    └── package.json
```

## Prerequisites

- Python 3.10+
- Node.js 18+
- npm or yarn

## Development Setup

### Backend

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a virtual environment:
   ```bash
   # Windows
   python -m venv venv
   venv\Scripts\activate

   # macOS/Linux
   python -m venv venv
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Start the development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

   The API will be available at `http://localhost:8000`

   API docs: `http://localhost:8000/docs`

### Frontend

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:5173`

## Running Both Services

Open two terminal windows:

**Terminal 1 - Backend:**
```bash
cd backend
venv\Scripts\activate  # or source venv/bin/activate on macOS/Linux
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

## Tech Stack

**Backend:**
- FastAPI
- SQLAlchemy (SQLite)
- Pydantic
- Uvicorn

**Frontend:**
- React 18
- TypeScript
- Vite
- TailwindCSS
- React Query
- React Router
