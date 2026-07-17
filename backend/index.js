const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Get all layers
app.get('/api/layers', async (req, res) => {
  try {
    const layers = await prisma.layer.findMany({
      orderBy: {
        orderIndex: 'asc'
      }
    });
    res.json(layers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch layers' });
  }
});

// Create a new layer
app.post('/api/layers', async (req, res) => {
  try {
    const { id, name, type, locked, visible, active } = req.body;
    const orderIndex = req.body.orderIndex ?? 0;

    const layer = await prisma.layer.create({
      data: {
        id,
        name,
        type,
        locked: locked ?? false,
        visible: visible ?? true,
        active: active ?? true,
        orderIndex
      }
    });
    res.json(layer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create layer' });
  }
});

// Update a layer
app.put('/api/layers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, locked, visible, active, orderIndex } = req.body;
    
    const layer = await prisma.layer.update({
      where: { id },
      data: {
        name,
        locked,
        visible,
        active,
        orderIndex
      }
    });
    res.json(layer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update layer' });
  }
});

// Delete a layer
app.delete('/api/layers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.layer.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete layer' });
  }
});

// Reorder layers (bulk update)
app.put('/api/layers/reorder', async (req, res) => {
  try {
    const { layers } = req.body; // Array of { id, orderIndex }
    
    const updates = layers.map((layer) => 
      prisma.layer.update({
        where: { id: layer.id },
        data: { orderIndex: layer.orderIndex }
      })
    );
    
    await prisma.$transaction(updates);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to reorder layers' });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
