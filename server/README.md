# EduPoll Backend

Express API backend for EduPoll.

## Folder Structure
- `config/`: Configuration files and setup.
- `controllers/`: Route handlers (Authentication, Polls, Messages, etc.).
- `routes/`: API endpoint definitions.
- `middleware/`: Express middleware (auth, error handling).
- `services/`: Business logic and external API integrations.
- `database/`: Database connections.
- `utils/`: Utility functions.

## Development
```bash
npm install
npm run dev
```

## Deployment
This project is configured for deployment on Render. 
The included `render.yaml` ensures correct infrastructure provisioning and environment variables.
