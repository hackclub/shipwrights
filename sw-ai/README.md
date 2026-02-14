# SW-AI

AI service for the Shipwrights team at Hack Club. Handles ticket analysis, message cleanup, issue detection, and project classification.

## Features

- **Ticket Summary** - Analyzes ticket conversations and generates summaries with status and next steps
- **Message Autocomplete** - Rewrites staff messages to be clearer and more professional
- **Issue Detection** - Classifies tickets to check if they're within Shipwrights scope
- **Project Type Classification** - Categorizes projects (CLI, Web App, Desktop App, Hardware, etc.)
- **Project Summary** - Generates summaries from project READMEs

## Setup

### 1. Install dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure environment
```bash
cp example.env .env
```

Fill in `.env`:
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` - MySQL connection
- `SW_API_KEY` - Auth key for requests (make up any string)
- `OPENROUTER_KEY` - Your OpenRouter API key

### 3. Run
```bash
cd Source
python app.py
```

Runs on port `45200`.

## API Endpoints

All endpoints (except `/health`) need `X-API-Key` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/tickets/summary` | Get ticket summary |
| GET | `/tickets/complete` | Rewrite staff message |
| GET | `/tickets/detect` | Check if ticket is in scope |
| POST | `/projects/type` | Classify project type |
| POST | `/projects/summary` | Get project summary |

## Docker

```bash
docker build -t sw-ai .
docker run -p 45200:45200 --env-file .env sw-ai
```

## Stack

- Python + Flask
- MySQL
- OpenRouter 
