import { Logger } from "winston";
import { SimultionOptions } from "./types";

export abstract class Simulation<Entity, Environment, Outcome extends Record<string, any>> {
    protected entities: Entity[];
    protected environment: Environment;
    protected steps: number;
    protected onStepComplete?: (outcome: Outcome) => void;
    protected Logger?: Logger

    constructor(entities: Entity[], environment: Environment, simulationOptions: SimultionOptions) {
        this.entities = entities;
        this.environment = environment;

        const {steps, onStepComplete} = simulationOptions
        this.steps = steps;
        this.onStepComplete = onStepComplete;
    }

    // Abstract method to decide an action for each entity in each step using LLMs.
    protected abstract decide<T extends string>(entity: Entity): Promise<T>;

    // Get state changes based on the decision by an entity.
    protected abstract getStateChanges(entity: Entity, decision: string): { entityChanges: Record<string, any>; environmentChanges: Record<string, any> };

    // Abstract method to update an entity after a decision.
    protected abstract updateEntity(entity: Entity, entityChanges: Record<string, any>): void;

    // Abstract method to update the environment after the step.
    protected abstract updateEnvironment(results: (Record<string, any>|null)[]): Outcome;

    protected  abstract isSimulationOver(): boolean;

    // Run the simulation for the defined steps.
    abstract  run (): Promise<Environment>;
        
}
