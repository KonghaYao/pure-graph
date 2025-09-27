export class EventMessage {
    event: string;
    data: unknown;
    id?: string;
    constructor(event: string, data?: unknown) {
        this.event = event;
        this.data = data;
    }
}

export class CancelEventMessage extends EventMessage {
    constructor() {
        super('__system_cancel__', 'user cancel this run');
    }
}

export class StreamEndEventMessage extends EventMessage {
    constructor() {
        super('__stream_end__');
    }
}

export class StreamErrorEventMessage extends EventMessage {
    public constructor(error: Error) {
        super('__stream_error__', {
            error: error.name,
            message: error.message,
        });
    }
}
