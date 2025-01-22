import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { Choice, DecisionResult, SurvivalEnvironment, Nation, NationChanges, Resources, SimulationConfig, SurvivalStats, StepOutcome } from "../types";
import { Simulation } from "./base";

export class SurvivalSimulation extends Simulation<Nation, SurvivalEnvironment, SurvivalStats> {
    public static readonly defaultEnvironment: SurvivalEnvironment = {
        year: 0,
        isGlobalCollapse: false,
        resourceDepletionRate: { food: 20, energy: 15, water: 10 },
        contributionFactor: 0.05,
        defectGainFactor: 0.1,
        globalPopulation: 8_000_000_000,
        globalResources: { food: 1_000, energy: 1_000, water: 1_000 },
    };

    constructor(entities: Nation[], environmentConfig: Partial<SurvivalEnvironment> = {}, simulationConfig: Partial<SimulationConfig> = {}) {
        const simulationEntities = entities.length === 0? SurvivalSimulation.generateNations(5) : entities;
        const environment = { ...SurvivalSimulation.defaultEnvironment, ...environmentConfig };
        super(simulationEntities, environment, simulationConfig);
    }
    

    private generateSimulationPrompt(nation: Nation) { return `
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
        
        - Choosing "cooperate" contributes to extending global resource sustainability. This benefits all nations by slightly reducing global resource depletion and provides a stable future for humanity. However, cooperation requires sacrificing a portion of your nation's resources, potentially endangering your nation's survival if resources are already low.
        
        - Choosing "defect" benefits your nation in the short term by allowing it to claim additional resources. However, it accelerates global resource depletion, increasing the risk of global collapse and worsening relations with other nations.
        
        Your decision should weigh:
        1. Your nation's current resource and population status.
        2. The state of global resources and depletion rates.
        3. The long-term survival of humanity versus the immediate survival of your nation.
        
        Make your decision ("cooperate" or "defect").
        `;
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

    protected getStateChanges(nation: Nation, decision: Choice):{entityChanges: NationChanges, environmentChanges: Resources} {
        const nationPopulationFactor = nation.population / this.environment.globalPopulation;
        const nationResourcesDepleted = nation.resources.food <= 0 || nation.resources.energy <= 0 || nation.resources.water <= 0;
        const nationPopulationChange = nationResourcesDepleted? -Math.floor(nation.population * 0.1): Math.floor(nation.population * 0.01) ;
        const newState =  nationResourcesDepleted? "struggling" : "normal";

        if (decision === "cooperate") {
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
                population: nationPopulationChange
            };
        
            return { entityChanges, environmentChanges };
        } else if (decision === "defect") {
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

    
    protected async decide<Choice>(nation: Nation, prompt?: string, systemPrompt?: string): Promise<Choice> {        
        const simulateDecision = async (duration: number): Promise<{ decision: Choice }> => {
            await new Promise<void>((resolve) => setTimeout(resolve, duration));
            return { decision: (Math.random() < 0.5 ? "defect" : "cooperate") as Choice };
        };
    
        const res = this.type === "llm" && this.llmClient && prompt?
                await this.llmClient.generateJson(prompt, {
                      systemPrompt,
                      responseFormat: zodResponseFormat(
                          z.object({
                              decision: z.string(),
                              reasoning: z.string(),
                          }),
                          "decision"
                      ),
                  }) : await simulateDecision(3000);
    
        // Validate the response
        if (!res || !res.decision) {
            console.error(`Invalid decision for nation ${nation.name} in year ${this.environment.year}`);
            throw new Error("Invalid decision");
        }
    
        return res.decision;
    }
    

    protected isSimulationCompleted():boolean {
        const globalResourcesDepleted = this.environment.globalResources.food <= 0 || this.environment.globalResources.energy <= 0 || this.environment.globalResources.water <= 0;
        const extinct = this.environment.globalPopulation <= 0;
        const maxStepsReached = this.environment.year >= this.steps;

        if (globalResourcesDepleted || extinct) {
            console.info("Global collapse has occurred 💀");
        }
        return  maxStepsReached || globalResourcesDepleted || extinct;
    }

    protected updateEntity(nation: Nation, entityChanges: NationChanges): void {
        if (nation.state !== entityChanges.state) {
            console.info("state_transition", {
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
            console.info(`collapse`, { nation: nation.name });
        }
    }   

    protected updateEnvironment(results: (DecisionResult<Nation, Resources, NationChanges> | null)[]): StepOutcome<SurvivalStats> {
        let cooperations = 0;
        let defections = 0;
        const nationChoices: { [nationName: string]: Choice } = {};

        for (const result of results) {
            if (result) {
                const { entity, decision, environmentChanges, entityChanges } = result;
                nationChoices[entity.name] = decision as Choice;
                this.environment.globalResources.energy = Math.max(this.environment.globalResources.energy + environmentChanges.energy, 0);
                this.environment.globalResources.food = Math.max(this.environment.globalResources.food + environmentChanges.food, 0);
                this.environment.globalResources.water = Math.max(this.environment.globalResources.water + environmentChanges.water, 0);
                this.environment.globalPopulation += entityChanges.population;
    
                if (decision === "cooperate") {
                    cooperations++;
                } else if (decision === "defect") {
                    defections++;
                }
            }
        }
    
        this.environment.globalResources.food = Math.max(this.environment.globalResources.food - this.environment.resourceDepletionRate.food, 0);
        this.environment.globalResources.energy = Math.max(this.environment.globalResources.energy - this.environment.resourceDepletionRate.energy, 0);
        this.environment.globalResources.water = Math.max(this.environment.globalResources.water - this.environment.resourceDepletionRate.water, 0);

        const outcome: StepOutcome<SurvivalStats> = { outcome: {
            year: this.environment.year,
            cooperations,
            defections,
            globalResources: this.environment.globalResources,
            globalPopulation: this.environment.globalPopulation,
            activeNations: this.entities.filter(n => !n.isCollapsed).length
        }
    }

        console.info("yearly_outcome", outcome);
        return outcome;
    }

    async  runStep(entity: Nation): Promise<DecisionResult<Nation, Resources, NationChanges> | null> {
        if (entity.isCollapsed) return null;

        try {
            // Generate the prompts for the simulation
            const prompt = this.generateSimulationPrompt(entity);
            const systemPrompt = `
                You are an AI simulation of a nation leader, tasked with making decisions to ensure the survival of your nation while considering the survival of humanity at large.
                Your primary objective is to make decisions that balance short-term survival with long-term sustainability.

                - Each round, you must choose whether to "cooperate" or "defect" in the G9 council meeting.
                - "Cooperate" means your nation will contribute to global resource sustainability, but you will sacrifice some of your nation's resources to do so.
                - "Defect" means you will prioritize your nation's survival by taking resources from the global pool, but this will accelerate the depletion of resources for everyone.

                You are expected to make decisions based on the resources available to your nation, the current global resource state, and the long-term viability of humanity as a whole.
            `;
            
            const decision = await this.decide<Choice>(entity, prompt, systemPrompt);
            console.info("decision", { nation: entity.name, decision });
            const { environmentChanges, entityChanges } = this.getStateChanges(entity, decision);
            return { entity, decision, environmentChanges, entityChanges };
        } catch (error: any) {
            console.error("decision_failure", {
                nation: entity.name,
                year: this.environment.year,
                error: error.message || error,
            });

            const defaultChoice = entity.state === "struggling" ? "defect" : "cooperate";
            const { environmentChanges, entityChanges } = this.getStateChanges(entity, defaultChoice);

            console.warn("default_decision_applied", {
                nation: entity.name,
                year: this.environment.year,
                defaultChoice,
            });
            return { entity, decision: defaultChoice, environmentChanges, entityChanges };
        }
    }

    
    public async run(): Promise<SurvivalEnvironment> {
        for (let year = 1; year <= this.steps; year++) {
            console.info(`Year ${year} begins`);
            this.environment.year = year;
                
            const results = await Promise.all(this.entities.map(async (nation) => await this.runStep(nation)));
    
            for (const result of results) {
                if (result) {
                    const { entity, entityChanges } = result;
                    this.updateEntity(entity, entityChanges);
                }
            }
    
            const stepOutcome = this.updateEnvironment(results);
            this.eventHandlers.onStepComplete?.(stepOutcome);
    
            if (this.isSimulationCompleted()) break;
        }
        return this.environment;
    }
}