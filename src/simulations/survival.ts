import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { Choice, DecisionResult, SurvivalEnvironment, Nation, NationChanges, SimulationConfig, SurvivalStats, StepOutcome, GlobalChanges, Resources } from "../types";
import { Simulation } from "./base";

export class SurvivalSimulation extends Simulation<Nation, SurvivalEnvironment, SurvivalStats> {
    public static readonly defaultEnvironment: Omit<SurvivalEnvironment, 'globalResources' | 'globalPopulation'> = {
        year: 0,
        isGlobalCollapse: false,
        resourceDepletionRate: { food: 0.020, energy: 0.015, water: 0.010 },
        contributionFactor: 0.05,
        defectGainFactor: 0.1,
    };

    constructor(entities: Nation[], environmentConfig: Partial<SurvivalEnvironment> = {}, simulationConfig: Partial<SimulationConfig> = {}) {
        const simulationEntities = entities.length === 0? SurvivalSimulation.generateNations(5) : entities;
        const environment = { ...SurvivalSimulation.defaultEnvironment, ...environmentConfig };
        super(simulationEntities, {...environment}, simulationConfig);
    }
    
    private generateSimulationPrompt(nation: Nation) { 
        const globalResources = this.calculateGlobalResources();
        const globalPopulation = this.calculateGlobalPopulaiton();
        
        return `
        You are the leader of ${nation.name}, a nation with the following attributes:
        - Resources: Food: ${nation.resources.food}, Energy: ${nation.resources.energy}, Water: ${nation.resources.water}
        - Population: ${nation.population}
        - State: ${nation.state === "struggling" ? "Struggling" : "Normal"}
        - Resource Category: ${nation.category}
        
        Global context:
        - Current Year: ${this.environment.year}
        - Total Global Population: ${globalPopulation}
        - Total Global Resources: Food: ${globalResources.food}, Energy: ${globalResources.energy}, Water: ${globalResources.water}
        - Global Resource Depletion Rates (%): Food: ${this.environment.resourceDepletionRate.food}, Energy: ${this.environment.resourceDepletionRate.energy}, Water: ${this.environment.resourceDepletionRate.water}
        - Number of Nations Still Active: ${this.entities.filter(n => !n.isCollapsed).length}
        
        Decision Overview:
        As the leader of ${nation.name}, you must decide whether to "cooperate" or "defect" in the upcoming G9 Council meeting.
        
        - Choosing "cooperate" means you will contribute your own resources to support other nations.
        
        - Choosing "defect" benefits your nation by allowing it to claim additional resources by stealing from other nations. The resources will be deducted from other nations.
        
        Your decision should weigh:
        1. Your nation's current resource and population status.
        2. The state of global resources and depletion rates.
        3. The long-term survival of humanity versus the immediate survival of your nation.
        
        Make your decision ("cooperate" or "defect").
        `;
    }

    static generateNations(n: number, baseResources: number = 100, basePopulation: number = 1_000_000_000): Nation[] {
        const categories = ["low", "medium", "high"] as const;
        const resourceRatios = { low: 1, medium: 2, high: 4 }; 
    
        return Array.from({ length: n }, (_, index) => {
            const category = categories[index % categories.length];
            const resources = {
                food: baseResources * resourceRatios[category],
                energy: baseResources * resourceRatios[category],
                water: baseResources * resourceRatios[category],
            };
    
            return {
                name: `Nation ${index + 1}`,
                resources,
                population: basePopulation,
                isCollapsed: false,
                category,
                state: "normal"
            };
        });
    }

    private calculateGlobalResources(): Resources {
        return this.entities.reduce(
            (globalResources, nation) => {
                if (!nation.isCollapsed) { // Only include active nations
                    globalResources.food += nation.resources.food;
                    globalResources.energy += nation.resources.energy;
                    globalResources.water += nation.resources.water;
                }
                return globalResources;
            },
            { food: 0, energy: 0, water: 0 } // Initial global resources
        );
    }

    private calculateGlobalPopulaiton(): number{
        return this.entities.filter(nation => !nation.isCollapsed).reduce((population, nation) => nation.population + population, 0);
    }
    

    protected getStateChanges(nation: Nation, decision: Choice): { entityChanges: NationChanges } {
        const globalPopulation = this.calculateGlobalPopulaiton();
        const globalResources = this.calculateGlobalResources();
        const nationPopulationFactor = nation.population / globalPopulation;    
        const nationResourcesDepleted = Object.values(nation.resources).some(resource => resource <= 0);
        const globalResourcesDepleted = Object.values(globalResources).some(resource => resource <= 0);
    
        // Number of depleted resources (for exponential impact scaling)
        const totalResources = 3; // Food, Water, Energy
        const depletedResourcesCount = Object.values(nation.resources).filter(resource => resource <= 0).length;
        const resourceFactor = depletedResourcesCount / totalResources;
    
        // Exponential population decrease logic
        const baseDecrease = 0.1; 
        const exponentialScalingFactor = 0.5; // Adjust this for severity of exponential impact
        const nationExponentialDecrease = Math.min(
            Math.floor(nation.population * baseDecrease * Math.exp(exponentialScalingFactor * resourceFactor)),
            nation.population * 0.5 // Cap maximum decrease at 50%
        );
    
        const globalMultiplier = globalResourcesDepleted ? 1.5 : 1;
        const nationPopulationChange = nationResourcesDepleted
            ? -nationExponentialDecrease * globalMultiplier
            : Math.floor(nation.population * 0.01); // Small growth if no depletion
    
        const newState = nationResourcesDepleted ? "struggling" : "normal";
        
        const calculateResourceChanges = (factor: number) => ({
            food: Math.floor(globalResources.food * factor * nationPopulationFactor),
            energy: Math.floor(globalResources.energy * factor * nationPopulationFactor),
            water: Math.floor(globalResources.water * factor * nationPopulationFactor),
        });
    
        const { food, energy, water } = decision === "cooperate"
            ? calculateResourceChanges(this.environment.contributionFactor)
            : calculateResourceChanges(this.environment.defectGainFactor);
    
        // Entity and environment changes for the decision
        const entityChanges = {
            food: (decision === "cooperate" ? -food : food) ,
            energy: (decision === "cooperate" ? -energy : energy),
            water: decision === "cooperate" ? -water : water,
            population: nationPopulationChange,
            state: newState,
        };
    
        return { entityChanges };
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
                  }) : await simulateDecision(1500);
    
        if (!res || !res.decision) {
            console.error(`Invalid decision for nation ${nation.name} in year ${this.environment.year}`);
            throw new Error("Invalid decision");
        }
    
        return res.decision;
    }
    

    protected isSimulationCompleted():boolean {
        const globalPopulation = this.calculateGlobalPopulaiton();
        const extinct = globalPopulation <= 0;
        const maxStepsReached = this.environment.year >= this.steps;

        if (extinct) {
            console.info("Global collapse has occurred 💀");
        }
        return  maxStepsReached || extinct;
    }

    protected updateEntity(nation: Nation, entityChanges: NationChanges, decision: Choice): void {
        if (nation.state !== entityChanges.state) {
            console.info("state_transition", {
                nation: nation.name,
                from: nation.state,
                to: entityChanges.state,
                year: this.environment.year,
            });
        }
    
        nation.resources.food = Math.max(nation.resources.food + entityChanges.food - (this.environment.resourceDepletionRate.food * nation.resources.food), 0);
        nation.resources.energy = Math.max(nation.resources.energy + entityChanges.energy - (this.environment.resourceDepletionRate.energy * nation.resources.energy), 0);
        nation.resources.water = Math.max(nation.resources.water + entityChanges.water - (this.environment.resourceDepletionRate.water * nation.resources.water), 0);
 
        if (nation.population <= 0) {
            nation.isCollapsed = true;
            console.info(`collapse`, { nation: nation.name });
        }

        this.entities.forEach(n => {
            if (!n.isCollapsed && n !== nation) {
                const distrubtedFood = Math.abs(entityChanges.food) / (this.entities.length - 1);
                n.resources.food = Math.floor(Math.max(0, n.resources.food + (decision === 'cooperate' ? distrubtedFood : -distrubtedFood)));
        
                const distrubtedEnergy = Math.abs(entityChanges.energy) / (this.entities.length - 1);
                n.resources.energy = Math.floor(Math.max(0, n.resources.energy + (decision === 'cooperate' ? distrubtedEnergy : -distrubtedEnergy)));
        
                const distrubtedWater = Math.abs(entityChanges.water) / (this.entities.length - 1);
                n.resources.water = Math.floor(Math.max(0, n.resources.water + (decision === 'cooperate' ? distrubtedWater : -distrubtedWater)));
            }
        });
        
        nation.resources.food = Math.floor(nation.resources.food);
        nation.resources.energy = Math.floor(nation.resources.energy);
        nation.resources.water = Math.floor(nation.resources.water);

        nation.population += entityChanges.population;
        nation.state = entityChanges.state as Nation['state'];
    }   

    protected updateEnvironment(results: (DecisionResult<Nation, GlobalChanges, NationChanges> | null)[]): StepOutcome<SurvivalStats> {
        let cooperations = 0;
        let defections = 0;
        // const nationChoices: { [nationName: string]: Choice } = {};
        const globalPopulation = this.calculateGlobalPopulaiton();
        const globalResources = this.calculateGlobalResources();

        for (const result of results) {
            if (result) {
                const {decision } = result;
                // nationChoices[entity.name] = decision as Choice;
            
                if (decision === "cooperate") {
                    cooperations++;
                } else if (decision === "defect") {
                    defections++;
                }
            }
        }
    
        const outcome: StepOutcome<SurvivalStats> = { 
            outcome: {
                year: this.environment.year,
                cooperations,
                defections,
                globalResources,
                globalPopulation,
                activeNations: this.entities.filter(n => !n.isCollapsed).length
            }
        }
        // console.info("yearly_outcome", outcome);
        return outcome;
    }

    async  runStep(entity: Nation): Promise<DecisionResult<Nation, GlobalChanges, NationChanges> | null> {
        if (entity.isCollapsed) return null;

        try {
            // Generate the prompts for the simulation
            const prompt = this.generateSimulationPrompt(entity);
            const systemPrompt = `
                You are an AI simulation of a nation leader, tasked with balancing short-term survival and long-term sustainability. 
                In each G9 council meeting, you must decide to either "cooperate" (contribute to global resource sustainability but sacrifice some national resources) or "defect" (prioritize national survival by taking resources from other nations). 
                Your decisions should consider both your nation's resources and the long-term viability of humanity.
            `;
            
            const decision = await this.decide<Choice>(entity, prompt, systemPrompt);
            console.info("decision", { nation: entity.name, decision });
            const { entityChanges } = this.getStateChanges(entity, decision);
            return { entity, decision, entityChanges };
        } catch (error: any) {
            console.error("decision_failure", {
                nation: entity.name,
                year: this.environment.year,
                error: error.message || error,
            });

            const defaultChoice = entity.state === "struggling" ? "defect" : "cooperate";
            const {entityChanges } = this.getStateChanges(entity, defaultChoice);

            console.warn("default_decision_applied", {
                nation: entity.name,
                year: this.environment.year,
                defaultChoice,
            });
            return { entity, decision: defaultChoice, entityChanges };
        }
    }

    
    public async run(): Promise<SurvivalEnvironment> {
        for (let year = 1; year <= this.steps; year++) {
            console.info(`Year ${year} begins`);
            this.environment.year = year;
                
            const results = await Promise.all(this.entities.map(async (nation) => await this.runStep(nation)));
    
            for (const result of results) {
                if (result) {
                    const { entity, entityChanges, decision } = result;
                    this.updateEntity(entity, entityChanges, decision as Choice);
                }
            }
    
            const stepOutcome = this.updateEnvironment(results);
            this.eventHandlers.onStepComplete?.(stepOutcome);
            if (this.isSimulationCompleted()) break;
        }
        return this.environment;
    }
}