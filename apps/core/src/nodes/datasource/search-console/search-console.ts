import { merge } from "lodash-es";
import { SetOptional } from "type-fest";
import { assign, createMachine, fromPromise, PromiseActorLogic } from "xstate";

import { RouterInputs, RouterOutputs } from "@seocraft/api";

import { SWRSelectControl } from "../../../controls/swr-select";
import { DiContainer } from "../../../types";
import { BaseMachineTypes, BaseNode, ParsedNode } from "../../base";

export const GoogleSearchConsoleMachine = createMachine({
  id: "search-console",
  initial: "idle",
  context: ({ input }) =>
    merge(
      {
        action: {
          type: "query",
          inputs: {},
        },
        inputs: {},
        inputSockets: [
          {
            name: "startDate",
            type: "date",
            description: "Start Date",
            required: true,
            isMultiple: false,
          },
          {
            name: "endDate",
            type: "date",
            description: "End Date",
            required: true,
            isMultiple: false,
          },
        ],
        outputs: {},
        outputSockets: [],
        error: null,
      },
      input,
    ),
  types: {} as BaseMachineTypes<{
    input: {
      action: {
        type: "query";
        inputs: RouterInputs["google"]["searchConsole"]["query"];
      };
    };
    context: {
      action: {
        type: "query";
        inputs: RouterInputs["google"]["searchConsole"]["query"];
      };
    };
    actions: any;
    actors: {
      src: "query";
      logic: PromiseActorLogic<
        RouterOutputs["google"]["searchConsole"]["query"],
        RouterInputs["google"]["searchConsole"]["query"]
      >;
    };
    events: {
      type: "R";
    };
  }>,
  states: {
    idle: {
      on: {
        RUN: {
          target: "running",
        },
        SET_VALUE: {
          actions: ["setValue"],
        },
      },
    },
    running: {
      initial: "determineAction",
      states: {
        determineAction: {
          always: [
            {
              guard: ({ context }) => context.action.type === "query",
              target: "#search-console.running.query",
            },
          ],
        },
        query: {
          entry: [
            assign({
              action: ({ context }) => ({
                ...context.action,
                inputs: {
                  siteUrl: context.inputs.siteUrl,
                  requestBody: {
                    ...context.action.inputs.requestBody,
                    startDate: context.inputs.startDate,
                    endDate: context.inputs.endDate,
                  },
                },
              }),
            }),
          ],
          invoke: {
            src: "query",
            input: ({ context }) => context.action.inputs,
            onDone: {
              target: "#search-console.complete",
              actions: [
                assign({
                  outputs: ({ event }) => event.output,
                }),
              ],
            },
            onError: {
              target: "#search-console.error",
            },
          },
        },
      },
    },
    complete: {},
    error: {},
  },
});

export type GoogleSearchConsoleData = ParsedNode<
  "GoogleSearchConsole",
  typeof GoogleSearchConsoleMachine
>;

export class GoogleSearchConsole extends BaseNode<
  typeof GoogleSearchConsoleMachine
> {
  static nodeType = "GoogleSearchConsole" as const;
  static label = "Google Search Console";
  static description = "Google Search Console node of the workflow";
  static icon = "searchConsole";

  static parse(
    params: SetOptional<GoogleSearchConsoleData, "type">,
  ): GoogleSearchConsoleData {
    return {
      ...params,
      type: "GoogleSearchConsole",
    };
  }

  constructor(di: DiContainer, data: GoogleSearchConsoleData) {
    super("GoogleSearchConsole", di, data, GoogleSearchConsoleMachine, {
      actors: {
        query: fromPromise(({ input }) =>
          this.di.api.trpc.google.searchConsole.query.query(input),
        ),
      },
    });

    this.addControl(
      "site",
      new SWRSelectControl(
        () => this.snap.context.inputs.siteUrl,
        "select site",
        "trpc.google.searchConsole.sites",
        () => this.di.api.trpc.google.searchConsole.sites.query(),
        (vals) =>
          vals.map((v) => ({
            key: v.siteUrl || v.url,
            value: v.url,
          })),
        (val) => {
          this.actor.send({
            type: "SET_VALUE",
            values: {
              siteUrl: val,
            },
          });
        },
      ),
    );
  }
}
