import {createMachine, interpret, Interpreter, StateMachine} from 'xstate'

const processOwnerMachine: StateMachine<unknown, any, any> = createMachine(
  {
    id: 'processOwnerActor',
    initial: 'IDLE',
    states: {
      IDLE: {
        on: {
          TENDER_ADDED: {
            target: 'SENDING_TENDER',
          },
        },
      },
      SENDING_TENDER: {
        invoke: {
          src: 'sendToSupplier',
          id: 'invoke-oskqj',
          onError: [
            {
              target: 'UNABLE_TO_SEND',
            },
          ],
          onDone: [
            {
              target: 'AWAITING_QUALITY_PLAN',
            },
          ],
        },
      },
      UNABLE_TO_SEND: {
        type: 'final',
      },
      AWAITING_QUALITY_PLAN: {
        on: {
          QUALITY_PLAN_RECEIVED: {
            target: 'VERIFYING_QUALITY_PLAN',
          },
        },
      },
      VERIFYING_QUALITY_PLAN: {
        invoke: {
          src: 'verifyVC',
          id: 'invoke-g5fzt',
          onDone: [
            {
              target: 'AWAITING_QUALITY_PLAN_APPROVAL',
            },
          ],
          onError: [
            {
              target: 'UNABLE_TO_VERIFY_VC',
            },
          ],
        },
      },
      AWAITING_QUALITY_PLAN_APPROVAL: {
        entry: {
          type: 'notify',
          params: {},
        },
        on: {
          QUALITY_PLAN_APPROVED: {
            target: 'ISSUEING_QUALITY_PLAN_APPROVAL_VC',
          },
        },
      },
      UNABLE_TO_VERIFY_VC: {},
      ISSUEING_QUALITY_PLAN_APPROVAL_VC: {
        invoke: {
          src: 'issueVC',
          id: 'invoke-c1nh4',
          onDone: [
            {
              target: 'SENDING_QUALITY_PLAN_APPROVAL',
            },
          ],
          onError: [
            {
              target: 'UNABLE_TO_ISSUE_VC',
            },
          ],
        },
      },
      SENDING_QUALITY_PLAN_APPROVAL: {
        invoke: {
          src: 'sendToInspector',
          id: 'invoke-dipwu',
          onDone: [
            {
              target: 'AWAITING_FIRST_INSPECTION_CERTIFICATE',
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
      AWAITING_FIRST_INSPECTION_CERTIFICATE: {
        on: {
          FIRST_INSPECTION_CERTIFICATE_RECEIVED: {
            target: 'VERIFYING_FIRST_INSPECTION_CERTIFICATE',
          },
        },
      },
      VERIFYING_FIRST_INSPECTION_CERTIFICATE: {
        invoke: {
          src: 'verifyVC',
          id: 'invoke-3b44l',
          onDone: [
            {
              target: 'AWAITING_FIRST_INSPECTION_CERTIFICATE_APPROVAL',
            },
          ],
          onError: [
            {
              target: 'UNABLE_TO_VERIFY_VC',
            },
          ],
        },
      },
      AWAITING_FIRST_INSPECTION_CERTIFICATE_APPROVAL: {
        entry: {
          type: 'notify',
          params: {},
        },
        on: {
          FIRST_INSPECTION_CERTIFICATE_APPROVED: {
            target: 'ISSUEING_FIRST_INSPECTION_CERTIFICATE_APPROVAL_VC',
          },
        },
      },
      ISSUEING_FIRST_INSPECTION_CERTIFICATE_APPROVAL_VC: {
        invoke: {
          src: 'issueVC',
          id: 'invoke-9xui5',
          onDone: [
            {
              target: 'SENDING_FIRST_INSPECTION_CERTIFICATE_APPROVAL',
            },
          ],
          onError: [
            {
              target: 'UNABLE_TO_ISSUE_VC',
            },
          ],
        },
      },
      SENDING_FIRST_INSPECTION_CERTIFICATE_APPROVAL: {
        invoke: {
          src: 'sendToSupplier',
          id: 'invoke-g816w',
          onError: [
            {
              target: 'UNABLE_TO_SEND',
            },
          ],
          onDone: [
            {
              target: 'AWAITING_SECOND_INSPECTION_CERTIFICATE',
            },
          ],
        },
      },
      AWAITING_SECOND_INSPECTION_CERTIFICATE: {
        on: {
          SECOND_INSPECTION_CERTIFICATE_RECEIVED: {
            target: 'VERIFYING_SECOND_INSPECTION_CERTIFICATE',
          },
        },
      },
      VERIFYING_SECOND_INSPECTION_CERTIFICATE: {
        invoke: {
          src: 'verifyVC',
          id: 'invoke-f48bu',
          onDone: [
            {
              target: 'AWAITING_SECOND_INSPECTION_CERTIFICATE_APPROVAL',
            },
          ],
          onError: [
            {
              target: 'UNABLE_TO_VERIFY_VC',
            },
          ],
        },
      },
      AWAITING_SECOND_INSPECTION_CERTIFICATE_APPROVAL: {
        entry: {
          type: 'notify',
          params: {},
        },
        on: {
          SECOND_INSPECTION_CERTIFICATE_APPROVED: {
            target: 'ISSUEING_SECOND_INSPECTION_CERTIFICATE_APPROVAL_VC',
          },
        },
      },
      ISSUEING_SECOND_INSPECTION_CERTIFICATE_APPROVAL_VC: {
        invoke: {
          src: 'issueVC',
          id: 'invoke-ru7x5',
          onDone: [
            {
              target: 'DONE',
            },
          ],
          onError: [
            {
              target: 'UNABLE_TO_ISSUE_VC',
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
      sendToSupplier: (context, event): any => {},
      issueVC: (context, event): any => {},
      verifyVC: (context, event): any => {},
      sendToInspector: (context, event): any => {},
    },
    guards: {},
    delays: {},
  },
)

const processOwnerActor: Interpreter<unknown, any, any, any, any> = interpret(processOwnerMachine)

export default processOwnerActor
