import { LLMClient } from "../llms/base";
import {SimulationType, SimultionOptions } from "../types";

export abstract class Simulation<Entity extends Record<string, any>, Environment extends Record<string, any>, StepResult extends Record<string, any>> {
    protected entities: Entity[];
    protected environment: Environment;
    protected llmClient?: LLMClient;
    readonly steps: number;
    readonly type: SimulationType;


    protected eventHandlers: {
        onStepComplete?: (eventData: StepResult) => void;
        onComplete?: (environment: Environment) => void;
    };

    protected readonly defaultSimulationOptions: Pick<SimultionOptions, "type" | "steps"> = {
        steps: 10,
        type: "sim",
    };

    constructor(entities: Entity[], environment: Environment, simulationOptions: Partial<SimultionOptions>) {
        this.entities = entities;
        this.environment = environment;

        // Use default options to fill in missing values
        const { steps, type, ...eventHandlers } = { 
            ...this.defaultSimulationOptions, 
            ...simulationOptions 
        };

        this.steps = steps;
        this.type = type;
        this.eventHandlers = eventHandlers;
    }

    // Decide an action for each entity in each step using LLMs.
    protected abstract decide<T extends string = string>(entity: Entity, prompt?: string, systemPrompt?: string): Promise<T>;

    // Get state changes based on the decision by an entity.
    protected abstract getStateChanges(entity: Entity, decision: string): { entityChanges: Record<string, any>; environmentChanges: Record<string, any> };

    // Update an entity after a decision.
    protected abstract updateEntity(entity: Entity, entityChanges: Record<string, any>): void;

    // Update the environment after the step.
    protected abstract updateEnvironment(results: (Record<string, any> | null)[]): StepResult;

    protected abstract isSimulationCompleted(): boolean;

    abstract run(): Promise<Environment>;
}
