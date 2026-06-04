import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Render sets the PORT environment variable automatically
const PORT = process.env.PORT || 3000;

// Serve static assets from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Support Single Page Application (SPA) routing fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Production server running on port ${PORT}`);
});
