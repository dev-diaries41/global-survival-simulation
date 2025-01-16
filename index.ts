import { SurvivalSimulation, GlobalState, saveFile  } from "./src";

const initialGlobalState: GlobalState = {
    year: 0,
    totalPopulation: 8_000_000_000,
    totalResources: { food: 1_000, energy: 1_000, water: 1_000 },
    nations: [],
    isGlobalCollapse: false,
};

(async () => {
    const sim = new SurvivalSimulation(initialGlobalState)
    const result = await sim.run();
    saveFile(JSON.stringify(result, null, 2), `sim_result_${Date.now()}.json`);
})();