import { SurvivalSimulation} from "./src";


(async () => {
    const sim = new SurvivalSimulation()
    console.log(sim)
    const result = await sim.run();
})();