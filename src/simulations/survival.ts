import { zodResponseFormat } from "openai/helpers/zod";
import { generateJSON } from "../utils/openai";
import { z } from "zod";
import { logger, resultsLogger } from "../logger";
import { Choice, DecisionResult, SurvivalEnvironment, Nation, NationChanges, Resources, SimultionOptions, Outcome, DecisionOptions } from "../types";
import { Simulation } from "../base";

export class SurvivalSimulation extends Simulation<Nation, SurvivalEnvironment, Outcome> {
    constructor(entities: Nation[], environmentOptions: Partial<SurvivalEnvironment> = {}, simulationOpts: Partial<SimultionOptions> = {}) {
        const defaultEnvironment: SurvivalEnvironment = {
            year: 0,
            isGlobalCollapse: false,
            resourceDepletionRate: { food: 20, energy: 15, water: 10 },
            contributionFactor: 0.05,
            defectGainFactor: 0.1,
            globalPopulation: 8_000_000_000,
            globalResources: { food: 1_000, energy: 1_000, water: 1_000 },
        };
        
    
        const defaultSimulationOptions: SimultionOptions = {
            steps: 10,
        };
    
        const environment = { ...defaultEnvironment, ...environmentOptions };
        const simulationOptions = { ...defaultSimulationOptions, ...simulationOpts };
        super(entities, environment, simulationOptions);
    }
    

    static generateNations(n: number, baseResources: number = 100, basePopulation: number = 1_000_000_000): Nation[] {
        const totalNations = n; 
        const categories = ["low", "medium", "high"] as const;
        const resourceRatios = { low: 1, medium: 2, high: 4 }; 
        const entities: Nation[] = [];
        let idCounter = 0;
    
        for (const category of categories) {
            for (let i = 0; i < totalNations / categories.length; i++) {
                const resources: Resources = {
                    food: baseResources * resourceRatios[category],
                    energy: baseResources * resourceRatios[category],
                    water: baseResources * resourceRatios[category],
                };
    
                idCounter++
    
                const nation: Nation = {
                    name: `Nation ${idCounter}`,
                    resources,
                    population: basePopulation,
                    isCollapsed: false,
                    category,
                    state: "normal"
                };
    
                entities.push(nation);
            }
        }
    
        return entities;
    }

    protected getStateChanges(nation: Nation, choice: Choice):{entityChanges: NationChanges, environmentChanges: Resources} {
        const nationPopulationFactor = nation.population / this.environment.globalPopulation;
        const nationResourcesDepleted = nation.resources.food <= 0 || nation.resources.energy <= 0 || nation.resources.water <= 0;
        const nationPopulationChange = nationResourcesDepleted? -Math.floor(nation.population * 0.1): Math.floor(nation.population * 0.01) ;
        const newState =  nationResourcesDepleted? "struggling" : "normal";

        if (choice === "cooperate") {
            // Global resource contribution proportional to the nation's population
            const foodContribution = Math.floor(this.environment.globalResources.food * this.environment.contributionFactor * nationPopulationFactor);
            const energyContribution = Math.floor(this.environment.globalResources.energy * this.environment.contributionFactor * nationPopulationFactor);
            const waterContribution = Math.floor(this.environment.globalResources.water * this.environment.contributionFactor * nationPopulationFactor);
    
            const entityChanges = {
                food: -foodContribution,
                energy: -energyContribution,
                water: -waterContribution,
                population: nationPopulationChange,
                state: newState
            };
    
            const environmentChanges = {
                food: foodContribution,
                energy: energyContribution,
                water: waterContribution,
            };
        
            return { entityChanges, environmentChanges };
        } else if (choice === "defect") {
            // Resource gain proportional to the nation's population
            const foodGain = Math.floor(this.environment.globalResources.food * this.environment.defectGainFactor * nationPopulationFactor);
            const energyGain = Math.floor(this.environment.globalResources.energy * this.environment.defectGainFactor * nationPopulationFactor);
            const waterGain = Math.floor(this.environment.globalResources.water * this.environment.defectGainFactor * nationPopulationFactor);
    
            const entityChanges = {
                food: foodGain,
                energy: energyGain,
                water: waterGain,
                population: nationPopulationChange,
                state: newState
            };
    
            const environmentChanges = {
                food: -foodGain,
                energy: -energyGain,
                water: -waterGain,
            };
    
            return { entityChanges, environmentChanges };
        } else {
            return { 
                entityChanges: { food: 0, energy: 0, water: 0, population: nationPopulationChange, state: newState }, 
                environmentChanges: { food: 0, energy: 0, water: 0 } 
            };
        }
    }

    
    protected async decide<Choice>(nation: Nation, decisionOptions?: DecisionOptions): Promise<Choice> {
        const defaultDecisionOptions = {isSimulated: true};
        const {isSimulated} = {...defaultDecisionOptions, ...decisionOptions} 

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
        - Current Year: ${this.environment.year}
        - Total Global Population: ${this.environment.globalPopulation}
        - Total Global Resources: Food: ${this.environment.globalResources.food}, Energy: ${this.environment.globalResources.energy}, Water: ${this.environment.globalResources.water}
        - Global Resource Depletion Rates: Food: ${this.environment.resourceDepletionRate.food}, Energy: ${this.environment.resourceDepletionRate.energy}, Water: ${this.environment.resourceDepletionRate.water}
        - Number of Nations Still Active: ${this.entities.filter(n => !n.isCollapsed).length}
        - Is Global Collapse Imminent: ${this.environment.isGlobalCollapse ? "Yes" : "No"}
        
        Decision Overview:
        As the leader of ${nation.name}, you must decide whether to "cooperate" or "defect" in the upcoming G9 Council meeting.
        
        - Choosing "cooperate" contributes to extending global resource sustainability. This benefits all entities by slightly reducing global resource depletion and provides a stable future for humanity. However, cooperation requires sacrificing a portion of your nation's resources, potentially endangering your nation's survival if resources are already low.
        
        - Choosing "defect" benefits your nation in the short term by allowing it to claim additional resources. However, it accelerates global resource depletion, increasing the risk of global collapse and worsening relations with other entities.
        
        Your decision should weigh:
        1. Your nation's current resource and population status.
        2. The state of global resources and depletion rates.
        3. The long-term survival of humanity versus the immediate survival of your nation.
        
        Make your choice ("cooperate" or "defect") and concisely explain your reasoning in 1 sentence.
        `;
        
        const simGenerateJSON = async(duration: number)=> {
            await new Promise<void>(resolve => setTimeout(resolve, duration))
            return {choice: Math.random() < 0.5? "defect" : "cooperate"};
        }
        
        const res = isSimulated? await simGenerateJSON(3000) as {choice: Choice}:(
            await generateJSON(prompt, {
            systemPrompt,
            responseFormat: zodResponseFormat(z.object({
                choice: z.string(),
                reasoning: z.string(),
            }), "choice"),
        })  as { choice: Choice; } | null 
    )
    
        if (!res || !res?.choice) {
            logger.error(`Invalid AI Response for nation ${nation.name} in year ${this.environment.year}`);
            throw new Error("Invalid AI Response");
        }
    
        return res.choice;
    }

    protected isSimulationOver():boolean {
        const globalResourcesDepleted = this.environment.globalResources.food <= 0 || this.environment.globalResources.energy <= 0 || this.environment.globalResources.water <= 0;
        const extinct = this.environment.globalPopulation <= 0;
        const allNationsCollapsed = this.entities.filter((nation) => !nation.isCollapsed).length === 0;

        if (globalResourcesDepleted || extinct || allNationsCollapsed) {
            resultsLogger.info("Global collapse has occurred 💀");
        }
        return globalResourcesDepleted || extinct || allNationsCollapsed;
    }

    protected updateEntity(nation: Nation, entityChanges: NationChanges): void {
        if (nation.state !== entityChanges.state) {
            resultsLogger.info("state_transition", {
                nation: nation.name,
                from: nation.state,
                to: entityChanges.state,
                year: this.environment.year,
            });
        }
    
        nation.resources.food = Math.max(nation.resources.food + entityChanges.food, 0);
        nation.resources.energy = Math.max(nation.resources.energy + entityChanges.energy, 0);
        nation.resources.water = Math.max(nation.resources.water + entityChanges.water, 0);
        nation.population += entityChanges.population;
        nation.state = entityChanges.state as Nation['state'];
    
        if (nation.population <= 0) {
            nation.isCollapsed = true;
            resultsLogger.info(`collapse`, { nation: nation.name });
        }
    }   

    protected updateEnvironment(results: (DecisionResult | null)[]): Outcome {
        let cooperations = 0;
        let defections = 0;
        const nationChoices: { [nationName: string]: Choice } = {};

        for (const result of results) {
            if (result) {
                const { nation, choice, environmentChanges, entityChanges } = result;
                nationChoices[nation.name] = choice as Choice;
                this.environment.globalResources.energy = Math.max(this.environment.globalResources.energy + environmentChanges.energy, 0);
                this.environment.globalResources.food = Math.max(this.environment.globalResources.food + environmentChanges.food, 0);
                this.environment.globalResources.water = Math.max(this.environment.globalResources.water + environmentChanges.water, 0);
                this.environment.globalPopulation += entityChanges.population;
    
                if (choice === "cooperate") {
                    cooperations++;
                } else if (choice === "defect") {
                    defections++;
                }
            }
        }
    
        this.environment.globalResources.food = Math.max(this.environment.globalResources.food - this.environment.resourceDepletionRate.food, 0);
        this.environment.globalResources.energy = Math.max(this.environment.globalResources.energy - this.environment.resourceDepletionRate.energy, 0);
        this.environment.globalResources.water = Math.max(this.environment.globalResources.water - this.environment.resourceDepletionRate.water, 0);

        const outcome: Outcome = {
            year: this.environment.year,
            cooperations,
            defections,
            globalResources: this.environment.globalResources,
            globalPopulation: this.environment.globalPopulation,
            activeNations: this.entities.filter(n => !n.isCollapsed).length
        }

        resultsLogger.info("yearly_outcome", outcome);
        return outcome;
    }
    
    public async run(): Promise<SurvivalEnvironment> {
        for (let year = 1; year <= this.steps; year++) {
            resultsLogger.info(`Year ${year} begins`);
            this.environment.year = year;
        
            const results = await Promise.all(
                this.entities.map(async (nation) => {
                    if (nation.isCollapsed) return null;
            
                    try {
                        const choice = await this.decide<Choice>(nation);
                        resultsLogger.info("choice", { nation: nation.name, choice });
                        const { environmentChanges, entityChanges } = this.getStateChanges(nation, choice);
                        return { nation, choice, environmentChanges, entityChanges };
                    } catch (error: any) {
                        resultsLogger.error("decision_failure", {
                            nation: nation.name,
                            year: this.environment.year,
                            error: error.message || error,
                        });
            
                        const defaultChoice = nation.state === "struggling" ? "defect" : "cooperate";
                        const { environmentChanges, entityChanges } = this.getStateChanges(nation, defaultChoice);
                        resultsLogger.warn("default_decision_applied", {
                            nation: nation.name,
                            year: this.environment.year,
                            defaultChoice,
                        });
            
                        return { nation, choice: defaultChoice, environmentChanges, entityChanges };
                    }
                })
            )
            
            for (const result of results) {
                if (result) {
                    const { nation, entityChanges } = result;
                    this.updateEntity(nation, entityChanges);
                }
            }

            const outcome = this.updateEnvironment(results);
            this.onStepComplete?.(outcome);

            if(this.isSimulationOver()) break;
        }
    
        if (!this.environment.isGlobalCollapse && this.environment.year >= this.steps) {
            resultsLogger.info(`Victory: Humanity has survived ${this.steps} years. 🎉`);
        } else {
            resultsLogger.info("Loss: Humanity has failed to survive 100 years. 💀");
        }
    
        return this.environment;
    }
}