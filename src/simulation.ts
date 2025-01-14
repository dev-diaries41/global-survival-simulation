import { zodResponseFormat } from "openai/helpers/zod";
import { generateJSON } from "./utils/openai";
import { z } from "zod";
import { logger, resultsLogger } from "./logger";
import { Choice, GlobalState, Nation, ResourceDepletionRate, Resources, YearlyOutcome } from "./types";


export class SurvivalSimulation {
    private globalState: GlobalState;
    private resourceDepletionRate: ResourceDepletionRate;
    private contributionFactor: number;
    private defectGainFactor: number;
    private maxYears: number;

    constructor(
        globalState: GlobalState, 
        resourceDepletionRate: ResourceDepletionRate, 
        maxYears: number = 10,
        contributionFactor: number=0.05, 
        defectGainFactor: number = 0.1,
    ){
        this.globalState = globalState;
        this.resourceDepletionRate = resourceDepletionRate;
        this.maxYears = maxYears;
        this.defectGainFactor= defectGainFactor;
        this.contributionFactor = contributionFactor;
        
        if(globalState.nations.length === 0){
            this.globalState.nations = this.generateNations()
        }
    }


    private generateNations(): Nation[] {
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

    private applyProportionalResourceChange(
        nation: Nation,
        choice: Choice,
    ) {
        const nationPopulationFactor = nation.population / this.globalState.totalPopulation;
    
        if (choice === "cooperate") {
            // Global resource contribution proportional to the nation's population
            const foodContribution = Math.floor(this.globalState.totalResources.food * this.contributionFactor * nationPopulationFactor);
            const energyContribution = Math.floor(this.globalState.totalResources.energy * this.contributionFactor * nationPopulationFactor);
            const waterContribution = Math.floor(this.globalState.totalResources.water * this.contributionFactor * nationPopulationFactor);
    
            // Update global resources
            this.globalState.totalResources.food += foodContribution;
            this.globalState.totalResources.energy += energyContribution;
            this.globalState.totalResources.water += waterContribution;
    
            // Deduct resources from the nation
            nation.resources.food = Math.max(nation.resources.food - foodContribution, 0);
            nation.resources.energy = Math.max(nation.resources.energy - foodContribution, 0);
            nation.resources.water = Math.max(nation.resources.water - foodContribution, 0);
            
        } else if (choice === "defect") {
            // Resource gain proportional to the nation's population
            const foodGain = Math.floor(this.globalState.totalResources.food * this.defectGainFactor * nationPopulationFactor);
            const energyGain = Math.floor(this.globalState.totalResources.energy * this.defectGainFactor * nationPopulationFactor);
            const waterGain = Math.floor(this.globalState.totalResources.water * this.defectGainFactor * nationPopulationFactor);
    
            // Increase nation resources
            nation.resources.food += foodGain;
            nation.resources.energy += energyGain;
            nation.resources.water += waterGain;
    
            // Decrease global resources
            this.globalState.totalResources.food -= foodGain;
            this.globalState.totalResources.energy -= energyGain;
            this.globalState.totalResources.water -= waterGain;
        }
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

    public async run(): Promise<GlobalState> {
    
        for (let year = 1; year <= this.maxYears; year++) {
            
            resultsLogger.info(`Year ${year} begins`);
            this.globalState.year = year;
            let globalCooperation = 0;
            let globalDefection = 0;
    
            for (const nation of this.globalState.nations) {
                try {
                    if (nation.isCollapsed) continue; // Skip collapsed nations
    
                    const {choice, reasoning} = await this.decide(nation);
                    resultsLogger.info("choice", {nation: nation.name, choice, reasoning});
        
                    if (choice === "cooperate") {
                        globalCooperation++;
                    } else if (choice === "defect") {
                        globalDefection++;
                    }
                    this.applyProportionalResourceChange(nation, choice);
    
                    const previousPopulation = nation.population;
        
                    // Adjust Population and State Based on Resources
                    const previousState = nation.state; 
                    if (nation.resources.food <= 0 || nation.resources.energy <= 0 || nation.resources.water <= 0) {
                        nation.state = "struggling";
                        nation.population -= Math.floor(nation.population * 0.1); // Reduce population by 10% if struggling
                    } else {
                        nation.state = "normal";
                        nation.population += Math.floor(nation.population * 0.01); // Increase population by 2% if resources are fine
                    }
    
                    const populationChange = nation.population - previousPopulation;
                    this.globalState.totalPopulation += populationChange;
        
                    if (nation.population <= 0) {
                        nation.isCollapsed = true;
                        resultsLogger.info(`collapse`, {nation: nation.name});
                    }
        
                    if (nation.state !== previousState) {
                        resultsLogger.info("state_transition", {
                            nation: nation.name,
                            from: previousState,
                            to: nation.state,
                            year: this.globalState.year,
                        });
                    }

                    const outcome: YearlyOutcome = {
                        year: this.globalState.year,
                        globalCooperation,
                        globalDefection,
                        globalResources: this.globalState.totalResources,
                        globalPopulation: this.globalState.totalPopulation,
                        activeNations: this.globalState.nations.filter(n => !n.isCollapsed).length,
                    }
        
                    resultsLogger.info("yearly_outcome", outcome);
                
                } catch (error: any) {
                    // If openai call fails set a default choice to avoid terminating the simulation
                    resultsLogger.error("decision_failure", {
                        nation: nation.name,
                        year: this.globalState.year,
                        error: error.message || error,
                    });
    
                    const defaultChoice = nation.state === "struggling" ? "defect" : "cooperate";
                    resultsLogger.warn("default_decision_applied", {
                        nation: nation.name,
                        year: this.globalState.year,
                        defaultChoice,
                    });
    
                if (defaultChoice === "cooperate") {
                    globalCooperation++;
                } else if (defaultChoice === "defect") {
                    globalDefection++;
                }
                this.applyProportionalResourceChange(nation, defaultChoice);
    
                }
            }
        
            this.globalState.totalResources.food = Math.max(this.globalState.totalResources.food - this.resourceDepletionRate.food, 0);
            this.globalState.totalResources.energy = Math.max(this.globalState.totalResources.energy - this.resourceDepletionRate.energy, 0);
            this.globalState.totalResources.water = Math.max(this.globalState.totalResources.water - this.resourceDepletionRate.water, 0);
            
    
            if (this.globalState.totalResources.food <= 0 || this.globalState.totalResources.energy <= 0 || this.globalState.totalResources.water <= 0) {
                this.globalState.isGlobalCollapse = true;
                resultsLogger.info("Global collapse has occurred due to resource depletion.");
                break;
            }
    
            if(this.globalState.totalPopulation <= 0){
                this.globalState.isGlobalCollapse = true;
                resultsLogger.info("Global collapse has occurred due to end of civilization.");
                break;
            }
    
            const activeNations = this.globalState.nations.filter((nation) => !nation.isCollapsed);
            if (activeNations.length === 0) {
                this.globalState.isGlobalCollapse = true;
                resultsLogger.info("Global collapse has occurred due to all nations collapsing.");
                break;
            }
        }
    
        if (!this.globalState.isGlobalCollapse && this.globalState.year >= this.maxYears) {
            resultsLogger.info(`Victory: Humanity has survived ${this.maxYears} years.`);
        } else {
            resultsLogger.info("Loss: Humanity has failed to survive 100 years.");
        }
    
        return this.globalState;
    }
    
}
