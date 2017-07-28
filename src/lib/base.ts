export default class Base {
    private _verbose:boolean;

    protected logger(...args) {
        if (this.verbose) {
            console.log.apply(this, args);
        }
    }

    get verbose(): boolean {
        return this._verbose;
    }

    set verbose(value: boolean) {
        this._verbose = value;
    }
}