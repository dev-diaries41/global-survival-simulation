import { zodResponseFormat } from "openai/helpers/zod";
import { generateJSON } from "./utils/openai";
import { z } from "zod";
import { logger, resultsLogger } from "./logger";
import { Choice, GlobalState, Nation, NationChanges, ResourceDepletionRate, Resources, SimulationOptions, YearlyOutcome } from "./types";


export class SurvivalSimulation {
    private globalState: GlobalState;
    private resourceDepletionRate: ResourceDepletionRate;
    private contributionFactor: number;
    private defectGainFactor: number;
    private maxYears: number;
    private onYearOutcome?: (outcome: YearlyOutcome) => void ;

    constructor(globalState: GlobalState, resourceDepletionRate: ResourceDepletionRate, options: SimulationOptions = {}){
        const {
            maxYears = 10,
            contributionFactor = 0.05, 
            defectGainFactor = 0.1,
            onYearOutcome
        } = options;

        this.globalState = globalState;
        this.resourceDepletionRate = resourceDepletionRate;
        this.maxYears = maxYears;
        this.defectGainFactor= defectGainFactor;
        this.contributionFactor = contributionFactor;
        this.onYearOutcome = onYearOutcome;
        
        if(globalState.nations.length === 0){
            this.globalState.nations = this.generateNations();
        }
    }


    private generateNations(): Nation[] {
        const totalNations = 9; 
        const categories = ["low", "medium", "high"] as const;
        const resourceRatios = { low: 1, medium: 2, high: 4 }; 
    
        const baseResources = 100;
        const basePopulation = 1_000_000_000;
    
        const nations: Nation[] = [];
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
                    id: idCounter,
                    name: `Nation ${idCounter}`,
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

    private calcStateChanges(
        nation: Nation,
        choice: Choice,
    ) {
        const nationPopulationFactor = nation.population / this.globalState.totalPopulation;
        const nationResourcesDepleted = nation.resources.food <= 0 || nation.resources.energy <= 0 || nation.resources.water <= 0;
        const nationPopulationChange = nationResourcesDepleted? -Math.floor(nation.population * 0.1): Math.floor(nation.population * 0.01) ;
        const newState =  nationResourcesDepleted? "struggling" : "normal";

        if (choice === "cooperate") {
            // Global resource contribution proportional to the nation's population
            const foodContribution = Math.floor(this.globalState.totalResources.food * this.contributionFactor * nationPopulationFactor);
            const energyContribution = Math.floor(this.globalState.totalResources.energy * this.contributionFactor * nationPopulationFactor);
            const waterContribution = Math.floor(this.globalState.totalResources.water * this.contributionFactor * nationPopulationFactor);
    
            const nationChanges = {
                food: -foodContribution,
                energy: -energyContribution,
                water: -waterContribution,
                population: nationPopulationChange,
                state: newState
            };
    
            const globalChanges = {
                food: foodContribution,
                energy: energyContribution,
                water: waterContribution,
            };
        
            return { nationChanges, globalChanges };
        } else if (choice === "defect") {
            // Resource gain proportional to the nation's population
            const foodGain = Math.floor(this.globalState.totalResources.food * this.defectGainFactor * nationPopulationFactor);
            const energyGain = Math.floor(this.globalState.totalResources.energy * this.defectGainFactor * nationPopulationFactor);
            const waterGain = Math.floor(this.globalState.totalResources.water * this.defectGainFactor * nationPopulationFactor);
    
            const nationChanges = {
                food: foodGain,
                energy: energyGain,
                water: waterGain,
                population: nationPopulationChange,
                state: newState
            };
    
            const globalChanges = {
                food: -foodGain,
                energy: -energyGain,
                water: -waterGain,
            };
    
            return { nationChanges, globalChanges };
        } else {
            return { 
                nationChanges: { food: 0, energy: 0, water: 0, population: nationPopulationChange, state: newState }, 
                globalChanges: { food: 0, energy: 0, water: 0 } 
            };
        }
    }

    private applyChanges(nation: Nation, nationChanges: NationChanges, globalChanges: Resources) {
        if (nation.state !== nationChanges.state) {
            resultsLogger.info("state_transition", {
                nation: nation.name,
                from: nation.state,
                to: nationChanges.state,
                year: this.globalState.year,
            });
        }
    
        nation.resources.food = Math.max(nation.resources.food + nationChanges.food, 0);
        nation.resources.energy = Math.max(nation.resources.energy + nationChanges.energy, 0);
        nation.resources.water = Math.max(nation.resources.water + nationChanges.water, 0);
        nation.population += nationChanges.population;
        nation.state = nationChanges.state as Nation['state'];
    
        this.globalState.totalResources.energy = Math.max(this.globalState.totalResources.energy + globalChanges.energy, 0);
        this.globalState.totalResources.food = Math.max(this.globalState.totalResources.food + globalChanges.food, 0);
        this.globalState.totalResources.water = Math.max(this.globalState.totalResources.water + globalChanges.water, 0);
        this.globalState.totalPopulation += nationChanges.population;
    }
    
    
    
    private async decide(nation: Nation): Promise<{ choice: Choice; reasoning: string }> {
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
        - Current Year: ${this.globalState.year}
        - Total Global Population: ${this.globalState.totalPopulation}
        - Total Global Resources: Food: ${this.globalState.totalResources.food}, Energy: ${this.globalState.totalResources.energy}, Water: ${this.globalState.totalResources.water}
        - Global Resource Depletion Rates: Food: ${this.resourceDepletionRate.food}, Energy: ${this.resourceDepletionRate.energy}, Water: ${this.resourceDepletionRate.water}
        - Number of Nations Still Active: ${this.globalState.nations.filter(n => !n.isCollapsed).length}
        - Is Global Collapse Imminent: ${this.globalState.isGlobalCollapse ? "Yes" : "No"}
        
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
            logger.error(`Invalid AI Response for nation ${nation.name} in year ${this.globalState.year}`);
            throw new Error("Invalid AI Response");
        }
    
        return { choice: res.choice, reasoning: res.reasoning };
    }

    private isGlobalCollapse():boolean {
        const globalResourcesDepleted = this.globalState.totalResources.food <= 0 || this.globalState.totalResources.energy <= 0 || this.globalState.totalResources.water <= 0;
        const extinct = this.globalState.totalPopulation <= 0;
        const allNationsCollapsed = this.globalState.nations.filter((nation) => !nation.isCollapsed).length === 0;

        if (globalResourcesDepleted || extinct || allNationsCollapsed) {
            resultsLogger.info("Global collapse has occurred 💀");
            return true;
        }
        return false;
    }

    public async run(): Promise<GlobalState> {
    
        for (let year = 1; year <= this.maxYears; year++) {
            
            resultsLogger.info(`Year ${year} begins`);
            this.globalState.year = year;
            let globalCooperation = 0;
            let globalDefection = 0;
            let nationChoice = "";  // needs to be initialised for use in yearly outcome

            const results = await Promise.all(
                this.globalState.nations.map(async (nation) => {
                    if (nation.isCollapsed) return null;
            
                    try {
                        const { choice, reasoning } = await this.decide(nation);
                        resultsLogger.info("choice", { nation: nation.name, choice, reasoning });
                        const { globalChanges, nationChanges } = this.calcStateChanges(nation, choice);
                        return { nation, choice, globalChanges, nationChanges };
                    } catch (error: any) {
                        resultsLogger.error("decision_failure", {
                            nation: nation.name,
                            year: this.globalState.year,
                            error: error.message || error,
                        });
            
                        const defaultChoice = nation.state === "struggling" ? "defect" : "cooperate";
                        const { globalChanges, nationChanges } = this.calcStateChanges(nation, defaultChoice);
                        resultsLogger.warn("default_decision_applied", {
                            nation: nation.name,
                            year: this.globalState.year,
                            defaultChoice,
                        });
            
                        return { nation, choice: defaultChoice, globalChanges, nationChanges };
                    }
                })
            )
            
            for (const result of results) {
                if (result) {
                    const { nation, choice, globalChanges, nationChanges } = result;
                    nationChoice = choice; 
                    this.applyChanges(nation, nationChanges, globalChanges);
            
                    if (choice === "cooperate") {
                        globalCooperation++;
                    } else if (choice === "defect") {
                        globalDefection++;
                    }
            
                    if (nation.population <= 0) {
                        nation.isCollapsed = true;
                        resultsLogger.info(`collapse`, { nation: nation.name });
                    }
                }
            }
            
            this.globalState.totalResources.food = Math.max(this.globalState.totalResources.food - this.resourceDepletionRate.food, 0);
            this.globalState.totalResources.energy = Math.max(this.globalState.totalResources.energy - this.resourceDepletionRate.energy, 0);
            this.globalState.totalResources.water = Math.max(this.globalState.totalResources.water - this.resourceDepletionRate.water, 0);
    
            if(this.isGlobalCollapse()) break;

            const outcome: YearlyOutcome = {
                year: this.globalState.year,
                globalCooperation,
                globalDefection,
                globalResources: this.globalState.totalResources,
                globalPopulation: this.globalState.totalPopulation,
                nations: this.globalState.nations
                .filter(n => !n.isCollapsed)
                .map(nation => ({
                    id: nation.id,
                    population: nation.population,
                    state: nation.state,
                    choice: nationChoice as Choice
                })),
                activeNations: this.globalState.nations.filter(n => !n.isCollapsed).length,
            }
            resultsLogger.info("yearly_outcome", outcome);
            this.onYearOutcome?.(outcome);
        }
    
        if (!this.globalState.isGlobalCollapse && this.globalState.year >= this.maxYears) {
            resultsLogger.info(`Victory: Humanity has survived ${this.maxYears} years. 🎉`);
        } else {
            resultsLogger.info("Loss: Humanity has failed to survive 100 years. 💀");
        }
    
        return this.globalState;
    }
}