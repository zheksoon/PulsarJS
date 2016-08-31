var globalCallStack = []
var globalRevision = 0;

function resetGlobals() {
    globalRevision = 0;
}

function nextRevision() {
    return ++globalRevision | 0;
}

function ObservableBase(value) {
    this.value = value;
    this.revision = nextRevision();
    this.resultRevision = 0;
    this.observers = [];
    this.observerRevisions = [];
}

ObservableBase.prototype = {
    addObserver: function() {
        var globalCallStackLength = globalCallStack.length;
        if (globalCallStackLength > 0) {
            var observer = globalCallStack[globalCallStackLength - 1];
            var observers = this.observers;
            var observerRevisions = this.observerRevisions;
            var lastObserverIndex = observers.length - 1;
            if (lastObserverIndex >= 0 && observers[lastObserverIndex] === observer) {
                observerRevisions[lastObserverIndex] = observer.revision;
            } else {
                observers.push(observer);
                observerRevisions.push(observer.revision);
            }
        }
    },
    notifyAndCleanupObservers: function() {
        var observers = this.observers;
        var observerRevisions = this.observerRevisions;
        var observersLength = observers.length
        var i = 0, j = 0, observer, observerRevision;
        while (j < observersLength) {  
            observer = observers[j];
            observerRevision = observerRevisions[j];
            if (observer.resultRevision === observerRevision) {
                if (observer.resultRevision === observer.revision) {
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

function Observable(value) {
    ObservableBase.call(this, value);
}

Observable.prototype = Object.assign(Object.create(ObservableBase.prototype), {
    get: function() {
        this.addObserver();
        return this.value;
    },
    set: function(value) {
        this.value = value;
        this.revision = nextRevision();
        this.notifyAndCleanupObservers();
    }
});

function observable(value) {
    return new Observable(value);
}

function Computable(thunk) {
    ObservableBase.call(this);
    this.thunk = thunk;
}

Computable.prototype = Object.assign(Object.create(ObservableBase.prototype), {
    get: function() {
        this.addObserver();
        if (this.revision !== this.resultRevision) {
            globalCallStack.push(this);
            this.value = this.thunk();
            this.resultRevision = this.revision;
            globalCallStack.pop();
        }
        return this.value;
    },
    notifyRevisionUpdate: function(revision) {
        this.revision = revision;
        this.notifyAndCleanupObservers();  
    }
})

function computable(thunk) {
    return new Computable(thunk);
}

module.exports = {
    resetGlobals: resetGlobals,
    Observable: Observable,
    Computable: Computable,
    observable: observable,
    computable: computable,
}