// A small snapshot of the outpost, recorded after each day for the debrief.
export function snapshot(state) {
  return {
    battery: state.power.battery,
    o2: state.stocks.o2,
    water: state.stocks.water,
    food: state.stocks.food,
    crops: state.crops,
    exposure: state.protection.exposure,
    research: state.research,
    health: state.health,
  };
}

export function historyEntry(step) {
  return {
    day: step.day,
    effects: step.effects,
    activeEvents: step.activeEvents,
    snap: snapshot(step.state),
  };
}