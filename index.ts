import { SurvivalSimulation, saveFile  } from "./src";


(async () => {
    const sim = new SurvivalSimulation()
    console.log(sim)
    const result = await sim.run();
    saveFile(JSON.stringify(result, null, 2), `sim_result_${Date.now()}.json`);
})();