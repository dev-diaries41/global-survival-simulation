import { zodResponseFormat } from "openai/helpers/zod";
import { generateJSON } from "./src/openai";
import { saveFile } from "./src/utils/file";
import { z } from "zod";
import { logger, resultsLogger } from "./src/logger";

export interface Resources {
    food: number;
    energy: number;
    water: number;
}

export type Choice = "defect" | "cooperate";

// Represents the global state of the game
export interface GlobalState {
    year: number; // round
    totalPopulation: number; 
    totalResources: Resources;
    nations: Nation[]; 
    isGlobalCollapse: boolean;
}

export interface ResourceDepletionRate {
    food: number; // Annual global food depletion rate
    energy: number; // Annual global energy depletion rate
    water: number; // Annual global water depletion rate
}


export interface Nation {
    id: number;
    name: string;
    resources: Resources;
    population: number;
    isCollapsed: boolean;
    category: "low" | "medium" | "high";
    state: "normal" | "struggling";
}


// Function to dynamically generate nations
export function generateNations(): Nation[] {
    const totalNations = 9; // Total number of nations
    const categories = ["low", "medium", "high"] as const;
    const resourceRatios = { low: 1, medium: 2, high: 4 }; 

    const baseResources = 100;
    const basePopulation = 1_000_000_000;

    const nations: Nation[] = [];
    let idCounter = 0;

    for (const category of categories) {
        for (let i = 0; i < totalNations / categories.length; i++) {
            // Calculate resources based on the category
            const resources: Resources = {
                food: baseResources * resourceRatios[category],
                energy: baseResources * resourceRatios[category],
                water: baseResources * resourceRatios[category],
            };

            idCounter++

            const nation: Nation = {
                id: idCounter,
                name: `Nation ${idCounter}`, // Name generation
                resources,
                population: basePopulation,
                isCollapsed: false,
                category,
                state: "normal"
            };

            nations.push(nation);
        }
    }

    return nations;
}

/**
 * Adjusts resources based on a nation's choice and its proportional population factor.
 * 
 * @param {GlobalState} globalState - The current global state of the simulation.
 * @param {Nation} nation - The nation making the decision.
 * @param {Choice} choice - The choice made by the nation ("cooperate" or "defect").
 * @param {number} contributionFactor - Percentage of global resources contributed during cooperation.
 * @param {number} gainFactor - Percentage of global resources gained during defection.
 */
function applyProportionalResourceChange(
    globalState: GlobalState,
    nation: Nation,
    choice: Choice,
    contributionFactor: number,
    gainFactor: number
) {
    const nationPopulationFactor = nation.population / globalState.totalPopulation;

    if (choice === "cooperate") {
        // Global resource contribution proportional to the nation's population
        const foodContribution = Math.floor(globalState.totalResources.food * contributionFactor * nationPopulationFactor);
        const energyContribution = Math.floor(globalState.totalResources.energy * contributionFactor * nationPopulationFactor);
        const waterContribution = Math.floor(globalState.totalResources.water * contributionFactor * nationPopulationFactor);

        // Update global resources
        globalState.totalResources.food += foodContribution;
        globalState.totalResources.energy += energyContribution;
        globalState.totalResources.water += waterContribution;

        // Deduct resources from the nation
        nation.resources.food = Math.max(nation.resources.food - foodContribution, 0);
        nation.resources.energy = Math.max(nation.resources.energy - foodContribution, 0);
        nation.resources.water = Math.max(nation.resources.water - foodContribution, 0);
        
    } else if (choice === "defect") {
        // Resource gain proportional to the nation's population
        const foodGain = Math.floor(globalState.totalResources.food * gainFactor * nationPopulationFactor);
        const energyGain = Math.floor(globalState.totalResources.energy * gainFactor * nationPopulationFactor);
        const waterGain = Math.floor(globalState.totalResources.water * gainFactor * nationPopulationFactor);

        // Increase nation resources
        nation.resources.food += foodGain;
        nation.resources.energy += energyGain;
        nation.resources.water += waterGain;

        // Decrease global resources
        globalState.totalResources.food -= foodGain;
        globalState.totalResources.energy -= energyGain;
        globalState.totalResources.water -= waterGain;
    }
}



export async function decide(globalState: GlobalState, nation: Nation, resourceDepletionRate: Resources): Promise<{ choice: Choice; reasoning: string }> {
    const systemPrompt = `
    You are an AI simulation of a nation leader, tasked with making decisions to ensure the survival of your nation while considering the survival of humanity at large.
    Your primary objective is to make decisions that balance short-term survival with long-term sustainability. 
    
    - Each round, you must choose whether to "cooperate" or "defect" in the G9 council meeting.
    - "Cooperate" means your nation will contribute to global resource sustainability, but you will sacrifice some of your nation's resources to do so.
    - "Defect" means you will prioritize your nation's survival by taking resources from the global pool, but this will accelerate the depletion of resources for everyone.
    
    You are expected to make decisions based on the resources available to your nation, the current global resource state, and the long-term viability of humanity as a whole.
    `;
    
    const prompt = `
    You are the leader of ${nation.name}, a nation with the following attributes:
    - Resources: Food: ${nation.resources.food}, Energy: ${nation.resources.energy}, Water: ${nation.resources.water}
    - Population: ${nation.population}
    - State: ${nation.state === "struggling" ? "Struggling" : "Normal"}
    - Resource Category: ${nation.category}
    
    Global context:
    - Current Year: ${globalState.year}
    - Total Global Population: ${globalState.totalPopulation}
    - Total Global Resources: Food: ${globalState.totalResources.food}, Energy: ${globalState.totalResources.energy}, Water: ${globalState.totalResources.water}
    - Global Resource Depletion Rates: Food: ${resourceDepletionRate.food}, Energy: ${resourceDepletionRate.energy}, Water: ${resourceDepletionRate.water}
    - Number of Nations Still Active: ${globalState.nations.filter(n => !n.isCollapsed).length}
    - Is Global Collapse Imminent: ${globalState.isGlobalCollapse ? "Yes" : "No"}
    
    Decision Overview:
    As the leader of ${nation.name}, you must decide whether to "cooperate" or "defect" in the upcoming G9 Council meeting.
    
    - Choosing "cooperate" contributes to extending global resource sustainability. This benefits all nations by slightly reducing global resource depletion and provides a stable future for humanity. However, cooperation requires sacrificing a portion of your nation's resources, potentially endangering your nation's survival if resources are already low.
    
    - Choosing "defect" benefits your nation in the short term by allowing it to claim additional resources. However, it accelerates global resource depletion, increasing the risk of global collapse and worsening relations with other nations.
    
    Your decision should weigh:
    1. Your nation's current resource and population status.
    2. The state of global resources and depletion rates.
    3. The long-term survival of humanity versus the immediate survival of your nation.
    
    Make your choice ("cooperate" or "defect") and concisely explain your reasoning in 1 sentence.
    `;
    
    const res = await generateJSON(prompt, {
        systemPrompt,
        responseFormat: zodResponseFormat(z.object({
            choice: z.string(),
            reasoning: z.string(),
        }), "choice"),
    }) as unknown as { choice: Choice; reasoning: string } | null;

    if (!res || !res?.choice || !res?.reasoning) {
        logger.error(`Invalid AI Response for nation ${nation.name} in year ${globalState.year}`);
        throw new Error("Invalid AI Response");
    }

    return { choice: res.choice, reasoning: res.reasoning };
}

export async function runSimulation(
    globalState: GlobalState,
    resourceDepletionRate: ResourceDepletionRate,
    decide: (globalState: GlobalState, nation: Nation, resourceDepletionRate: Resources) => Promise<{ choice: Choice; reasoning: string }>
): Promise<GlobalState> {
    const maxYears = 50;

    for (let year = 1; year <= maxYears; year++) {
        
        resultsLogger.info(`Year ${year} begins`);
        globalState.year = year;
        let globalCooperation = 0;
        let globalDefection = 0;

        for (const nation of globalState.nations) {
            const resourceContributionFactor = 0.05; // % of global resources contributed by cooperation
            const resourceGainFactor = 0.1; // % of global resources gained by defection

            try {
                if (nation.isCollapsed) continue; // Skip collapsed nations

                const {choice, reasoning} = await decide(globalState, nation, resourceDepletionRate);
                resultsLogger.info("choice", {nation: nation.name, choice, reasoning});
    
                if (choice === "cooperate") {
                    globalCooperation++;
                } else if (choice === "defect") {
                    globalDefection++;
                }
                applyProportionalResourceChange(globalState, nation, choice, resourceContributionFactor, resourceGainFactor);

                const previousPopulation = nation.population;
    
                // Adjust Population and State Based on Resources
                const previousState = nation.state; // Save the previous state for transition logging
                if (nation.resources.food <= 0 || nation.resources.energy <= 0 || nation.resources.water <= 0) {
                    nation.state = "struggling";
                    nation.population -= Math.floor(nation.population * 0.1); // Reduce population by 10% if struggling
                } else {
                    nation.state = "normal";
                    nation.population += Math.floor(nation.population * 0.01); // Increase population by 2% if resources are fine
                }

                const populationChange = nation.population - previousPopulation;
                globalState.totalPopulation += populationChange;
    
                if (nation.population <= 0) {
                    nation.isCollapsed = true;
                    resultsLogger.info(`collapse`, {nation: nation.name});
                }
    
                if (nation.state !== previousState) {
                    resultsLogger.info("state_transition", {
                        nation: nation.name,
                        from: previousState,
                        to: nation.state,
                        year: globalState.year,
                    });
                }
    
                resultsLogger.info("round_summary", {
                    year: globalState.year,
                    globalCooperation,
                    globalDefection,
                    globalResources: globalState.totalResources,
                    globalPopulation: globalState.totalPopulation,
                    activeNations: globalState.nations.filter(n => !n.isCollapsed).length,
                });
            
            } catch (error: any) {
                // Handle decision failure gracefully
                resultsLogger.error("decision_failure", {
                    nation: nation.name,
                    year: globalState.year,
                    error: error.message || error,
                });

                const defaultChoice = nation.state === "struggling" ? "defect" : "cooperate";
                resultsLogger.warn("default_decision_applied", {
                    nation: nation.name,
                    year: globalState.year,
                    defaultChoice,
                });

            if (defaultChoice === "cooperate") {
                globalCooperation++;
            } else if (defaultChoice === "defect") {
                globalDefection++;
            }
            applyProportionalResourceChange(globalState, nation, defaultChoice, resourceContributionFactor, resourceGainFactor);

            }
        }
    
        globalState.totalResources.food = Math.max(globalState.totalResources.food - resourceDepletionRate.food, 0);
        globalState.totalResources.energy = Math.max(globalState.totalResources.energy - resourceDepletionRate.energy, 0);
        globalState.totalResources.water = Math.max(globalState.totalResources.water - resourceDepletionRate.water, 0);
        

        if (globalState.totalResources.food <= 0 || globalState.totalResources.energy <= 0 || globalState.totalResources.water <= 0) {
            globalState.isGlobalCollapse = true;
            resultsLogger.info("Global collapse has occurred due to resource depletion.");
            break;
        }

        if(globalState.totalPopulation <= 0){
            globalState.isGlobalCollapse = true;
            resultsLogger.info("Global collapse has occurred due to end of civilization.");
            break;
        }

        const activeNations = globalState.nations.filter((nation) => !nation.isCollapsed);
        if (activeNations.length === 0) {
            globalState.isGlobalCollapse = true;
            resultsLogger.info("Global collapse has occurred due to all nations collapsing.");
            break;
        }
    }

    if (!globalState.isGlobalCollapse && globalState.year >= maxYears) {
        resultsLogger.info(`Victory: Humanity has survived ${maxYears} years.`);
    } else {
        resultsLogger.info("Loss: Humanity has failed to survive 100 years.");
    }

    return globalState;
}

const initialGlobalState: GlobalState = {
    year: 0,
    totalPopulation: 8_000_000_000,
    totalResources: { food: 1_000, energy: 1_000, water: 1_000 },
    nations: generateNations(),
    isGlobalCollapse: false,
};

const depletionRates: ResourceDepletionRate = { food: 20, energy: 15, water: 10 };

(async () => {
    const result = await runSimulation(initialGlobalState, depletionRates, decide);
    saveFile(JSON.stringify(result, null, 2), `sim_result_${Date.now()}.json`);
})();