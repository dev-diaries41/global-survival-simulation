import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { Choice, DecisionResult, SurvivalEnvironment, Nation, NationChanges, Resources, SimultionOptions, StepResult } from "../types";
import { Simulation } from "./base";
import { generateSimulatedData } from "../data";

export class SurvivalSimulation extends Simulation<Nation, SurvivalEnvironment, StepResult> {
    private static readonly defaultEnvironment: SurvivalEnvironment = {
        year: 0,
        isGlobalCollapse: false,
        resourceDepletionRate: { food: 20, energy: 15, water: 10 },
        contributionFactor: 0.05,
        defectGainFactor: 0.1,
        globalPopulation: 8_000_000_000,
        globalResources: { food: 1_000, energy: 1_000, water: 1_000 },
    };

    constructor(entities: Nation[] = [], environmentOptions: Partial<SurvivalEnvironment> = {}, simulationOpts: Partial<SimultionOptions> = {}) {
        const simulatedEntities = entities.length > 0? entities : Array.from(generateSimulatedData(SurvivalSimulation.generateNations(1)[0]));
        const environment = { ...SurvivalSimulation.defaultEnvironment, ...environmentOptions };
        const simulationOptions = { ...simulationOpts };
        super(simulatedEntities, environment, simulationOptions);
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

    
    protected async decide<Choice>(nation: Nation, prompt?: string, systemPrompt?: string): Promise<Choice> {        
        const simulateDecision = async (duration: number): Promise<{ choice: Choice }> => {
            await new Promise<void>((resolve) => setTimeout(resolve, duration));
            return { choice: (Math.random() < 0.5 ? "defect" : "cooperate") as Choice };
        };
    
        const res = this.type === "llm" && this.llmClient && prompt?
                await this.llmClient.generateJson(prompt, {
                      systemPrompt,
                      responseFormat: zodResponseFormat(
                          z.object({
                              choice: z.string(),
                              reasoning: z.string(),
                          }),
                          "choice"
                      ),
                  }) : await simulateDecision(3000);
    
        // Validate the response
        if (!res || !res.choice) {
            console.error(`Invalid AI Response for nation ${nation.name} in year ${this.environment.year}`);
            throw new Error("Invalid AI Response");
        }
    
        return res.choice;
    }
    

    protected isSimulationCompleted():boolean {
        const globalResourcesDepleted = this.environment.globalResources.food <= 0 || this.environment.globalResources.energy <= 0 || this.environment.globalResources.water <= 0;
        const extinct = this.environment.globalPopulation <= 0;
        const allNationsCollapsed = this.entities.filter((nation) => !nation.isCollapsed).length === 0;

        if (globalResourcesDepleted || extinct || allNationsCollapsed) {
            console.info("Global collapse has occurred 💀");
        }
        return globalResourcesDepleted || extinct || allNationsCollapsed;
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

    protected updateEnvironment(results: (DecisionResult | null)[]): StepResult {
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

        const StepResult: StepResult = {
            year: this.environment.year,
            cooperations,
            defections,
            globalResources: this.environment.globalResources,
            globalPopulation: this.environment.globalPopulation,
            activeNations: this.entities.filter(n => !n.isCollapsed).length
        }

        console.info("yearly_outcome", StepResult);
        return StepResult;
    }
    
    public async run(): Promise<SurvivalEnvironment> {
        for (let year = 1; year <= this.steps; year++) {
            console.info(`Year ${year} begins`);
            this.environment.year = year;
                
            const results = await Promise.all(
                this.entities.map(async (nation) => {
                    if (nation.isCollapsed) return null;
    
                    try {
                        const choice = await this.decide<Choice>(nation);
                        console.info("choice", { nation: nation.name, choice });
                        const { environmentChanges, entityChanges } = this.getStateChanges(nation, choice);
                        return { nation, choice, environmentChanges, entityChanges };
                    } catch (error: any) {
                        console.error("decision_failure", {
                            nation: nation.name,
                            year: this.environment.year,
                            error: error.message || error,
                        });
    
                        const defaultChoice = nation.state === "struggling" ? "defect" : "cooperate";
                        const { environmentChanges, entityChanges } = this.getStateChanges(nation, defaultChoice);
                        console.warn("default_decision_applied", {
                            nation: nation.name,
                            year: this.environment.year,
                            defaultChoice,
                        });
                        return { nation, choice: defaultChoice, environmentChanges, entityChanges };
                    }
                })
            );
    
            // Update entities with the changes from this step
            for (const result of results) {
                if (result) {
                    const { nation, entityChanges } = result;
                    this.updateEntity(nation, entityChanges);
                }
            }
    
            const StepResult = this.updateEnvironment(results);
            this.eventHandlers.onStepComplete?.(StepResult);
    
            if (this.isSimulationCompleted()) break;
        }
        return this.environment;
    }
    
}