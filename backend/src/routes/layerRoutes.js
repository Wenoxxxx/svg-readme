const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams lets us access :projectId from the parent router
const {
  getLayers,
  createLayer,
  updateLayer,
  deleteLayer,
  reorderLayers,
} = require('../controllers/layerController');

// PUT /reorder must be defined BEFORE /:id to avoid "reorder" being treated as an id
router.put('/reorder', reorderLayers);

router.route('/').get(getLayers).post(createLayer);

router.route('/:id').put(updateLayer).delete(deleteLayer);

module.exports = router;
