import { ClassicPreset } from "rete";
import { type DiContainer } from "../types";
import {
  Actor,
  type AnyStateMachine,
  type ContextFrom,
  type MachineImplementationsFrom,
  type SnapshotFrom,
  type StateFrom,
  createActor,
  waitFor,
  PersistedStateFrom,
  AnyActorLogic,
  InputFrom,
} from "xstate";
import { debounce, isEqual, isUndefined, set } from "lodash-es";
import { type AllSockets, Socket } from "../sockets";
import type { NodeTypes, Node } from "../types";
import { BaseControl } from "../controls/base";
import { Input, Output } from "../input-output";

export type NodeData<T extends AnyStateMachine> = Node & {
  context: {
    state?: StateFrom<T>;
  };
};
export type ParsedNode<
  NodeType extends string,
  Machine extends AnyActorLogic
> = Node & {
  id: string;
  type: NodeType; // Or a more specific type if possible
  context?: InputFrom<Machine> | ContextFrom<Machine>;
  state?: PersistedStateFrom<Machine>;
};

export abstract class BaseNode<
  Machine extends AnyStateMachine,
  Inputs extends {
    [key in string]?: AllSockets;
  } = {
    [key in string]?: AllSockets;
  },
  Outputs extends {
    [key in string]?: AllSockets;
  } = {
    [key in string]?: AllSockets;
  },
  Controls extends {
    [key in string]?: BaseControl & { name?: string };
  } = {
    [key in string]?: BaseControl & { name?: string };
  }
> extends ClassicPreset.Node<Inputs, Outputs, Controls> {
  static nodeType: string;

  public di: DiContainer;

  public actor: Actor<AnyStateMachine>;

  public state: "idle" | "running" | "error" = "idle";

  public width = 200;
  public height = 200;

  readonly workflowId: string;
  readonly workflowVersionId: string;
  readonly contextId: string;
  readonly projectId: string;

  public count = 0;

  public inputs: {
    [key in keyof Inputs]?: Input<Exclude<Inputs[key], undefined>>;
  } = {};

  public outputs: {
    [key in keyof Outputs]?: Output<Exclude<Outputs[key], undefined>>;
  } = {};

  public isExecution: boolean;
  public isReady: boolean = false;
  // executionNode: Node["nodeExectutions"][number] | undefined;

  constructor(
    public readonly ID: NodeTypes,
    di: DiContainer,
    public nodeData: ParsedNode<NodeTypes, Machine>,
    public machine: Machine,
    public machineImplements: MachineImplementationsFrom<Machine>
  ) {
    super(nodeData.label);
    if (nodeData.width) this.width = nodeData.width;
    if (nodeData.height) this.height = nodeData.height;
    this.workflowVersionId = nodeData.workflowVersionId;
    this.workflowId = nodeData.workflowId;
    this.contextId = nodeData.contextId;
    this.projectId = nodeData.projectId;
    this.id = nodeData.id;
    this.di = di;

    this.isExecution = !isUndefined(this.nodeData.executionId);

    const saveContextDebounced = debounce(
      async ({ context }: { context: ContextFrom<Machine> }) => {
        // this.di.logger.log(this.identifier, "SAVING CONTEXT STATE");
        this.di.api.setContext({
          contextId: this.contextId,
          context: JSON.stringify(context),
        });
      },
      1000
    );
    if (this.nodeData.state) {
      const actorInput = {
        state: this.nodeData.state,
      };
      this.di.logger.log(this.identifier, "CREATING EXECTION ACTOR WITH STATE");
      set(this.machine.config.states!, "complete.type", "final"); // inject complete "final" in the execution instance.
      const a = this.machine.provide(this.machineImplements as any);
      this.actor = createActor(a, {
        id: this.id,
        ...actorInput,
      });
    } else {
      const a = this.machine.provide(this.machineImplements as any);
      this.actor = createActor(a, {
        id: this.contextId,
        ...(this.nodeData?.context && {
          input: {
            ...this.nodeData.context,
          },
        }),
      });
    }

    // Initial state for the execution node.
    if (this.nodeData.executionId && this.nodeData.state === null) {
      this.saveState({ state: this.actor.getSnapshot() });
    }

    let prev = this.actor.getSnapshot();
    this.actor.subscribe({
      complete: async () => {
        // this.di.logger.log(this.identifier, "finito main");
      },
      next: async (state) => {
        this.state = state.value as any;
        if (
          !isEqual(prev.context.outputs, state.context.outputs) &&
          state.matches("complete")
        ) {
          this.di.dataFlow?.cache.delete(this.id); // reset cache for this node.
          if (!this.isExecution) {
            // Only update ancestors if this is not an execution node
            await this.updateAncestors();
          }
        }

        prev = state;
        if (this.isExecution) {
          this.saveState({ state });
        } else {
          if (!this.di.readonly?.enabled) {
            saveContextDebounced({ context: state.context });
          }
        }
      },
    });

    this.actor.start();
    this.isReady = true;
  }

  public async updateAncestors() {
    await waitFor(this.actor, (state) => state.matches("complete")); //wait for the node to complete

    const outgoers = this.di.graph.outgoers(this.id).nodes();
    this.di.logger.log(this.identifier, "updateAncestors", outgoers);
    for (const node of outgoers) {
      // this.di.logger.log("calling data on", node.ID, node.id);
      const inputs = (await this.di.dataFlow?.fetchInputs(node.id)) as any; // reset cache for this node.
      await node.compute(inputs);
    }
  }

  async saveState({ state }: { state: SnapshotFrom<AnyStateMachine> }) {
    this.di.logger.log(this.identifier, "SAVING STATE");

    if (this.nodeData.executionNodeId && this.nodeData.executionId) {
      return await this.di.api.updateExecutionNode({
        id: this.nodeData.executionNodeId,
        state: JSON.stringify(state),
      });
    } else {
      this.di.logger.warn(
        "No Execution Node passed data will be not persisted"
      );
    }
  }

  async execute(
    input: any,
    forward: (output: "trigger") => void,
    executionId: string
  ) {
    // this.di.logger.log(this.identifier, "EXECUTE", {
    //   input,
    //   executionId,
    //   state: this.actor.getSnapshot(),
    // });

    // EARLY RETURN IF NODE IS COMPLETE
    if (this.actor.getSnapshot().matches("complete")) {
      // this.di.logger.log(this.identifier, "finito Execute", this.outputs);
      if (this.outputs.trigger) {
        // forward("trigger");
        if (this.di.headless) {
          await this.triggerSuccesors(executionId);
        } else {
          forward("trigger");
        }
        return;
      }
    }

    const inputs = await this.getInputs();
    // this.di.logger.log(this.identifier, "INPUTS", inputs);
    this.actor.send({
      type: "RUN",
      inputs,
    });
    this.actor.subscribe({
      complete: async () => {
        this.di.logger.log(this.identifier, "finito Execute", this.outputs);
        if (this.outputs.trigger) {
          // forward("trigger");
          if (this.di.headless) {
            await this.triggerSuccesors(executionId);
          } else {
            forward("trigger");
          }
        }
      },
    });
    await waitFor(this.actor, (state) => state.matches("complete"), {
      timeout: 1000 * 60 * 5,
    });
  }

  async triggerSuccesors(executionId: string) {
    const cons = this.di.editor.getConnections().filter((c) => {
      return c.source === this.id && c.sourceOutput === "trigger";
    });

    cons.forEach(async (con) => {
      const node = this.di.editor.getNode(con.target);
      if (!node) return;
      await this.di.api.triggerWorkflowExecutionStep({
        executionId,
        workflowNodeId: node.id,
        // projectSlug: this.nodeData.project.slug,
        // workflowSlug: this.nodeData.workflow.slug,
        // version: this.nodeData.workflowVersion.version,
      });
    });
  }

  get identifier() {
    return `${this.ID}-${this.id.substring(-5)}`;
  }
  /**
   * This function should be sync
   * @returns The outputs of the current node.
   */
  async data(inputs?: any) {
    this.count++;
    this.di.logger.log(this.identifier, "Calling DATA");
    inputs = inputs || (await this.getInputs());
    let state = this.actor.getSnapshot();
    if (
      state.context.inputs &&
      !isEqual(state.context.inputs, inputs) &&
      this.ID !== "InputNode"
    ) {
      this.di.logger.log(
        this.identifier,
        "inputs are not matching computing",
        inputs,
        state.context.inputs
      );
      await this.compute(inputs);
    }
    // this.di.logger.log(this.identifier, "actor in data", this.actor);
    if (state.matches("running")) {
      this.di.logger.log(this.identifier, "waiting for complete");
      await waitFor(this.actor, (state) => state.matches("complete"));
    }
    state = this.actor.getSnapshot();
    return state.context.outputs;
  }

  async compute(inputs: any) {
    // this.debug.log("process", inputs);
  }

  get minHeightForControls(): number {
    let min = 200;
    Object.values(this.controls).forEach((control) => {
      control?.minHeight && (min += control.minHeight);
    });

    return min;
  }

  public setSize(size: { width: number; height: number }) {
    this.width = size.width;
    this.height = size.height;
  }

  get size() {
    return {
      width: this.width,
      height: this.height,
    };
  }

  async setInputs(inputs: Record<string, Socket>) {
    const newInputs = Object.entries(inputs);
    newInputs.forEach(([key, socket]) => {
      if (this.hasInput(key)) {
        if (this.inputs[key]?.socket.name !== socket.name) {
          this.inputs[key]?.socket;
        }
      } else {
        this.addInput(key, new Input(socket as any, key, false));
      }
    });

    Object.entries(this.inputs).forEach(async ([key, input]) => {
      if (input?.socket.name === "Trigger") return;
      if (!newInputs.find(([k]) => k === key)) {
        await Promise.all(
          this.di.editor
            .getConnections()
            .filter((c) => c.target === this.id && c.targetInput === key)
            .map(async (c) => {
              await this.di.editor.removeConnection(c.id);
            })
        );
        this.removeInput(key);
      }
    });
  }

  async setOutputs(outputs: Record<string, Socket>) {
    const newOutputs = Object.entries(outputs);
    newOutputs.forEach(([key, socket]) => {
      if (this.hasOutput(key)) {
        if (this.outputs[key]?.socket.name !== socket.name) {
          this.outputs[key]?.socket;
        }
      } else {
        this.addOutput(key, new Output(socket as any, key, false));
      }
    });

    Object.entries(this.outputs).forEach(async ([key, output]) => {
      if (output?.socket.name === "Trigger") return;
      if (!newOutputs.find(([k]) => k === key)) {
        await Promise.all(
          this.di.editor
            .getConnections()
            .filter((c) => c.source === this.id && c.sourceOutput === key)
            .map(async (c) => {
              await this.di.editor.removeConnection(c.id);
            })
        );
        this.removeOutput(key);
      }
    });
  }

  async setLabel(label: string) {
    this.label = label;
  }

  /**
   * This function waits for the actor's state to match a given state value.
   * It subscribes to the actor's state changes and checks if the new state matches the given state value.
   * If the state does not match, it waits for 500ms before checking again.
   * Once the state matches the given value, it unsubscribes from the actor's state changes.
   * If the state does not match the given value within 30 seconds, it throws an error.
   *
   * @param {string} stateValue - The state value to wait for.
   */
  async waitForState(actor: Actor<AnyStateMachine>, stateValue: string) {
    let state = actor.getSnapshot();
    const sub = actor.subscribe((newState) => {
      state = newState;
    });
    const startTime = Date.now();
    while (!state.matches(stateValue)) {
      this.di.logger.log("waiting for complete", this.ID, state.value);
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (Date.now() - startTime > 30000) {
        sub.unsubscribe();
        throw new Error(
          `State did not match the given value '${stateValue}' within 30 seconds`
        );
      }
    }
    sub.unsubscribe();
  }

  /**
   * This function retrieves the inputs for the current node.
   * It first resets the data flow, then fetches the inputs for the current node id.
   * It then iterates over the inputs and if an input does not exist and has a control, it sets the input to the corresponding value from the actor's state context.
   * After that, it normalizes the inputs based on whether the input accepts multiple connections.
   * If an input does not accept multiple connections and its value is an array, it flattens the value to the first element of the array.
   * Finally, it returns the inputs.
   */
  async getInputs() {
    try {
      this.di.dataFlow?.reset();
      if (this.ID === "InputNode") {
        return this.actor.getSnapshot().context.inputs;
      }

      // const ancestors = this.di.graph
      //   .ancestors((n) => n.id === this.id)
      //   .nodes();
      // for (const node of ancestors) {
      //   this.di.logger.log(this.identifier, "calling data on", node.ID, node.id);
      //   const inputs = (await this.di.dataFlow?.fetchInputs(node.id)) as any; // reset cache for this node.
      //   await node.compute(inputs);
      // }

      const inputs = (await this.di?.dataFlow?.fetchInputs(this.id)) as {
        [x: string]: string;
      };
      this.di.logger.log(this.identifier, "inputs from data flow", inputs);
      const state = this.actor.getSnapshot();
      Object.keys(this.inputs).forEach((key) => {
        if (!inputs[key] && this.inputs[key]?.control) {
          inputs[key] = state.context.inputs[key];
        }
      });

      // Normalize inputs based on if input accepts multipleConnections
      // If not, flatten the value instead of array
      Object.keys(inputs).forEach((key) => {
        if (!this.inputs[key]?.multipleConnections) {
          inputs[key] = Array.isArray(inputs[key])
            ? inputs[key][0]
            : inputs[key];
        }
      });
      return inputs;
    } catch (e) {
      this.di.logger.error(e);
    }
  }
}
