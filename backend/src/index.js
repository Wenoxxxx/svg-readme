require('dotenv').config();
const express = require('express');
const cors = require('cors');
const projectRoutes = require('./routes/projectRoutes');
const { errorHandler } = require('./middleware/errorMiddleware');

const app = express();

app.use(cors());
app.use(express.json());

// Basic health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Mount Routes
app.use('/api/projects', projectRoutes);

// Error Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
