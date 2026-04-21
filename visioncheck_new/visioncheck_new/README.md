# VisionCheck Pro

AI-powered eye health screening and eyewear recommendation system.

## Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Set your Anthropic API key (for AI features)
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# 3. Run
python app.py
# Open http://localhost:5000
```

Demo credentials: **test@test.com** / **test123**

## Features

| Module | Description |
|--------|-------------|
| Eye Test | Snellen acuity, Ishihara colour blindness, Astigmatism wheel, Contrast sensitivity, Near vision (Jaeger) |
| Prescription | Add/manage prescriptions with auto-detected conditions |
| Frame Finder | AI-powered frame recommendations + full gallery with purchase links |
| Insights | Charts, lens recommendations, AI health insights |
| Wishlist | Save frames, compare up to 3, direct purchase links |

## AI Features (require ANTHROPIC_API_KEY)

- Frame recommendations based on face shape + prescription
- Personalised eye health insights

## Database

SQLite database auto-created at `visioncheck.db` on first run.

## Tech Stack

Flask · SQLAlchemy · SQLite · Bootstrap 5 · Chart.js · Anthropic Claude API
