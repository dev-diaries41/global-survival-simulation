import { generateSimulatedData, SurvivalSimulation} from ".";


(async () => {
    const sim = new SurvivalSimulation([], {}, {
        type: 'sim',
        steps: 100,
        onStepComplete(stepOutcome) {
            console.log(stepOutcome)
        },
    })
    await sim.run();
})();