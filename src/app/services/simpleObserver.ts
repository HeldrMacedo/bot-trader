type Listener<T> = (payload: T) => void;

export class Observer<EventTypes extends Record<string, any>> {
    private _id = 1;
    private events = new Map<keyof EventTypes, Map<number, Listener<any>>>();

    on<K extends keyof EventTypes>(event: K, callback: Listener<EventTypes[K]>): string {
        if (!this.events.has(event)) {
            this.events.set(event, new Map());
        }

        const id = this._id++;
        this.events.get(event)!.set(id, callback);
        return `${String(event)}-|/|-${id}`;
    }

    emit<K extends keyof EventTypes>(event: K, payload: EventTypes[K]): void {
        if (this.events.has(event)) {
            this.events.get(event)!.forEach(callback => {
                try {
                    callback(payload);
                } catch (e) {
                    console.error(`Error in ${String(event)} listener:`, e);
                }
            });
        }
    }

    removeById(fullId: string): void {
        const [event, id] = fullId.split('-|/|-');
        const numericId = parseInt(id, 10);
        const eventKey = event as keyof EventTypes;
        
        if (this.events.has(eventKey)) {
            this.events.get(eventKey)!.delete(numericId);
        }
    }

    clear(): void {
        this.events.clear();
    }
}