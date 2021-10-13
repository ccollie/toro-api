export class AlpenError extends Error {
    constructor(msg?: string) {
        super(msg);
        this.message = msg;
        this.name = 'AlpenError';
    }
}
