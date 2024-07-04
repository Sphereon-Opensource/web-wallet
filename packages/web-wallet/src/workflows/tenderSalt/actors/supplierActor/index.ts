import {createMachine, interpret, Interpreter, StateMachine} from 'xstate'

const supplierMachine: StateMachine<unknown, any, any> = createMachine(
  {
    id: 'supplierActor',
    initial: 'IDLE',
    states: {
      IDLE: {
        on: {
          TENDER_RECEIVED: {
            target: 'AWAITING_SUPPLIER_APPROVAL',
          },
        },
      },
      AWAITING_SUPPLIER_APPROVAL: {
        entry: {
          type: 'notify',
          params: {},
        },
        on: {
          SUPPLIER_APPROVED: {
            target: 'AWAITING_QUALITY_PLAN',
          },
        },
      },
      AWAITING_QUALITY_PLAN: {
        on: {
          QUALITY_PLAN_ADDED: {
            target: 'SENDING_QUALITY_PLAN',
          },
        },
      },
      SENDING_QUALITY_PLAN: {
        invoke: {
          src: 'sendToProcessOwner',
          id: 'invoke-p6wh7',
          onError: [
            {
              target: 'UNABLE_TO_SEND',
            },
          ],
          onDone: [
            {
              target: 'AWAITING_INSPECTION_CERTIFICATE_APPROVAL',
            },
          ],
        },
      },
      UNABLE_TO_SEND: {
        type: 'final',
      },
      AWAITING_INSPECTION_CERTIFICATE_APPROVAL: {
        on: {
          INSPECTION_CERTIFICATE_APPROVAL_RECEIVED: {
            target: 'VERIFYING_FIRST_INSPECTION_CERTIFICATE_APPROVAL',
          },
        },
      },
      VERIFYING_FIRST_INSPECTION_CERTIFICATE_APPROVAL: {
        invoke: {
          src: 'verifyVC',
          id: 'invoke-6pqao',
          onError: [
            {
              target: 'UNABLET_TO_VERIFY_VC',
            },
          ],
          onDone: [
            {
              target: 'AWATING_SHIPPING',
            },
          ],
        },
      },
      UNABLET_TO_VERIFY_VC: {},
      AWATING_SHIPPING: {
        on: {
          START_SHIPPING: {
            target: 'SHIPPING_PROCES',
          },
        },
      },
      SHIPPING_PROCES: {
        states: {
          SHIPPING: {
            initial: 'IN_PROGRESS',
            states: {
              IN_PROGRESS: {
                on: {
                  SHIPPING_ARRIVED: {
                    target: 'DONE',
                  },
                },
              },
              DONE: {
                type: 'final',
              },
            },
          },
          BILL_OF_LADING: {
            initial: 'AWAITING_BILL_OF_LADING',
            states: {
              AWAITING_BILL_OF_LADING: {
                entry: {
                  type: 'notify',
                  params: {},
                },
                on: {
                  BILL_OF_LADING_ADDED: {
                    target: 'ISSUEING_BILL_OF_LADING_VC',
                  },
                },
              },
              ISSUEING_BILL_OF_LADING_VC: {
                invoke: {
                  src: 'issueVC',
                  id: 'invoke-16nvd',
                  onDone: [
                    {
                      target: 'DONE',
                    },
                  ],
                  onError: [
                    {
                      target: '#supplierActor.UNABLE_TO_ISSUE_VC',
                    },
                  ],
                },
              },
              DONE: {
                type: 'final',
              },
            },
          },
        },
        type: 'parallel',
        onDone: {
          target: 'SENDING_BILL_OF_LADING',
        },
      },
      SENDING_BILL_OF_LADING: {
        invoke: {
          src: 'sendToInspector',
          id: 'invoke-yjjks',
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
      UNABLE_TO_ISSUE_VC: {
        type: 'final',
      },
    },
    predictableActionArguments: true,
    preserveActionOrder: true,
  },
  {
    actions: {notify: (context, event): any => {}},
    services: {
      sendToProcessOwner: (context, event): any => {},
      verifyVC: (context, event): any => {},
      sendToInspector: (context, event): any => {},
      issueVC: (context, event): any => {},
    },
    guards: {},
    delays: {},
  },
)

const supplierActor: Interpreter<unknown, any, any, any, any> = interpret(supplierMachine)

export default supplierActor
