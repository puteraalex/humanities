// GAME ASSUMPTIONS: invented numbers for play.
// They are NOT NASA measurements or engineering specs.
export const CONFIG = {
  missionSols: 20,
  crew: 4,
  stockMax: 100,
  // power units each system wants per sol
  demand: { lifeSupport: 40, protection: 20, greenhouse: 20, research: 20 },
  defaultPriority: ['lifeSupport', 'protection', 'greenhouse', 'research'],
  perCrewPerSol: { o2: 5, water: 5, food: 5 },
  lifeSupportOutput: { o2: 22, water: 22 }, // at full power
  foodCapacity: 24, // at 100% crop health
  crops: { up: 6, downPerMissingPower: 20 },
  researchPerSol: 5,
  radiationBase: 6,
  exposureLimit: 60,
  healthLoss: { empty: 15, radiation: 5 },
};