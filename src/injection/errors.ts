export class CompositeError extends Error {

    public static formatMessage(message: string, errors?: Error[]): string {
        let buff: string = message;

        if (errors && errors.length > 0) {
            buff += `\n${errors.length} child errors:`;

            for (let i = 0; i < errors.length; i++) {
                buff += `\n\t[${i}] ${errors[i].message}`;

                const stack = errors[i].stack;

                if (stack) {
                    const lines = stack.split('\n');
                    if (lines.length < 1) {
                        return;
                    }

                    buff += `\n\t[${i}]${lines[1]}`;
                }
            }
        }

        return buff;
    }

    constructor(message: string, public errors?: Error[]) {
        super(CompositeError.formatMessage(message, errors));
        this.errors = errors;
    }
}

export class CompositionError extends CompositeError { }

export class DiscoveryError extends Error { }
