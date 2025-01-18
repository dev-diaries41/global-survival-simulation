import { Logger } from "winston";
import { DecisionOptions, SyntheticDataOptions, SimultionOptions } from "./types";
import { DataSimulator } from "./data";

export abstract class Simulation<Entity extends Record<string, any>, Environment extends Record<string, any>, Outcome extends Record<string, any>> {
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

    // Decide an action for each entity in each step using LLMs.
    protected abstract decide<T extends string = string>(entity: Entity, decisionOptions?: DecisionOptions): Promise<T>;

    // Get state changes based on the decision by an entity.
    protected abstract getStateChanges(entity: Entity, decision: string): { entityChanges: Record<string, any>; environmentChanges: Record<string, any> };

    // Update an entity after a decision.
    protected abstract updateEntity(entity: Entity, entityChanges: Record<string, any>): void;

    // Update the environment after the step.
    protected abstract updateEnvironment(results: (Record<string, any>|null)[]): Outcome;

    protected  abstract isSimulationOver(): boolean;

    abstract  run (): Promise<Environment>;

}
