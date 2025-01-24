import { generateSimulatedData, SurvivalSimulation} from ".";


(async () => {
    const sim = new SurvivalSimulation([], {}, {
        type: 'sim',
        steps: 100
    })
    const result = await sim.run();
    console.log(result)
})();