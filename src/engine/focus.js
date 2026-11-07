// What the crew can spend a day on. GAME RULES: invented numbers for play.
export const SHIELD_MAX = 0.95;

export const FOCUS = {
  balanced: {
    id: 'balanced',
    label: 'Rest and observe',
    research: 1,
    benefit: 'The crew rests and watches the outpost.',
    cost: 'Nothing gets done today.',
    why: 'A rest day does not change anything.',
    summary: 'The crew rested.',
  },
  science: {
    id: 'science',
    label: 'Run experiments',
    research: 2,
    benefit: 'Research grows twice as fast.',
    cost: 'No time left for repairs or gardening.',
    why: 'In this game, the crew has only so many hours. Experiments use all of them.',
    summary: 'The crew ran experiments all day.',
  },
  reinforce: {
    id: 'reinforce',
    label: 'Strengthen the shelter walls',
    research: 0,
    shielding: 0.04,
    benefit: 'The walls block 4% more radiation, for good.',
    cost: 'No research today.',
    why: 'In this game, extra work on the walls makes the radiation shield stronger for the rest of the mission.',
    summary: 'The crew strengthened the shelter walls.',
  },
  garden: {
    id: 'garden',
    label: 'Tend the greenhouse',
    research: 0.5,
    crops: 12,
    benefit: 'The plants recover (+12% crops).',
    cost: 'Only half as much research.',
    why: 'In this game, careful gardening helps damaged crops grow back faster.',
    summary: 'The crew tended the greenhouse.',
  },
};

export const FOCUS_ORDER = ['science', 'reinforce', 'garden'];

// The choices for today. Some switch off when they would do nothing useful.
export function availableFocuses(state) {
  const off = {
    science: state.research >= 100 ? 'Research is complete!' : null,
    reinforce: state.protection.shielding >= SHIELD_MAX ? 'The walls are as strong as they can be.' : null,
    garden: state.crops >= 95 ? 'The plants are already healthy.' : null,
  };
  const list = FOCUS_ORDER.map((id) => ({
    ...FOCUS[id],
    enabled: !off[id],
    reason: off[id],
  }));
  if (!list.some((f) => f.enabled)) list.push({ ...FOCUS.balanced, enabled: true, reason: null });
  return list;
}