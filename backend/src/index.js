require('dotenv').config();
const express = require('express');
const cors = require('cors');
const projectRoutes = require('./routes/projectRoutes');
const layerRoutes = require('./routes/layerRoutes');
const { errorHandler } = require('./middleware/errorMiddleware');
const prisma = require('./config/db');

const app = express();

app.use(cors());
app.use(express.json());

// Seed default User/Project for development lookup
async function seedDefaultData() {
  try {
    const defaultUserId = '00000000-0000-0000-0000-000000000000';
    const defaultProjectId = '00000000-0000-0000-0000-000000000001';

    await prisma.user.upsert({
      where: { id: defaultUserId },
      update: {},
      create: {
        id: defaultUserId,
        email: 'default@example.com'
      }
    });

    await prisma.project.upsert({
      where: { id: defaultProjectId },
      update: {},
      create: {
        id: defaultProjectId,
        userId: defaultUserId,
        name: 'Default Project'
      }
    });
    console.log('✓ Seeding complete: Default User and Project are verified.');
  } catch (error) {
    console.error('Failed to seed default database records:', error);
  }
}

seedDefaultData();

// Basic health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Mount Routes
app.use('/api/projects', projectRoutes);
// Layers are nested under a project: /api/projects/:projectId/layers
app.use('/api/projects/:projectId/layers', layerRoutes);

// Error Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
