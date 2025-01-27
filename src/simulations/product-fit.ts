// import { zodResponseFormat } from "openai/helpers/zod";
// import { z } from "zod";
// import { ProductFitChoice, DecisionResult, ProductFitEnvironment, BetaTester, NationChanges, SimulationConfig, BetaTestersFeedback, StepOutcome, GlobalChanges } from "../types";
// import { Simulation } from "./base";

// export class ProductFitSimulation extends Simulation<BetaTester, ProductFitEnvironment, BetaTestersFeedback> {
//     constructor(entities: BetaTester[], environment: ProductFitEnvironment, simulationConfig: Partial<SimulationConfig> = {}) {
//         super(entities, environment, simulationConfig);
//     }
    
//     private generateSimulationPrompt(nation: BetaTester) { 
       
//     }

//     protected async decide<ProductFitChoice>(nation: BetaTester, prompt?: string, systemPrompt?: string): Promise<ProductFitChoice> {        
//         const simulateDecision = async (duration: number): Promise<{ decision: ProductFitChoice }> => {
//             await new Promise<void>((resolve) => setTimeout(resolve, duration));
//             return { decision: (Math.random() < 0.5 ? "defect" : "cooperate") as ProductFitChoice };
//         };
    
//         const res = this.type === "llm" && this.llmClient && prompt?
//                 await this.llmClient.generateJson(prompt, {
//                       systemPrompt,
//                       responseFormat: zodResponseFormat(
//                           z.object({
//                               decision: z.string(),
//                               reasoning: z.string(),
//                           }),
//                           "decision"
//                       ),
//                   }) : await simulateDecision(1500);
    
//         if (!res || !res.decision) {
//             throw new Error("Invalid decision");
//         }
    
//         return res.decision;
//     }
    

//     protected isSimulationCompleted():boolean {
//         const maxStepsReached = this.environment.year >= this.steps;
//         return  maxStepsReached;
//     }
  

//     async  runStep(entity: BetaTester): Promise<DecisionResult<BetaTester, GlobalChanges, NationChanges> | null> {
       
//     }

//     public async run(): Promise<ProductFitEnvironment> {
//         for (let year = 1; year <= this.steps; year++) {
//             const results = await Promise.all(this.entities.map(async (nation) => await this.runStep(nation)));
    
//             for (const result of results) {
//                 if (result) {
//                     const { entity, entityChanges, decision } = result;
//                     this.updateEntity(entity, entityChanges, decision as ProductFitChoice);
//                 }
//             }
    
//             const stepOutcome = this.updateEnvironment(results);
//             this.eventHandlers.onStepComplete?.(stepOutcome);
//             if (this.isSimulationCompleted()) break;
//         }
//         return this.environment;
//     }
// }