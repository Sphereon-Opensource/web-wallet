import {createMachine, interpret, Interpreter, StateMachine} from 'xstate'

const verifierMachine: StateMachine<unknown, any, any> = createMachine(
  {
    id: 'verify_vc',
    initial: 'IDLE',
    states: {
      IDLE: {
        on: {
          SUBMIT: {
            target: 'VERIFYING_VC',
          },
        },
      },
      VERIFYING_VC: {
        invoke: {
          src: 'verifyVC',
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
    services: {verifyVC: (context, event): any => {}},
    guards: {},
    delays: {},
  },
)

const verifierActor: Interpreter<unknown, any, any, any, any> = interpret(verifierMachine)

export default verifierActor
