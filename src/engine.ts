abstract class SimulationEngine<Entity, Environment, Outcome> {
    protected entities: Entity[];
    protected environment: Environment;
    protected steps: number;
    protected onStepOutcome?: (outcome: Outcome) => void;

    constructor(entities: Entity[], environment: Environment, steps: number, onStepOutcome?: (outcome: Outcome) => void) {
        this.entities = entities;
        this.environment = environment;
        this.steps = steps;
        this.onStepOutcome = onStepOutcome;
    }

    // Abstract method to decide an action for each entity in each step.
    protected abstract decide<T extends string>(entity: Entity): Promise<T>;

    // Abstract method to calculate the changes based on the decision.
    protected abstract calcStateChanges(entity: Entity, decision: string): { entityChanges: Record<string, any>; environmentChanges: Record<string, any> };

    // Abstract method to apply the changes after a decision.
    protected abstract updateEntity(entity: Entity, entityChanges: Record<string, any>): void;

    // Abstract method to update the environment after the step.
    protected abstract updateEnvironment(results: (Record<string, any>|null)[]): Outcome;

    // Method to check if the simulation has ended
    protected  abstract isSimulationOver(): boolean;

    // Run the simulation for the defined steps.
    abstract  run (): Promise<Environment>;
        
}
