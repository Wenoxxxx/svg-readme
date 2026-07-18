const prisma = require("../config/db");

// @desc    Get all projects
// @route   GET /api/projects
const getProjects = async (req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      include: {
        layers: {
          include: {
            elements: true,
          },
        },
      },
    });
    res.json(projects);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProjects,
};
