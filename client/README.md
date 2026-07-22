# EduPoll Frontend

React & Vite frontend for EduPoll.

## Folder Structure
- `src/components/`: Reusable UI components.
- `src/layouts/`: Dashboard and page layouts.
- `src/pages/`: Individual route pages.
- `src/services/`: API communication.
- `src/assets/`: Images and icons.
- `src/styles/`: Global CSS and modules.

## Development
```bash
npm install
npm run dev
```

## Deployment
This project is configured for seamless deployment on Vercel. 
The included `vercel.json` ensures that client-side routing works by rewriting all requests to `index.html`.
