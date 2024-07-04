import {createMachine, interpret, Interpreter, StateMachine} from 'xstate'

const issuerMachine: StateMachine<unknown, any, any> = createMachine(
  {
    id: 'issue_vc',
    initial: 'IDLE',
    states: {
      IDLE: {
        on: {
          SUBMIT: {
            target: 'ISSUEING_VC',
          },
        },
      },
      ISSUEING_VC: {
        invoke: {
          src: 'issueVC',
          onDone: [
            {
              target: 'SUCCESS',
            },
          ],
          onError: [
            {
              target: 'ERROR',
            },
          ],
        },
      },
      SUCCESS: {
        type: 'final',
      },
      ERROR: {
        type: 'final',
      },
    },
    predictableActionArguments: true,
    preserveActionOrder: true,
  },
  {
    actions: {},
    services: {issueVC: (context, event): any => {}},
    guards: {},
    delays: {},
  },
)

const issuerActor: Interpreter<unknown, any, any, any, any> = interpret(issuerMachine)

export default issuerActor
