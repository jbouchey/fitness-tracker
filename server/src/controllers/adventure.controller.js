const { catchAsync } = require('../middleware/errorHandler');
const prisma = require('../config/database');

const VALID_ARCHETYPES = ['wizard', 'archer', 'warrior'];
const VALID_GENDERS = ['male', 'female'];
const VALID_COLORS = ['blue', 'green', 'red', 'yellow'];

const ADVENTURE_SELECT = {
  id: true,
  email: true,
  displayName: true,
  emailVerified: true,
  createdAt: true,
  adventureModeEnabled: true,
  adventureCharacterArchetype: true,
  adventureCharacterGender: true,
  adventureCharacterColor: true,
};

const updateCharacter = catchAsync(async (req, res) => {
  const { archetype, gender, color } = req.body;

  if (!VALID_ARCHETYPES.includes(archetype)) {
    return res.status(400).json({ error: 'Invalid archetype.' });
  }
  if (!VALID_GENDERS.includes(gender)) {
    return res.status(400).json({ error: 'Invalid gender.' });
  }
  if (!VALID_COLORS.includes(color)) {
    return res.status(400).json({ error: 'Invalid color.' });
  }

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      adventureCharacterArchetype: archetype,
      adventureCharacterGender: gender,
      adventureCharacterColor: color,
    },
    select: ADVENTURE_SELECT,
  });

  res.json({ user });
});

const toggleMode = catchAsync(async (req, res) => {
  const { enabled } = req.body;

  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'enabled must be a boolean.' });
  }

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { adventureModeEnabled: enabled },
    select: ADVENTURE_SELECT,
  });

  res.json({ user });
});

module.exports = { updateCharacter, toggleMode };
