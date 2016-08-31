var globalCallStack = []
var globalRevision = 0;

function resetGlobals() {
    globalRevision = 0;
}

function nextRevision() {
    return ++globalRevision;
}

function observable(value) {
    return {
        revision: nextRevision(),
        observers: [],
        observerRevisions: [],
        value: value,

        get: function() {
            var globalCallStackLength = globalCallStack.length;
            if (globalCallStackLength > 0) {
                // console.log('Computable.get: adding observable to list...')
                var observer = globalCallStack[globalCallStackLength - 1];
                var observers = this.observers;
                var observerRevisions = this.observerRevisions;
                var lastObserverIndex = observers.length - 1;
                if (observers[lastObserverIndex] === observer) {
                    observerRevisions[lastObserverIndex] = observer.argumentsRevision;
                } else {
                    observers.push(observer);
                    observerRevisions.push(observer.argumentsRevision);
                }
            }
            return this.value;
        },

        set: function(value) {
            // console.log('Observable: setting with value', value);
            this.value = value;
            this.revision = nextRevision();

            var observers = this.observers;
            var observerRevisions = this.observerRevisions;
            var observersLength = observers.length
            var i = 0, j = 0, observer, observerRevision;
            while (j < observersLength) {  
                observer = observers[j];
                observerRevision = observerRevisions[j];
                if (observer.revision === observerRevision) {
                    if (observer.revision === observer.argumentsRevision) {
                        observer.notifyRevisionUpdate(this.revision);
                    }
                    if (i < j) {
                        observers[i] = observer;
                        observerRevisions[i] = observerRevision;
                    }
                    i++;
                }
                j++;
            }
            if (i < j) {
                observers.length = i;
                observerRevisions.length = i;
            }
        }
    }
}

function computable(thunk) {
    return {
        revision: 0,
        argumentsRevision: nextRevision(),
        observers: [],
        observerRevisions: [],
        value: undefined,

        get: function() {
            var globalCallStackLength = globalCallStack.length;
            if (globalCallStackLength > 0) {
                // console.log('Computable.get: adding observable to list...')
                var observer = globalCallStack[globalCallStackLength - 1];
                var observers = this.observers;
                var observerRevisions = this.observerRevisions;
                var lastObserverIndex = observers.length - 1;
                if (observers[lastObserverIndex] === observer) {
                    observers[lastObserverIndex] = observer;
                    observerRevisions[lastObserverIndex] = observer.argumentsRevision;
                } else {
                    observers.push(observer);
                    observerRevisions.push(observer.argumentsRevision);
                }
            }
            // console.log('computable.get:', this);
            if (this.revision !== this.argumentsRevision) {
                // console.log('Computable.get: revision', this.revision, 'argument revision', this.argumentsRevision)
                globalCallStack.push(this);
                this.value = thunk();
                this.revision = this.argumentsRevision;
                globalCallStack.pop();
            }
            return this.value;
        },

        notifyRevisionUpdate: function(revision) {
            this.argumentsRevision = revision;
            // revision propagation here...       
        }
    }
}

module.exports = {
    resetGlobals: resetGlobals,
    observable: observable,
    computable: computable,
}