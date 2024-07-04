import {createMachine, interpret, Interpreter, StateMachine} from 'xstate'

const inspectorMachine: StateMachine<unknown, any, any> = createMachine(
  {
    id: 'inspectorActor',
    initial: 'IDLE',
    states: {
      IDLE: {
        on: {
          QUALITY_PLAN_APPROVAL_RECEIVED: {
            target: 'VERIFYING_QUALITY_PLAN_APPROVAL',
          },
        },
      },
      VERIFYING_QUALITY_PLAN_APPROVAL: {
        invoke: {
          src: 'issueVC',
          id: 'invoke-26zuc',
          onDone: [
            {
              target: 'AWAITING_FIRST_INSPECTION_CERTIFICATE',
            },
          ],
          onError: [
            {
              target: 'UNABLE_TO_VERIFY_VC',
            },
          ],
        },
      },
      AWAITING_FIRST_INSPECTION_CERTIFICATE: {
        entry: {
          type: 'notify',
          params: {},
        },
        on: {
          FIRST_INSPECTION_CERTIFICATE_ADDED: {
            target: 'ISSUEING_FIRST_INSPECTION_CERTIFICATE_VC',
          },
        },
      },
      UNABLE_TO_VERIFY_VC: {},
      ISSUEING_FIRST_INSPECTION_CERTIFICATE_VC: {
        invoke: {
          src: 'issueVC',
          id: 'invoke-ipmeu',
          onDone: [
            {
              target: 'SENDING_FIRST_INSPECTION_CERTIFICATE',
            },
          ],
          onError: [
            {
              target: 'UNABLE_TO_ISSUE_VC',
            },
          ],
        },
      },
      SENDING_FIRST_INSPECTION_CERTIFICATE: {
        invoke: {
          src: 'sendToProcessOwner',
          id: 'invoke-zedt9',
          onDone: [
            {
              target: 'AWAITING_BILL_OF_LADING',
            },
          ],
          onError: [
            {
              target: 'UNABLE_TO_SEND',
            },
          ],
        },
      },
      UNABLE_TO_ISSUE_VC: {
        type: 'final',
      },
      AWAITING_BILL_OF_LADING: {
        on: {
          BILL_OF_LADING_RECEIVED: {
            target: 'VERIFYING_BILL_OF_LADING',
          },
        },
      },
      UNABLE_TO_SEND: {
        type: 'final',
      },
      VERIFYING_BILL_OF_LADING: {
        invoke: {
          src: 'verifyVC',
          id: 'invoke-vnf39',
          onDone: [
            {
              target: 'AWAITING_SECOND_INSPECTION_CERTIFICATE',
            },
          ],
          onError: [
            {
              target: 'UNABLE_TO_VERIFY_VC',
            },
          ],
        },
      },
      AWAITING_SECOND_INSPECTION_CERTIFICATE: {
        entry: {
          type: 'notify',
          params: {},
        },
        on: {
          SECOND_INSPECTION_CERTIFICATE_ADDED: {
            target: 'ISSUEING_SECOND_INSPECTION_CERTIFICATE_VC',
          },
        },
      },
      ISSUEING_SECOND_INSPECTION_CERTIFICATE_VC: {
        invoke: {
          src: 'issueVC',
          id: 'invoke-iok7h',
          onDone: [
            {
              target: 'SENDING_SECOND_INSPECTION_CERTIFICATE',
            },
          ],
          onError: [
            {
              target: 'UNABLE_TO_ISSUE_VC',
            },
          ],
        },
      },
      SENDING_SECOND_INSPECTION_CERTIFICATE: {
        invoke: {
          src: 'sendToProcessOwner',
          id: 'invoke-bgq5i',
          onDone: [
            {
              target: 'DONE',
            },
          ],
          onError: [
            {
              target: 'UNABLE_TO_SEND',
            },
          ],
        },
      },
      DONE: {
        type: 'final',
      },
    },
    predictableActionArguments: true,
    preserveActionOrder: true,
  },
  {
    actions: {notify: (context, event): any => {}},
    services: {
      issueVC: (context, event): any => {},
      sendToProcessOwner: (context, event): any => {},
      verifyVC: (context, event): any => {},
    },
    guards: {},
    delays: {},
  },
)

const inspectorActor: Interpreter<unknown, any, any, any, any> = interpret(inspectorMachine)

export default inspectorActor
