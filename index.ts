import { SurvivalSimulation, saveFile  } from "./src";


(async () => {
    const entities = SurvivalSimulation.generateNations(8)
    const sim = new SurvivalSimulation(entities)
    const result = await sim.run();
    saveFile(JSON.stringify(result, null, 2), `sim_result_${Date.now()}.json`);
})();